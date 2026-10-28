# RepoPilot AI - Windows PowerShell Setup Script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setting up RepoPilot AI..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Setup Python backend
Write-Host "`n[1/3] Setting up Python virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "backend/.venv")) {
    py -m venv backend/.venv
}
.\backend\.venv\Scripts\pip.exe install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r backend/requirements.txt

# 2. Setup Frontend
Write-Host "`n[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm.cmd install
Set-Location ..

# 3. Verify Ollama
Write-Host "`n[3/3] Checking Ollama status..." -ForegroundColor Yellow
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "Ollama detected! Run 'ollama pull qwen2.5-coder:7b' to pull the default model." -ForegroundColor Green
} else {
    Write-Host "Ollama not found on PATH. Download Ollama from https://ollama.ai/" -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Setup complete! Run '.\scripts\dev.ps1' to launch RepoPilot AI." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
