from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import settings
from app.core.database import list_repositories_metadata
from app.models.schemas import HealthResponse, ModelStatusResponse, TestConnectionRequest, TestConnectionResponse
from app.services.ollama_service import check_ollama_status
from app.services.test_runner_service import is_docker_available

router = APIRouter(tags=["Health & Model"])


@router.get("/health", response_model=HealthResponse)
async def get_health():
    repos = list_repositories_metadata()
    ollama_info = await check_ollama_status()
    docker_ok = is_docker_available()

    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        timestamp=datetime.now(UTC).isoformat(),
        ollama_connected=ollama_info.running and not bool(ollama_info.error),
        docker_available=docker_ok,
        allow_host_execution=settings.ALLOW_HOST_EXECUTION,
        active_repos=len(repos)
    )


@router.get("/model/status", response_model=ModelStatusResponse)
async def get_model_status():
    return await check_ollama_status()


@router.post("/model/test-connection", response_model=TestConnectionResponse)
async def test_model_connection(req: TestConnectionRequest):
    status = await check_ollama_status(base_url=req.base_url, target_model=req.model)
    if status.running and not status.error:
        return TestConnectionResponse(
            success=True,
            message=f"Successfully connected to Ollama at {req.base_url}. Model '{status.model}' is available.",
            available_models=status.available_models
        )
    elif status.running and status.error:
        return TestConnectionResponse(
            success=False,
            message=f"Connected to Ollama, but model '{status.model}' is missing. {status.setup_instructions}",
            available_models=status.available_models
        )
    else:
        return TestConnectionResponse(
            success=False,
            message=status.setup_instructions or status.error or "Failed to connect to Ollama server.",
            available_models=[]
        )
