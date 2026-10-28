#!/usr/bin/env bash
set -e

echo "Setting up RepoPilot AI..."

# 1. Backend
echo "[1/3] Setting up Python virtual environment..."
if [ ! -d "backend/.venv" ]; then
    python3 -m venv backend/.venv
fi
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. Frontend
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install
cd ..

# 3. Ollama check
echo "[3/3] Checking Ollama..."
if command -v ollama &> /dev/null; then
    echo "Ollama is installed. Run 'ollama pull qwen2.5-coder:7b' to download the default model."
else
    echo "Ollama not found. Install from https://ollama.ai/"
fi

echo "Setup complete! Run './scripts/dev.sh' to start."
