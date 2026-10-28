import {
  HealthResponse,
  ModelStatusResponse,
  RepositorySummary,
  FileNode,
  FileContentResponse,
  SearchResponse,
  ChatResponse,
  BugReportResponse,
  PatchValidateResponse,
  TestRunResponse,
  SkillDetailResponse,
  SkillValidateResponse,
  BenchmarkSummaryResponse,
  SettingsResponse,
} from "../types";

const API_BASE = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  getHealth: () => request<HealthResponse>("/health"),
  getModelStatus: () => request<ModelStatusResponse>("/model/status"),
  testModelConnection: (base_url: string, model?: string) =>
    request<{ success: boolean; message: string; available_models: string[] }>("/model/test-connection", {
      method: "POST",
      body: JSON.stringify({ base_url, model }),
    }),

  getRepositories: () => request<RepositorySummary[]>("/repositories"),
  loadDemoRepository: () =>
    request<RepositorySummary>("/repositories/load-demo", { method: "POST" }),
  uploadRepositoryZip: async (file: File): Promise<RepositorySummary> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/repositories/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },
  deleteRepository: (id: string) =>
    request<{ status: string; message: string }>(`/repositories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getRepositoryFiles: (repoId: string) =>
    request<FileNode[]>(`/repositories/${encodeURIComponent(repoId)}/files`),
  getFileContent: (repoId: string, path: string) =>
    request<FileContentResponse>(
      `/repositories/${encodeURIComponent(repoId)}/file?path=${encodeURIComponent(path)}`
    ),
  searchRepository: (repoId: string, query: string, search_type: string = "all", limit: number = 25) =>
    request<SearchResponse>(`/repositories/${encodeURIComponent(repoId)}/search`, {
      method: "POST",
      body: JSON.stringify({ query, search_type, limit }),
    }),

  sendChat: (data: {
    message: string;
    repository_id: string;
    conversation_history?: Array<{ role: string; content: string }>;
    selected_file?: string;
    selected_lines?: number[];
  }) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  analyzeBug: (data: {
    repository_id: string;
    bug_description: string;
    error_message?: string;
    stack_trace?: string;
    target_file?: string;
    selected_lines?: number[];
  }) =>
    request<BugReportResponse>("/bugs/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRecentBugs: () => request<any[]>("/bugs/recent"),

  validatePatch: (data: {
    repository_id: string;
    file_path: string;
    proposed_code: string;
    expected_source_hash?: string;
  }) =>
    request<PatchValidateResponse>("/patches/validate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  applyPatch: (data: {
    repository_id: string;
    file_path: string;
    proposed_code: string;
    expected_source_hash?: string;
    backup_first?: boolean;
  }) =>
    request<{ status: string; message: string; source_hash?: string }>("/patches/apply", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  rollbackSinglePatch: (repository_id: string, file_path: string) =>
    request<{ status: string; message: string; file_path: string }>("/patches/rollback-single", {
      method: "POST",
      body: JSON.stringify({ repository_id, file_path }),
    }),
  revertPatch: (repository_id: string) =>
    request<{ status: string; message: string }>("/patches/revert", {
      method: "POST",
      body: JSON.stringify({ repository_id }),
    }),

  runTests: (data: {
    repository_id: string;
    test_code?: string;
    test_file_path?: string;
    timeout_seconds?: number;
    use_working_copy?: boolean;
    allow_host_execution?: boolean;
  }) =>
    request<TestRunResponse>("/tests/run", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRecentTestRuns: () => request<any[]>("/tests/recent"),

  getSkills: () => request<SkillDetailResponse[]>("/skills"),
  validateSkill: (data: { skill_content?: string; directory_name?: string }) =>
    request<SkillValidateResponse>("/skills/validate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  runBenchmark: (repository_id: string, allow_host_execution: boolean = false) =>
    request<BenchmarkSummaryResponse>(
      `/benchmark/run?repository_id=${encodeURIComponent(repository_id)}&allow_host_execution=${allow_host_execution}`,
      {
        method: "POST",
      }
    ),
  getBenchmarkResults: () => request<any>("/benchmark/results"),
  getBenchmarkExportUrl: (format: "json" | "csv") =>
    `${API_BASE}/benchmark/results/export?format=${format}`,

  getSettings: () => request<SettingsResponse>("/settings"),
  updateSettings: (data: {
    ollama_base_url?: string;
    ollama_model?: string;
    test_timeout_seconds?: number;
    max_upload_mb?: number;
    allow_host_execution?: boolean;
    docker_image?: string;
  }) =>
    request<{ status: string; settings: any }>("/settings/update", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
