#!/usr/bin/env bash
set -e

echo "Running RepoPilot AI Automated Test Suites..."

# 1. Backend tests
echo "[1/3] Running Backend Pytest Tests..."
backend/.venv/bin/pytest backend/tests/test_backend.py -v

# 2. Backend linting
echo "[2/3] Running Backend Ruff Linter..."
backend/.venv/bin/ruff check backend

# 3. Frontend production build
echo "[3/3] Running Frontend Production Build & Type Check..."
cd frontend
npm run build
cd ..

echo "All tests passed successfully!"
