import os
from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    # Product Metadata
    PROJECT_NAME: str = "RepoPilot AI"
    VERSION: str = "1.0.0"
    TAGLINE: str = "Understand Any Codebase. Fix Bugs With Evidence. Verify Every Change."

    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    REPOS_DIR: Path = DATA_DIR / "repos"
    RUNS_DIR: Path = DATA_DIR / "runs"
    SKILLS_DIR: Path = BASE_DIR / "skills"
    BENCHMARK_DIR: Path = BASE_DIR / "benchmark"
    EXAMPLES_DIR: Path = BASE_DIR / "examples"

    # Ollama Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

    # Storage & Limits
    DATABASE_PATH: Path = DATA_DIR / "repopilot.db"
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    MAX_FILES_COUNT: int = 5000
    MAX_COMPRESSION_RATIO: float = 100.0  # Max uncompressed to compressed ratio (zip bomb defense)
    TEST_TIMEOUT_SECONDS: int = int(os.getenv("TEST_TIMEOUT_SECONDS", "30"))

    # Test Execution Security
    DOCKER_IMAGE: str = os.getenv("REPOPILOT_DOCKER_IMAGE", "python:3.11-slim")
    # By default, host execution is strictly disabled. Untrusted code requires Docker container isolation.
    ALLOW_HOST_EXECUTION: bool = os.getenv("ALLOW_HOST_EXECUTION", "false").lower() in ("true", "1")

    # CORS Allowed Origins
    CORS_ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Security: Default Ignore Patterns
    DEFAULT_IGNORE_PATTERNS: list[str] = [
        ".git",
        "node_modules",
        "__pycache__",
        ".venv",
        "venv",
        ".env",
        ".tox",
        "dist",
        "build",
        ".pytest_cache",
        ".mypy_cache",
        ".coverage",
        ".DS_Store",
    ]

    # Security: Secret & Credential Patterns to NEVER expose to AI or API
    SECRET_PATTERNS: list[str] = [
        ".env",
        "*.pem",
        "*.key",
        "id_rsa",
        "id_ed25519",
        "*.p12",
        "*.pfx",
        "credentials.json",
        "service_account.json",
        "*token*",
        "*secret*",
    ]

    # Supported safe Ollama base hosts to mitigate SSRF
    ALLOWED_OLLAMA_HOSTS: set[str] = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "host.docker.internal",
    }


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.REPOS_DIR.mkdir(parents=True, exist_ok=True)
settings.RUNS_DIR.mkdir(parents=True, exist_ok=True)
