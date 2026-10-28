from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.database import get_latest_benchmark_run, get_repository_metadata
from app.models.schemas import BenchmarkSummaryResponse
from app.services.benchmark_service import export_benchmark_csv, run_evaluation_benchmark

router = APIRouter(prefix="/benchmark", tags=["Evaluation Benchmark"])


@router.post("/run", response_model=BenchmarkSummaryResponse)
async def run_benchmark(
    repository_id: str = Query(..., description="Target repository ID"),
    allow_host_execution: bool = Query(False, description="Explicit opt-in for host execution if Docker is unavailable")
):
    repo = get_repository_metadata(repository_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    repo_dir = Path(repo["path"])

    return await run_evaluation_benchmark(repo_dir, repository_id, allow_host_execution=allow_host_execution)


@router.get("/results")
async def get_benchmark_results():
    run = get_latest_benchmark_run()
    if not run:
        return {"status": "none", "message": "No benchmark runs have been executed yet."}
    return run


@router.get("/results/export")
async def export_benchmark_results(format: str = Query("json", pattern="^(json|csv)$")):
    run = get_latest_benchmark_run()
    if not run:
        raise HTTPException(status_code=404, detail="No benchmark results found to export.")

    if format == "csv":
        csv_data = export_benchmark_csv(run.get("results", []))
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=repopilot_benchmark_results.csv"}
        )

    return run
