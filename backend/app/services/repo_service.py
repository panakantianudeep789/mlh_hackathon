import fnmatch
import io
import os
import shutil
import stat
import zipfile
from pathlib import Path

from app.core.config import settings
from app.models.schemas import FileNode


def _remove_readonly(func, path, exc_info):
    """Helper to remove read-only file lock on Windows during cleanup."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """
    Ensure target_path resolves strictly within base_dir to prevent directory traversal.
    Uses canonical Path.relative_to() resolution rather than weak string prefix checks.
    """
    try:
        resolved_base = base_dir.resolve()
        resolved_target = target_path.resolve()
        resolved_target.relative_to(resolved_base)
        return True
    except (ValueError, RuntimeError):
        return False


def is_ignored(rel_path: str, ignore_patterns: list[str] | None = None) -> bool:
    patterns = ignore_patterns or settings.DEFAULT_IGNORE_PATTERNS
    parts = Path(rel_path).parts
    for part in parts:
        for pat in patterns:
            if fnmatch.fnmatch(part, pat):
                return True
    for pat in patterns:
        if fnmatch.fnmatch(rel_path, pat):
            return True
    return False


def is_secret_file(rel_path: str) -> bool:
    name = Path(rel_path).name
    for pat in settings.SECRET_PATTERNS:
        if fnmatch.fnmatch(name, pat) or fnmatch.fnmatch(rel_path, pat):
            return True
    return False


def validate_archive_member_path(filename: str) -> None:
    """
    Validate that an archive member filename does not contain path traversal,
    absolute path specifiers, drive letters, or forbidden characters.
    Component-aware: Legitimate filenames with consecutive periods (e.g. foo..bar.py)
    are permitted, while traversal components ('..' or '../') are strictly rejected.
    """
    if not filename or not filename.strip():
        raise ValueError("Security error: Empty archive entry name detected")

    # Reject leading slashes or Windows backslashes
    if filename.startswith("/") or filename.startswith("\\"):
        raise ValueError(f"Security error: Absolute archive paths are forbidden ('{filename}')")

    # Reject Windows drive letters (e.g. C:...) or alternate data streams
    if ":" in filename:
        raise ValueError(f"Security error: Invalid archive path with drive or stream specifier ('{filename}')")

    # Normalize separators and perform component-aware traversal check
    normalized = filename.replace("\\", "/")
    parts = normalized.split("/")

    for part in parts:
        if part == "..":
            raise ValueError(f"Security error: Path traversal component '..' detected in '{filename}'")


def extract_zip_safely(zip_input: bytes | Path, dest_dir: Path) -> tuple[int, dict[str, int]]:
    """
    Safely extract a ZIP archive while protecting against Zip Slip, symlink attacks,
    zip bombs (excessive ratio, size, file count), duplicate entries, and malicious entry types.
    Supports bounded input (bytes or Path to streamed temp file).
    Performs atomic cleanup if extraction fails for any reason.
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    total_extracted_size = 0
    file_count = 0
    languages: dict[str, int] = {}
    seen_entries: set[str] = set()

    zip_source = zip_input if isinstance(zip_input, Path) else io.BytesIO(zip_input)

    try:
        with zipfile.ZipFile(zip_source, "r") as zip_ref:
            infolist = zip_ref.infolist()
            if not infolist:
                raise ValueError("Archive is empty: no files found in ZIP")

            for member in infolist:
                filename = member.filename

                # 1. Component-aware path traversal and format validation
                validate_archive_member_path(filename)

                # 2. Check for duplicate entries
                norm_entry = filename.replace("\\", "/").rstrip("/")
                if norm_entry in seen_entries:
                    raise ValueError(f"Security error: Duplicate archive entry detected ('{filename}')")
                seen_entries.add(norm_entry)

                # 3. Check for symbolic links, FIFOs, and special devices in external_attr
                mode = member.external_attr >> 16
                if mode > 0:
                    if stat.S_ISLNK(mode):
                        raise ValueError(f"Security error: Symbolic links are not allowed in ZIP archives ('{filename}')")
                    if stat.S_ISFIFO(mode) or stat.S_ISCHR(mode) or stat.S_ISBLK(mode):
                        raise ValueError(f"Security error: Special device or FIFO entries are not allowed ('{filename}')")

                # 4. Enforce per-file size limits
                if member.file_size > settings.MAX_FILE_SIZE_BYTES:
                    raise ValueError(
                        f"Security error: Archive entry '{filename}' ({member.file_size} bytes) exceeds per-file limit of {settings.MAX_FILE_SIZE_BYTES} bytes"
                    )

                # 5. Zip bomb defense: compression ratio limit
                if member.compress_size > 0:
                    ratio = member.file_size / member.compress_size
                    if ratio > settings.MAX_COMPRESSION_RATIO:
                        raise ValueError(
                            f"Security error: Archive entry '{filename}' has suspicious compression ratio ({ratio:.1f}:1). Potential zip bomb rejected."
                        )

                # 6. Total extracted size limit
                total_extracted_size += member.file_size
                if total_extracted_size > max_bytes:
                    raise ValueError(f"Security error: Extracted archive exceeds size limit of {settings.MAX_UPLOAD_MB}MB")

                # Skip ignored paths
                if is_ignored(filename):
                    continue

                # 7. Destination containment check
                target_path = dest_dir / filename
                if not is_safe_path(dest_dir, target_path):
                    raise ValueError(f"Security error: Target path '{filename}' escapes root")

                if member.is_dir():
                    target_path.mkdir(parents=True, exist_ok=True)
                else:
                    file_count += 1
                    if file_count > settings.MAX_FILES_COUNT:
                        raise ValueError(f"Security error: Archive exceeds maximum file count limit of {settings.MAX_FILES_COUNT}")

                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with zip_ref.open(member) as source, open(target_path, "wb") as target:
                        shutil.copyfileobj(source, target)

                    ext = target_path.suffix.lower() or "other"
                    languages[ext] = languages.get(ext, 0) + 1

        return file_count, languages

    except Exception:
        # Atomic cleanup on failure
        if dest_dir.exists():
            shutil.rmtree(dest_dir, onerror=_remove_readonly)
        raise


def scan_repository_directory(repo_dir: Path) -> tuple[int, dict[str, int]]:
    """Scan existing directory and compute file count and language breakdown."""
    file_count = 0
    languages: dict[str, int] = {}

    for root, dirs, files in os.walk(repo_dir):
        rel_root = os.path.relpath(root, repo_dir)
        if rel_root != "." and is_ignored(rel_root):
            dirs[:] = []
            continue

        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(rel_root, d) if rel_root != "." else d)]

        for file in files:
            rel_file = os.path.join(rel_root, file) if rel_root != "." else file
            if is_ignored(rel_file):
                continue
            file_count += 1
            ext = Path(file).suffix.lower() or "other"
            languages[ext] = languages.get(ext, 0) + 1

    return file_count, languages


def build_file_tree(repo_dir: Path) -> list[FileNode]:
    """Build a nested hierarchical file tree for the repository explorer."""
    nodes: list[FileNode] = []
    if not repo_dir.exists():
        return nodes

    def _traverse(current_dir: Path, rel_prefix: str = "") -> list[FileNode]:
        items: list[FileNode] = []
        try:
            entries = sorted(list(current_dir.iterdir()), key=lambda p: (not p.is_dir(), p.name.lower()))
            for entry in entries:
                rel_path = f"{rel_prefix}/{entry.name}" if rel_prefix else entry.name
                if is_ignored(rel_path):
                    continue

                if entry.is_dir():
                    children = _traverse(entry, rel_path)
                    items.append(FileNode(
                        name=entry.name,
                        path=rel_path,
                        type="directory",
                        size=0,
                        children=children
                    ))
                elif entry.is_file():
                    size = entry.stat().st_size
                    items.append(FileNode(
                        name=entry.name,
                        path=rel_path,
                        type="file",
                        size=size,
                        children=None
                    ))
        except Exception:
            pass
        return items

    return _traverse(repo_dir)


def read_repo_file(repo_dir: Path, rel_path: str) -> tuple[str, bool, int]:
    """
    Safely read a file from the repository.
    Returns: (content, is_secret, line_count)
    """
    target = repo_dir / rel_path
    if not is_safe_path(repo_dir, target):
        raise PermissionError(f"Access denied: path '{rel_path}' attempts directory traversal.")

    if not target.exists() or not target.is_file():
        raise FileNotFoundError(f"File '{rel_path}' not found in repository.")

    if is_secret_file(rel_path):
        return ("[RESTRICTED: Sensitive configuration file redacted by RepoPilot AI security policy]", True, 1)

    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
            lines = content.splitlines()
            return content, False, len(lines)
    except Exception as e:
        return (f"Error reading file: {e!s}", False, 0)


def create_or_get_working_copy(repo_dir: Path, repo_id: str) -> Path:
    """Create or return an isolated working copy for non-destructive testing and patching."""
    working_copy = settings.RUNS_DIR / f"{repo_id}_work"
    if not working_copy.exists():
        shutil.copytree(repo_dir, working_copy, ignore=shutil.ignore_patterns(*settings.DEFAULT_IGNORE_PATTERNS))
    return working_copy


def reset_working_copy(repo_dir: Path, repo_id: str) -> Path:
    """
    Reset the working copy to cleanly match the original repository snapshot.
    Removes any obsolete files created during previous patch or test runs.
    """
    working_copy = settings.RUNS_DIR / f"{repo_id}_work"
    if working_copy.exists():
        shutil.rmtree(working_copy, onerror=_remove_readonly)
    shutil.copytree(repo_dir, working_copy, ignore=shutil.ignore_patterns(*settings.DEFAULT_IGNORE_PATTERNS))
    return working_copy
