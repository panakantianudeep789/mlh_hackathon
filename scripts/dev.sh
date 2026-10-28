#!/usr/bin/env bash
set -e

echo "Starting RepoPilot AI..."

# Start backend in background
cd backend
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

trap "kill $BACKEND_PID" EXIT

# Start frontend
cd frontend
npm run dev
