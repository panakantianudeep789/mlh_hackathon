# Contributing to RepoPilot AI

Thank you for your interest in contributing to RepoPilot AI! We welcome bug reports, feature requests, documentation improvements, benchmark test cases, and pull requests.

## Development Setup

1. **Prerequisites**:
   - Python 3.11+
   - Node.js 18+ and npm
   - (Optional) Ollama with `qwen2.5-coder:7b`
   - (Optional) Docker for containerized test isolation

2. **Backend Setup**:
   ```bash
   cd backend
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   pytest -v
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Running Locally**:
   - Backend: `uvicorn app.main:app --reload --port 8000`
   - Frontend: `npm run dev` (proxies `/api` requests to port 8000)

## Code Standards

- **Python**: Run `ruff check backend` before committing.
- **Frontend**: Ensure `npm run build` succeeds without type errors.
- **Testing**: Add unit tests in `backend/tests/` for new services or API endpoints.
- **Security**: Never submit credentials, API keys, or disable path traversal protections.
