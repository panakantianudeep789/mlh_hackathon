from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.database import get_db_connection, get_recent_test_executions, get_repository_metadata
from app.models.schemas import TestRunRequest, TestRunResponse
from app.services.test_runner_service import run_pytest_in_sandbox

router = APIRouter(prefix="/tests", tags=["Test Lab"])


@router.post("/run", response_model=TestRunResponse)
async def run_tests(req: TestRunRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    return run_pytest_in_sandbox(
        repo_dir=repo_dir,
        repo_id=req.repository_id,
        test_code=req.test_code,
        test_file_path=req.test_file_path,
        timeout_seconds=req.timeout_seconds,
        use_working_copy=req.use_working_copy,
        allow_host_execution=req.allow_host_execution
    )


@router.get("/recent")
async def list_recent_executions():
    return get_recent_test_executions(limit=10)


@router.get("/{execution_id}")
async def get_test_execution(execution_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM test_executions WHERE id = ?", (execution_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Test execution record not found.")

    return {
        "id": row["id"],
        "repository_id": row["repository_id"],
        "test_type": row["test_type"],
        "exit_code": row["exit_code"],
        "status": row["status"],
        "duration_ms": row["duration_ms"],
        "stdout": row["stdout"],
        "stderr": row["stderr"],
        "created_at": row["created_at"],
    }
