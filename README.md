# RepoPilot AI ⚡

> **"Understand Any Codebase. Fix Bugs With Evidence. Verify Every Change."**

RepoPilot AI is an open-source, AI-powered developer assistant that helps engineers, computer science students, and open-source maintainers explore unfamiliar repositories, investigate bugs with physical source citations, review minimal unified diff patches, and verify proposed fixes through actual test execution in isolated environments.

---

## The Core Philosophy

> **"AI suggestions are hypotheses until they are checked against real code and test results."**

Generic AI chatbots often hallucinate non-existent files or functions. RepoPilot AI anchors every diagnostic step in retrieved source code, line-accurate Python AST symbols, and real pytest subprocess test executions.

```
INGEST REPOSITORY
        │
        ▼
UNDERSTAND FILE STRUCTURE & AST
        │
        ▼
SEARCH RELEVANT SOURCE CODE
        │
        ▼
INVESTIGATE A BUG (BUG DETECTIVE)
        │
        ▼
EXPLAIN THE EVIDENCE & CITATIONS
        │
        ▼
PROPOSE A MINIMAL PATCH (UNIFIED DIFF)
        │
        ▼
GENERATE TARGET REGRESSION TESTS
        │
        ▼
EXECUTE TESTS IN AN ISOLATED SANDBOX
        │
        ▼
REPORT ACTUAL VERIFIED RESULTS
```

---

## Key Features

1. **Overview Dashboard**:
   - Live system health metrics: Active repositories count, Ollama model connection status, Docker sandbox availability, and recent activity logs.
2. **Repository Management**:
   - Safe ZIP archive ingestion with **Zip Slip rejection**, symlink blocking, file size thresholds, and exclusion of credential files (`.env`, `*.pem`, `id_rsa`).
   - One-click loading of the bundled **Buggy Python Project** demo repository.
3. **Code Explorer (3-Panel Workspace)**:
   - **Left Panel**: Hierarchical file tree with search and extension classification.
   - **Center Panel**: Source code viewer with syntax formatting, line numbers, and target line range highlights.
   - **Right Panel**: Extracted Python AST symbols (functions, classes, imports) with line ranges and docstrings.
4. **Evidence-Grounded AI Assistant**:
   - Repository-aware chat interface.
   - Interactive source evidence drawer citing exact file paths and line ranges.
   - Honest offline fallback when Ollama is not active.
5. **Bug Detective (Flagship Feature)**:
   - 6-step autonomous pipeline:
     1. *Deconstruct Issue*: Extract keywords, candidate functions, and error types.
     2. *Retrieve Evidence*: Search symbol definitions and call sites.
     3. *Analyze*: Send bounded context to open-weight LLM.
     4. *Validate Citations*: Confirm cited files and line ranges physically exist on disk.
     5. *Synthesize*: Formulate minimal patch and pytest regression test.
     6. *Ready*: Present evidence-backed report with severity estimate disclaimer.
6. **Patch Review Lab**:
   - Unified diff viewer highlighting additions (`+`) and deletions (`-`).
   - Side-by-side editable proposed code viewer.
   - **Non-Destructive Guarantee**: Changes apply strictly to an isolated working copy (`data/runs/<repo_id>_work/`), leaving your original codebase untouched.
   - One-click snapshot rollback mechanism.
7. **Test Lab (Verification Sandbox)**:
   - Pytest regression test editor and runner.
   - Real-time terminal output console capturing stdout, stderr, exit code, and execution duration.
   - Clear environment reporting: Docker container isolation when available; restricted timeout-limited subprocess when host execution is used.
8. **Agent Skills Inspector**:
   - Built to the official **Agent Skills specification** (`skills/repository-debugger/SKILL.md`).
   - Validates required YAML frontmatter (`name`, `description`), directory name consistency, and procedural instructions.
9. **Reproducible Evaluation Benchmark**:
   - 10 deliberate Python bug scenarios with known ground truth.
   - Live runner measuring retrieval success, symbol localization, regression reproduction, and latency.
   - Export results to downloadable **JSON** or **CSV**.
10. **Settings & Security Inspector**:
    - Ollama server URL with **SSRF protections** (restricted to localhost / 127.0.0.1).
    - Configurable open-weight model (`qwen2.5-coder:7b`).
    - Configurable test timeouts and maximum upload limits.

---

## Technology Stack

- **Frontend**:
  - React 19, TypeScript, Vite
  - Tailwind CSS v4 (Dark-first developer theme)
  - Lucide Icons
- **Backend**:
  - Python 3.11+ (tested on Python 3.14)
  - FastAPI, Pydantic v2, Uvicorn
  - Python standard library AST (`ast.parse`)
  - SQLite metadata storage (`repopilot.db`)
- **AI Inference Runtime**:
  - Ollama Chat API (`http://localhost:11434/api/chat`)
  - Configurable default model: `qwen2.5-coder:7b` (Apache-2.0 licensed weights)
- **Testing & Verification**:
  - Pytest test execution engine
  - Subprocess timeout isolation

---

## Quick Start & Installation

### Prerequisites
- Python 3.11 or later
- Node.js 18 or later and npm
- [Ollama](https://ollama.ai/) installed on your machine
- (Optional) Docker for containerized test isolation

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/repopilot-ai.git
cd repopilot-ai
```

---

### Step 2: Set Up Backend Environment

#### On Windows (PowerShell):
```powershell
.\scripts\setup.ps1
```

#### On Linux / macOS (Bash):
```bash
chmod +x scripts/*.sh
./scripts/setup.sh
```

#### Or Manual Setup:
```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate
pip install -r requirements.txt

# Linux / macOS
source .venv/bin/activate
pip install -r requirements.txt
```

---

### Step 3: Set Up Ollama and Model

Start the Ollama server:
```bash
ollama serve
```

Pull the recommended open-weight coding model:
```bash
ollama pull qwen2.5-coder:7b
```
> *Note: RepoPilot AI works seamlessly in offline mode using deterministic AST indexing and heuristic diagnosis if you choose not to download the 7B model weights.*

---

### Step 4: Run RepoPilot AI

#### Using Provided Development Scripts:
- **Windows**: `.\scripts\dev.ps1`
- **Linux / macOS**: `./scripts/dev.sh`

#### Or Start Services Individually:

**Terminal 1 (Backend):**
```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## Running Automated Tests

Run backend tests, code style checks, and frontend production builds:

#### On Windows:
```powershell
.\scripts\test.ps1
```

#### On Linux / macOS:
```bash
./scripts/test.sh
```

#### Manual Commands:
```bash
# Run 17 backend pytest tests
.\backend\.venv\Scripts\pytest.exe backend/tests/test_backend.py -v

# Run Python linter
.\backend\.venv\Scripts\ruff.exe check backend

# Run Frontend build and type check
cd frontend && npm run build
```

---

## Security Model & Threat Boundaries

RepoPilot AI is engineered to analyze untrusted third-party repositories safely:

1. **Zip Slip Protection**: Rejects archive entries with `..`, leading slashes, or paths escaping destination roots.
2. **Symlink Defense**: Symbolic links within uploaded archives are rejected to prevent reading host system files.
3. **Secret Masking**: Files matching `.env`, `*.pem`, `id_rsa`, `credentials.json`, or token patterns are excluded from AI prompts and API viewers.
4. **Anti-Prompt Injection**: Repository code is treated as untrusted data with strict system prompt boundaries.
5. **SSRF Mitigation**: Ollama connection endpoint is restricted to localhost / 127.0.0.1.
6. **No In-Place Mutation**: Patches apply exclusively to an isolated working copy (`data/runs/<repo_id>_work/`).

---

## Model Licensing & Attribution

RepoPilot AI defaults to **Qwen 2.5 Coder 7B** (`qwen2.5-coder:7b`), an open-weight code generation model created by Alibaba Cloud.
- **Model License**: Apache-2.0 License
- **Ollama Library**: [https://ollama.com/library/qwen2.5-coder](https://ollama.com/library/qwen2.5-coder)
- You may also configure other open-weight models (such as `llama3.1:8b` or `deepseek-coder:6.7b`) via the Settings page.

---

## License

RepoPilot AI is released under the **[Apache-2.0 License](LICENSE)**.
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [SECURITY.md](SECURITY.md) for the complete security policy.
