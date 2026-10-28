from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.database import get_recent_analysis_sessions, get_repository_metadata, record_analysis_session
from app.models.schemas import BugAnalyzeRequest, BugReportResponse
from app.services.bug_service import analyze_repository_bug

router = APIRouter(prefix="/bugs", tags=["Bug Detective"])


@router.post("/analyze", response_model=BugReportResponse)
async def analyze_bug(req: BugAnalyzeRequest):
    repo = get_repository_metadata(req.repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    report = await analyze_repository_bug(repo_dir, req)

    # Record analysis session
    record_analysis_session(
        session_id=report.bug_id,
        repo_id=req.repository_id,
        bug_title=report.title,
        findings=report.model_dump()
    )

    return report


@router.get("/recent")
async def list_recent_bugs():
    return get_recent_analysis_sessions(limit=10)
