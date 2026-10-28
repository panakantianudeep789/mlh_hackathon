from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.database import get_repository_metadata
from app.models.schemas import (
    PatchApplyRequest,
    PatchRevertRequest,
    PatchValidateRequest,
    PatchValidateResponse,
)
from app.services.patch_service import (
    apply_patch_to_working_copy,
    revert_working_copy_to_snapshot,
    rollback_single_patch,
    validate_patch,
)

router = APIRouter(prefix="/patches", tags=["Patch Review"])


class SinglePatchRollbackRequest(BaseModel):
    repository_id: str
    file_path: str


@router.post("/validate", response_model=PatchValidateResponse)
async def validate_proposed_patch(req: PatchValidateRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    if req.proposed_code is None:
        raise HTTPException(status_code=400, detail="proposed_code is required for validation.")

    return validate_patch(
        repo_dir=repo_dir,
        file_path_str=req.file_path,
        proposed_code=req.proposed_code,
        expected_source_hash=req.expected_source_hash
    )


@router.post("/apply")
async def apply_patch(req: PatchApplyRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    # Strict validation check before applying
    validation = validate_patch(
        repo_dir=repo_dir,
        file_path_str=req.file_path,
        proposed_code=req.proposed_code,
        expected_source_hash=req.expected_source_hash
    )
    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Patch validation failed: {'; '.join(validation.errors)}"
        )

    success, msg = apply_patch_to_working_copy(
        repo_dir=repo_dir,
        repo_id=req.repository_id,
        file_path_str=req.file_path,
        proposed_code=req.proposed_code,
        expected_source_hash=req.expected_source_hash,
        backup_first=req.backup_first
    )

    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return {
        "status": "applied",
        "message": msg,
        "file_path": req.file_path,
        "source_hash": validation.source_hash,
        "target": "isolated_working_copy"
    }


@router.post("/rollback-single")
async def rollback_file(req: SinglePatchRollbackRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    success, msg = rollback_single_patch(repo_dir, req.repository_id, req.file_path)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return {"status": "rolled_back", "message": msg, "file_path": req.file_path}


@router.post("/revert")
async def revert_patch(req: PatchRevertRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    success, msg = revert_working_copy_to_snapshot(repo_dir, req.repository_id)
    if not success:
        raise HTTPException(status_code=500, detail=msg)

    return {"status": "reverted", "message": msg}
