from typing import Any
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    ollama_connected: bool
    docker_available: bool
    allow_host_execution: bool = False
    active_repos: int


class ModelStatusResponse(BaseModel):
    running: bool
    base_url: str
    model: str
    is_exact_match: bool = False
    available_models: list[str] = []
    setup_instructions: str | None = None
    error: str | None = None


class TestConnectionRequest(BaseModel):
    base_url: str
    model: str | None = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    is_exact_match: bool = False
    available_models: list[str] = []


class RepositorySummary(BaseModel):
    id: str
    name: str
    path: str
    file_count: int
    languages: dict[str, int]
    status: str
    created_at: str


class FileNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    size: int | None = 0
    children: list["FileNode"] | None = None


class AstSymbol(BaseModel):
    name: str
    type: str  # "function", "class", "import"
    start_line: int
    end_line: int
    docstring: str | None = None
    args: list[str] | None = None


class FileContentResponse(BaseModel):
    path: str
    content: str
    lines_count: int
    extension: str
    source_hash: str = ""
    is_secret: bool = False
    is_parsed: bool = False
    symbols: list[AstSymbol] = []
    syntax_error: str | None = None


class SearchRequest(BaseModel):
    query: str
    search_type: str = "all"  # "all", "filename", "symbol", "content"
    limit: int = 25


class SearchResultItem(BaseModel):
    file_path: str
    line_number: int
    match_type: str  # "filename", "symbol", "content"
    preview_snippet: str
    symbol_name: str | None = None


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    message: str
    repository_id: str
    conversation_history: list[ChatMessage] = []
    selected_file: str | None = None
    selected_lines: list[int] | None = None


class SourceEvidence(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    snippet: str
    relevance_reason: str


class ChatResponse(BaseModel):
    answer: str
    evidence: list[SourceEvidence] = []
    confidence_assessment: str
    related_files: list[str] = []
    model_used: str | None = None
    limitations: str


class BugAnalyzeRequest(BaseModel):
    repository_id: str
    bug_description: str
    error_message: str | None = None
    stack_trace: str | None = None
    target_file: str | None = None
    selected_lines: list[int] | None = None


class Citation(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    snippet: str
    verified_exists: bool


class BugReportResponse(BaseModel):
    bug_id: str
    title: str
    severity: str  # "Informational", "Low", "Medium", "High", "Critical" (estimated)
    severity_disclaimer: str = "Severity is an automated heuristic estimate, not a verified security classification."
    explanation: str
    root_cause: str
    reproduction_conditions: str
    affected_file: str
    line_range: list[int]  # [start, end]
    citations: list[Citation]
    proposed_patch: str  # Unified diff or proposed code block
    regression_test: str
    verification_status: str = "not_analyzed"  # "not_analyzed", "evidence_collected", "ai_hypothesis_generated", "patch_proposed", "awaiting_review", "verification_passed", "verification_failed", "verification_blocked"
    model_used: str | None = None
    is_demo_preset: bool = False


class PatchValidateRequest(BaseModel):
    repository_id: str
    file_path: str
    proposed_code: str | None = None
    patch_diff: str | None = None
    expected_source_hash: str | None = None


class PatchValidateResponse(BaseModel):
    is_valid: bool
    file_path: str
    source_hash: str = ""
    stale_patch: bool = False
    errors: list[str] = []
    warnings: list[str] = []
    additions: int = 0
    deletions: int = 0
    unified_diff: str = ""


class PatchApplyRequest(BaseModel):
    repository_id: str
    file_path: str
    proposed_code: str
    expected_source_hash: str | None = None
    backup_first: bool = True


class PatchRevertRequest(BaseModel):
    repository_id: str


class TestRunRequest(BaseModel):
    repository_id: str
    test_code: str | None = None
    test_file_path: str | None = None
    timeout_seconds: int | None = 30
    use_working_copy: bool = True
    allow_host_execution: bool = False  # Explicit opt-in required if Docker is unavailable!


class TestRunResponse(BaseModel):
    execution_id: str
    repository_id: str
    status: str  # "passed", "failed", "timed_out", "error", "environment_unavailable", "infrastructure_error"
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    isolation_mode: str  # "docker_container", "restricted_host_opt_in", "unavailable"
    container_id: str | None = None
    warning: str | None = None
    setup_guidance: str | None = None


class SkillDetailResponse(BaseModel):
    name: str
    description: str
    directory_name: str
    file_path: str
    raw_content: str
    frontmatter: dict[str, Any]
    is_valid: bool
    validation_errors: list[str] = []


class SkillValidateRequest(BaseModel):
    skill_content: str | None = None
    directory_name: str | None = None


class SkillValidateResponse(BaseModel):
    is_valid: bool
    skill_name: str | None = None
    directory_matches_name: bool = False
    required_fields_present: bool = False
    errors: list[str] = []
    warnings: list[str] = []


class BenchmarkResultItem(BaseModel):
    case_id: str
    title: str
    relevant_file: str
    retrieval_success: bool
    location_success: bool
    diagnosis_correctness: bool
    regression_reproduced: bool
    patch_applied: bool
    patch_verified: bool
    existing_tests_passing: bool
    model_availability: str
    execution_environment: str
    duration_ms: float
    status: str  # "passed", "failed", "skipped", "environment_unavailable"
    details: str | None = None


class BenchmarkSummaryResponse(BaseModel):
    run_id: str
    total_cases: int
    completed: int
    passed: int
    failed: int
    skipped: int
    duration_ms: float
    results: list[BenchmarkResultItem]


class SettingsResponse(BaseModel):
    ollama_base_url: str
    ollama_model: str
    max_upload_mb: int
    test_timeout_seconds: int
    allow_host_execution: bool
    docker_image: str
    default_ignore_patterns: list[str]
    secret_patterns: list[str]
    docker_available: bool
