# RepoPilot AI - Full Test Runner Script for Windows PowerShell
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Running RepoPilot AI Automated Test Suites" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Backend Pytest Tests
Write-Host "`n[1/3] Running Backend Pytest Tests..." -ForegroundColor Yellow
.\backend\.venv\Scripts\pytest.exe backend/tests/test_backend.py -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests failed!" -ForegroundColor Red
    exit 1
}

# 2. Backend Linting
Write-Host "`n[2/3] Running Backend Ruff Linter..." -ForegroundColor Yellow
.\backend\.venv\Scripts\ruff.exe check backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend linting failed!" -ForegroundColor Red
    exit 1
}

# 3. Frontend Type Check & Production Build
Write-Host "`n[3/3] Running Frontend Production Build & Type Check..." -ForegroundColor Yellow
Set-Location frontend
npm.cmd run build
Set-Location ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "All RepoPilot AI test suites passed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
