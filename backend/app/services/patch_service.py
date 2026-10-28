import ast
import difflib
import hashlib
import shutil
from pathlib import Path

from app.models.schemas import PatchValidateResponse
from app.services.repo_service import (
    create_or_get_working_copy,
    is_safe_path,
    is_secret_file,
    read_repo_file,
    reset_working_copy,
)


def compute_content_hash(content: str) -> str:
    """Compute deterministic SHA-256 hash of source code for stale patch detection."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def validate_patch(
    repo_dir: Path,
    file_path_str: str,
    proposed_code: str,
    expected_source_hash: str | None = None
) -> PatchValidateResponse:
    """
    Strictly validate a proposed patch before any change can be applied:
    - Path traversal rejection using canonical resolution
    - Secret file modification rejection
    - File existence check
    - SHA-256 content-hash calculation and stale patch detection
    - Python syntax validation for .py files
    - Unified diff generation with additions and deletions
    """
    clean_path = file_path_str.replace("\\", "/").strip("/")
    target = repo_dir / clean_path
    errors: list[str] = []
    warnings: list[str] = []

    # 1. Path safety
    if ".." in clean_path.split("/") or clean_path.startswith("/"):
        return PatchValidateResponse(
            is_valid=False,
            file_path=clean_path,
            source_hash="",
            stale_patch=False,
            errors=["Security violation: Path traversal detected in patch file path."],
            warnings=[],
            additions=0,
            deletions=0,
            unified_diff=""
        )

    if not is_safe_path(repo_dir, target):
        return PatchValidateResponse(
            is_valid=False,
            file_path=clean_path,
            source_hash="",
            stale_patch=False,
            errors=["Security violation: Target file path escapes repository root."],
            warnings=[],
            additions=0,
            deletions=0,
            unified_diff=""
        )

    # 2. Secret file rejection
    if is_secret_file(clean_path):
        return PatchValidateResponse(
            is_valid=False,
            file_path=clean_path,
            source_hash="",
            stale_patch=False,
            errors=["Security violation: Modifications to credential/secret files are prohibited."],
            warnings=[],
            additions=0,
            deletions=0,
            unified_diff=""
        )

    # 3. File existence
    if not target.exists() or not target.is_file():
        return PatchValidateResponse(
            is_valid=False,
            file_path=clean_path,
            source_hash="",
            stale_patch=False,
            errors=[f"Target file '{clean_path}' does not exist in repository."],
            warnings=[],
            additions=0,
            deletions=0,
            unified_diff=""
        )

    # 4. Read original code and compute SHA-256 content hash
    original_code, is_sec, _ = read_repo_file(repo_dir, clean_path)
    if is_sec:
        return PatchValidateResponse(
            is_valid=False,
            file_path=clean_path,
            source_hash="",
            stale_patch=False,
            errors=["Security violation: Target file is restricted."],
            warnings=[],
            additions=0,
            deletions=0,
            unified_diff=""
        )

    current_source_hash = compute_content_hash(original_code)
    stale_patch = False

    if expected_source_hash and expected_source_hash != current_source_hash:
        stale_patch = True
        errors.append(
            f"Stale patch detected: The file has changed since this patch was generated. "
            f"Expected source hash {expected_source_hash[:8]}..., but repository contains {current_source_hash[:8]}..."
        )

    # 5. Python syntax validation if applicable
    if clean_path.endswith(".py"):
        try:
            ast.parse(proposed_code)
        except SyntaxError as se:
            errors.append(f"Python syntax error in proposed code at line {se.lineno}: {se.msg}")

    # 6. Generate unified diff
    orig_lines = original_code.splitlines(keepends=True)
    prop_lines = proposed_code.splitlines(keepends=True)

    diff = list(difflib.unified_diff(
        orig_lines,
        prop_lines,
        fromfile=f"a/{clean_path}",
        tofile=f"b/{clean_path}",
        n=3
    ))
    diff_text = "".join(diff)

    additions = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
    deletions = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))

    if not diff_text:
        warnings.append("Proposed code is identical to original code; no modifications detected.")

    return PatchValidateResponse(
        is_valid=len(errors) == 0,
        file_path=clean_path,
        source_hash=current_source_hash,
        stale_patch=stale_patch,
        errors=errors,
        warnings=warnings,
        additions=additions,
        deletions=deletions,
        unified_diff=diff_text
    )


def apply_patch_to_working_copy(
    repo_dir: Path,
    repo_id: str,
    file_path_str: str,
    proposed_code: str,
    expected_source_hash: str | None = None,
    backup_first: bool = True
) -> tuple[bool, str]:
    """
    Safely apply a reviewed patch to the isolated working copy (never mutates original repository).
    Enforces path safety, secret file protection, and stale patch detection.
    """
    clean_path = file_path_str.replace("\\", "/").strip("/")
    if ".." in clean_path.split("/") or clean_path.startswith("/"):
        return False, "Security violation: Invalid target path."

    if is_secret_file(clean_path):
        return False, "Security violation: Cannot modify sensitive files."

    # Validate against original repository content hash
    original_target = repo_dir / clean_path
    if not is_safe_path(repo_dir, original_target) or not original_target.exists():
        return False, f"Target file '{clean_path}' not found in original repository."

    with open(original_target, "r", encoding="utf-8", errors="replace") as f:
        orig_content = f.read()

    orig_hash = compute_content_hash(orig_content)
    if expected_source_hash and expected_source_hash != orig_hash:
        return False, (
            f"Stale patch rejected: Source file has been modified since review "
            f"(expected {expected_source_hash[:8]}..., found {orig_hash[:8]}...). "
            f"Please re-review the patch."
        )

    # Apply to isolated working copy
    working_copy = create_or_get_working_copy(repo_dir, repo_id)
    target = working_copy / clean_path

    if not is_safe_path(working_copy, target):
        return False, "Security violation: Target path escapes working copy."

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        # Create backup if target already exists
        if backup_first and target.exists():
            backup_path = target.with_suffix(target.suffix + ".bak")
            shutil.copy2(target, backup_path)

        with open(target, "w", encoding="utf-8") as f:
            f.write(proposed_code)
        return True, f"Patch successfully applied to isolated working copy at {clean_path}."
    except Exception as e:
        return False, f"Failed to apply patch: {e!s}"


def rollback_single_patch(repo_dir: Path, repo_id: str, file_path_str: str) -> tuple[bool, str]:
    """Rollback a single file patch in the working copy using its backup or pristine original."""
    clean_path = file_path_str.replace("\\", "/").strip("/")
    working_copy = create_or_get_working_copy(repo_dir, repo_id)
    target = working_copy / clean_path
    backup_path = target.with_suffix(target.suffix + ".bak")

    if backup_path.exists():
        try:
            shutil.copy2(backup_path, target)
            backup_path.unlink()
            return True, f"Single patch rolled back from backup for {clean_path}."
        except Exception as e:
            return False, f"Failed to restore backup: {e!s}"

    # Fallback: restore from pristine original repository
    orig_target = repo_dir / clean_path
    if orig_target.exists():
        try:
            shutil.copy2(orig_target, target)
            return True, f"Single patch rolled back to pristine repository version for {clean_path}."
        except Exception as e:
            return False, f"Failed to restore pristine version: {e!s}"

    return False, f"No backup or pristine copy found to rollback {clean_path}."


def revert_working_copy_to_snapshot(repo_dir: Path, repo_id: str) -> tuple[bool, str]:
    """Revert the isolated working copy back to match the original pristine repository."""
    try:
        reset_working_copy(repo_dir, repo_id)
        return True, "Isolated working copy reverted to original repository snapshot."
    except Exception as e:
        return False, f"Failed to revert working copy: {e!s}"
