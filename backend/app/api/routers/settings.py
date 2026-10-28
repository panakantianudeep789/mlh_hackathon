from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.models.schemas import SettingsResponse
from app.services.ollama_service import validate_ollama_url
from app.services.test_runner_service import is_docker_available

router = APIRouter(prefix="/settings", tags=["Settings"])


class UpdateSettingsRequest(BaseModel):
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    test_timeout_seconds: int | None = None
    max_upload_mb: int | None = None
    allow_host_execution: bool | None = None
    docker_image: str | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings():
    return SettingsResponse(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        max_upload_mb=settings.MAX_UPLOAD_MB,
        test_timeout_seconds=settings.TEST_TIMEOUT_SECONDS,
        allow_host_execution=settings.ALLOW_HOST_EXECUTION,
        docker_image=settings.DOCKER_IMAGE,
        default_ignore_patterns=settings.DEFAULT_IGNORE_PATTERNS,
        secret_patterns=settings.SECRET_PATTERNS,
        docker_available=is_docker_available()
    )


@router.post("/update")
async def update_settings(req: UpdateSettingsRequest):
    if req.ollama_base_url is not None:
        if not validate_ollama_url(req.ollama_base_url):
            raise HTTPException(
                status_code=400,
                detail="Security policy violation: Ollama server URL must point to localhost or 127.0.0.1."
            )
        settings.OLLAMA_BASE_URL = req.ollama_base_url.rstrip("/")

    if req.ollama_model is not None and req.ollama_model.strip():
        settings.OLLAMA_MODEL = req.ollama_model.strip()

    if req.test_timeout_seconds is not None:
        if req.test_timeout_seconds < 5 or req.test_timeout_seconds > 180:
            raise HTTPException(status_code=400, detail="Test timeout must be between 5 and 180 seconds.")
        settings.TEST_TIMEOUT_SECONDS = req.test_timeout_seconds

    if req.max_upload_mb is not None:
        if req.max_upload_mb < 1 or req.max_upload_mb > 500:
            raise HTTPException(status_code=400, detail="Max upload size must be between 1MB and 500MB.")
        settings.MAX_UPLOAD_MB = req.max_upload_mb

    if req.allow_host_execution is not None:
        settings.ALLOW_HOST_EXECUTION = req.allow_host_execution

    if req.docker_image is not None and req.docker_image.strip():
        settings.DOCKER_IMAGE = req.docker_image.strip()

    return {
        "status": "updated",
        "settings": {
            "ollama_base_url": settings.OLLAMA_BASE_URL,
            "ollama_model": settings.OLLAMA_MODEL,
            "test_timeout_seconds": settings.TEST_TIMEOUT_SECONDS,
            "max_upload_mb": settings.MAX_UPLOAD_MB,
            "allow_host_execution": settings.ALLOW_HOST_EXECUTION,
            "docker_image": settings.DOCKER_IMAGE,
        }
    }
