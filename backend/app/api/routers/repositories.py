import os
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.core.config import settings
from app.core.database import (
    delete_repository_metadata,
    get_repository_metadata,
    list_repositories_metadata,
    save_repository_metadata,
)
from app.models.schemas import (
    FileContentResponse,
    FileNode,
    RepositorySummary,
    SearchRequest,
    SearchResponse,
)
from app.services.ast_service import extract_text_symbols, parse_python_ast
from app.services.repo_service import (
    build_file_tree,
    extract_zip_safely,
    is_safe_path,
    read_repo_file,
    scan_repository_directory,
)
from app.services.search_service import search_repository

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.get("", response_model=list[RepositorySummary])
async def list_repositories():
    rows = list_repositories_metadata()
    return [
        RepositorySummary(
            id=r["id"],
            name=r["name"],
            path=r["path"],
            file_count=r["file_count"],
            languages=r["languages"],
            status=r["status"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.post("/upload", response_model=RepositorySummary)
async def upload_repository_zip(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid file: Only .zip archives are supported.")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    total_bytes = 0

    try:
        # Bounded streaming to disk (never load unbounded bytes into RAM)
        while chunk := await file.read(65536):
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                temp_zip.close()
                os.unlink(temp_zip.name)
                raise HTTPException(status_code=400, detail=f"Archive exceeds maximum upload size of {settings.MAX_UPLOAD_MB}MB.")
            temp_zip.write(chunk)
        temp_zip.flush()
        temp_zip.close()

        repo_id = f"REPO-{uuid.uuid4().hex[:8].upper()}"
        clean_name = Path(file.filename).stem or "uploaded_repo"
        dest_dir = settings.REPOS_DIR / repo_id

        try:
            file_count, languages = extract_zip_safely(Path(temp_zip.name), dest_dir)
            save_repository_metadata(repo_id, clean_name, str(dest_dir), file_count, languages, "indexed")
            return RepositorySummary(
                id=repo_id,
                name=clean_name,
                path=str(dest_dir),
                file_count=file_count,
                languages=languages,
                status="indexed",
                created_at="",
            )
        except ValueError as ve:
            if dest_dir.exists():
                shutil.rmtree(dest_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            if dest_dir.exists():
                shutil.rmtree(dest_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"Failed to process archive: {e!s}")
    finally:
        if os.path.exists(temp_zip.name):
            try:
                os.unlink(temp_zip.name)
            except OSError:
                pass


@router.post("/load-demo", response_model=RepositorySummary)
async def load_demo_repository():
    demo_source = settings.EXAMPLES_DIR / "buggy-python-project"
    if not demo_source.exists():
        raise HTTPException(status_code=404, detail="Demo repository source directory not found.")

    repo_id = "DEMO-BUGGY-PROJECT"
    dest_dir = settings.REPOS_DIR / repo_id

    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copytree(demo_source, dest_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns(*settings.DEFAULT_IGNORE_PATTERNS))
    file_count, languages = scan_repository_directory(dest_dir)

    save_repository_metadata(repo_id, "Buggy Python Project (Demo)", str(dest_dir), file_count, languages, "ready")

    return RepositorySummary(
        id=repo_id,
        name="Buggy Python Project (Demo)",
        path=str(dest_dir),
        file_count=file_count,
        languages=languages,
        status="ready",
        created_at="",
    )


@router.get("/{repository_id}", response_model=RepositorySummary)
async def get_repository(repository_id: str):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    return RepositorySummary(
        id=repo["id"],
        name=repo["name"],
        path=repo["path"],
        file_count=repo["file_count"],
        languages=repo["languages"],
        status=repo["status"],
        created_at=repo["created_at"],
    )


@router.get("/{repository_id}/files", response_model=list[FileNode])
async def get_repository_files(repository_id: str):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])
    return build_file_tree(repo_dir)


@router.get("/{repository_id}/file", response_model=FileContentResponse)
async def get_repository_file_content(repository_id: str, path: str = Query(..., description="Relative file path")):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    repo_dir = Path(repo["path"])
    clean_path = path.replace("\\", "/").strip("/")

    try:
        content, is_secret, line_count = read_repo_file(repo_dir, clean_path)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    ext = Path(clean_path).suffix.lower() or "other"
    symbols = []
    is_parsed = False
    syntax_error = None

    if not is_secret:
        if ext == ".py":
            is_parsed, symbols, syntax_error = parse_python_ast(content)
        else:
            is_parsed, symbols, syntax_error = extract_text_symbols(content, Path(clean_path).name)

    return FileContentResponse(
        path=clean_path,
        content=content,
        lines_count=line_count,
        extension=ext,
        is_secret=is_secret,
        is_parsed=is_parsed,
        symbols=symbols,
        syntax_error=syntax_error
    )


@router.post("/{repository_id}/search", response_model=SearchResponse)
async def search_in_repository(repository_id: str, req: SearchRequest):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])
    return search_repository(repo_dir, req.query, req.search_type, req.limit)


@router.post("/{repository_id}/index", response_model=RepositorySummary)
async def reindex_repository(repository_id: str):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])
    file_count, languages = scan_repository_directory(repo_dir)
    save_repository_metadata(repo["id"], repo["name"], str(repo_dir), file_count, languages, "indexed")
    return RepositorySummary(
        id=repo["id"],
        name=repo["name"],
        path=str(repo_dir),
        file_count=file_count,
        languages=languages,
        status="indexed",
        created_at=repo["created_at"],
    )


@router.delete("/{repository_id}")
async def delete_repository(repository_id: str):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])
    if repo_dir.exists() and is_safe_path(settings.REPOS_DIR, repo_dir):
        shutil.rmtree(repo_dir)

    # Clean working copy if exists
    working_copy = settings.RUNS_DIR / f"{repository_id}_work"
    if working_copy.exists():
        shutil.rmtree(working_copy)

    delete_repository_metadata(repository_id)
    return {"status": "success", "message": f"Repository '{repository_id}' deleted."}
