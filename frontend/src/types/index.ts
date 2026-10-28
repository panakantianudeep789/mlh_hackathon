export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  ollama_connected: boolean;
  docker_available: boolean;
  active_repos: number;
}

export interface ModelStatusResponse {
  running: boolean;
  base_url: string;
  model: string;
  available_models: string[];
  setup_instructions?: string;
  error?: string;
}

export interface RepositorySummary {
  id: string;
  name: string;
  path: string;
  file_count: number;
  languages: Record<string, number>;
  status: string;
  created_at: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileNode[];
}

export interface AstSymbol {
  name: string;
  type: "function" | "class" | "import";
  start_line: number;
  end_line: number;
  docstring?: string;
  args?: string[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  lines_count: number;
  extension: string;
  is_secret: boolean;
  is_parsed: boolean;
  symbols: AstSymbol[];
  syntax_error?: string;
}

export interface SearchResultItem {
  file_path: string;
  line_number: number;
  match_type: "filename" | "symbol" | "content";
  preview_snippet: string;
  symbol_name?: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface SourceEvidence {
  file_path: string;
  start_line: number;
  end_line: number;
  snippet: string;
  relevance_reason: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  evidence?: SourceEvidence[];
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  evidence: SourceEvidence[];
  confidence_assessment: string;
  related_files: string[];
  limitations: string;
}

export interface Citation {
  file_path: string;
  start_line: number;
  end_line: number;
  snippet: string;
  verified_exists: boolean;
}

export interface BugReportResponse {
  bug_id: string;
  title: string;
  severity: string;
  severity_disclaimer: string;
  explanation: string;
  root_cause: string;
  reproduction_conditions: string;
  affected_file: string;
  line_range: number[];
  citations: Citation[];
  proposed_patch: string;
  regression_test: string;
  verification_status: string;
  model_used?: string;
  is_demo_preset?: boolean;
}

export interface PatchValidateResponse {
  is_valid: boolean;
  file_path: string;
  source_hash: string;
  stale_patch: boolean;
  errors: string[];
  warnings: string[];
  additions: number;
  deletions: number;
  unified_diff: string;
}

export interface TestRunResponse {
  execution_id: string;
  repository_id: string;
  status: "passed" | "failed" | "timed_out" | "error" | "environment_unavailable" | "infrastructure_error";
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  isolation_mode: string;
  container_id?: string;
  warning?: string;
  setup_guidance?: string;
}

export interface SkillDetailResponse {
  name: string;
  description: string;
  directory_name: string;
  file_path: string;
  raw_content: string;
  frontmatter: Record<string, any>;
  is_valid: boolean;
  validation_errors: string[];
}

export interface SkillValidateResponse {
  is_valid: boolean;
  skill_name?: string;
  directory_matches_name: boolean;
  required_fields_present: boolean;
  errors: string[];
  warnings: string[];
}

export interface BenchmarkResultItem {
  case_id: string;
  title: string;
  relevant_file: string;
  retrieval_success: boolean;
  location_success: boolean;
  diagnosis_correctness: boolean;
  regression_reproduced: boolean;
  patch_applied: boolean;
  patch_verified: boolean;
  existing_tests_passing: boolean;
  model_availability: string;
  execution_environment: string;
  duration_ms: number;
  status: "passed" | "failed" | "skipped" | "environment_unavailable";
  details?: string;
}

export interface BenchmarkSummaryResponse {
  run_id: string;
  total_cases: number;
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: BenchmarkResultItem[];
}

export interface SettingsResponse {
  ollama_base_url: string;
  ollama_model: string;
  max_upload_mb: number;
  test_timeout_seconds: number;
  allow_host_execution: boolean;
  docker_image: string;
  default_ignore_patterns: string[];
  secret_patterns: string[];
  docker_available: boolean;
}

export type PageId =
  | "overview"
  | "repositories"
  | "explorer"
  | "chat"
  | "bugs"
  | "patches"
  | "tests"
  | "skills"
  | "benchmark"
  | "settings";
