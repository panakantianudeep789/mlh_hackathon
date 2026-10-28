import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import (
    benchmark,
    bugs,
    chat,
    health,
    patches,
    repositories,
    skills,
    tests,
)
from app.api.routers import (
    settings as settings_router,
)
from app.core.config import settings
from app.core.database import (
    get_repository_metadata,
    init_db,
    save_repository_metadata,
)
from app.services.repo_service import scan_repository_directory


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    init_db()

    # Pre-populate demo repository if not already present
    demo_source = settings.EXAMPLES_DIR / "buggy-python-project"
    demo_id = "DEMO-BUGGY-PROJECT"
    dest_dir = settings.REPOS_DIR / demo_id

    if demo_source.exists() and not get_repository_metadata(demo_id):
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copytree(demo_source, dest_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns(*settings.DEFAULT_IGNORE_PATTERNS))
        file_count, languages = scan_repository_directory(dest_dir)
        save_repository_metadata(demo_id, "Buggy Python Project (Demo)", str(dest_dir), file_count, languages, "ready")

    yield


app = FastAPI(
    title="RepoPilot AI API",
    description="Autonomous Repository Understanding, Debugging, and Verification Platform",
    version=settings.VERSION,
    lifespan=lifespan
)

# Strictly configured CORS origins (wildcards prohibited with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount all API routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(repositories.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(bugs.router, prefix="/api")
app.include_router(patches.router, prefix="/api")
app.include_router(tests.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(benchmark.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "product": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.TAGLINE,
        "docs_url": "/docs",
        "health_check": "/api/health"
    }
