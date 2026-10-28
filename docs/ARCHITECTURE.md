# RepoPilot AI: Architectural Design

RepoPilot AI is structured around a modular, decoupled architecture consisting of a Python FastAPI backend and a React/TypeScript Vite frontend.

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (TypeScript, Vite, Tailwind CSS, Lucide Icons)       │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Backend Server                │
│                                                        │
│  ┌───────────────────┐        ┌─────────────────────┐  │
│  │   Repo Ingestion  │        │   Search & Index    │  │
│  │  (Zip Slip Safe)  │        │  (Keyword/Line No)  │  │
│  └─────────┬─────────┘        └──────────┬──────────┘  │
│            │                             │             │
│  ┌─────────▼─────────┐        ┌──────────▼──────────┐  │
│  │   Python AST      │        │  Bug Detective      │  │
│  │  (Symbols/Ranges) │        │  (6-Step Pipeline)  │  │
│  └─────────┬─────────┘        └──────────┬──────────┘  │
│            │                             │             │
│  ┌─────────▼─────────┐        ┌──────────▼──────────┐  │
│  │  Local Ollama     │        │  Sandbox Test Lab   │  │
│  │  (qwen2.5-coder)  │        │  (Pytest / Timeout) │  │
│  └───────────────────┘        └─────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      SQLite Database             Isolated Working Copy
     (repopilot.db)              (data/runs/{id}_work)
```

## Backend Services Layer

1. **`repo_service.py`**:
   - Manages archive ingestion with path validation (`is_safe_path`).
   - Builds hierarchical directory trees.
   - Manages isolated working copies (`data/runs/<repo_id>_work/`) to preserve original code snapshots.

2. **`ast_service.py`**:
   - Parses Python files using standard library `ast`.
   - Extracts top-level and class-level functions, classes, and imports.
   - Preserves exact 1-indexed `start_line` and `end_line` ranges and docstrings.
   - Recovers gracefully from syntax errors.

3. **`search_service.py`**:
   - Performs line-number-aware searching by filename, symbol, and line content.
   - Generates contextual snippets surrounding matches.

4. **`ollama_service.py`**:
   - Communicates with Ollama chat API (`http://localhost:11434/api/chat`).
   - Validates URLs against SSRF.
   - Checks model presence via `/api/tags`.
   - Constructs bounded prompts with untrusted data boundaries.
   - Provides honest offline fallback modes.

5. **`bug_service.py`**:
   - Executes the 6-step Bug Detective pipeline.
   - Grounds hypotheses in retrieved source snippets.
   - Validates citations against actual physical files on disk before returning findings.

6. **`patch_service.py`**:
   - Generates unified diffs using `difflib`.
   - Validates patches against directory traversal and protected files.
   - Applies modifications strictly to the isolated working copy with rollback snapshot support.

7. **`test_runner_service.py`**:
   - Executes `pytest` as an isolated subprocess.
   - Enforces execution timeouts (default 30 seconds).
   - Captures stdout, stderr, exit code, and execution duration in milliseconds.
   - Classifies outcomes (`passed`, `failed`, `timed_out`, `environment_unavailable`).

8. **`skill_service.py`**:
   - Validates official Agent Skills YAML frontmatter and directory conventions.

9. **`benchmark_service.py`**:
   - Executes the 10-case empirical evaluation benchmark against the active repository.
   - Exports results as JSON or CSV.
