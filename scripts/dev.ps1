# RepoPilot AI - Development Launcher Script for Windows PowerShell
Write-Host "Starting RepoPilot AI Backend and Frontend..." -ForegroundColor Cyan

# Start Backend in background process or separate window
$backendJob = Start-Process -FilePath ".\backend\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory "backend" -PassThru

# Start Frontend
Set-Location frontend
Write-Host "Frontend running on http://localhost:5173" -ForegroundColor Green
Write-Host "Backend running on http://127.0.0.1:8000" -ForegroundColor Green
npm.cmd run dev

# Stop backend when frontend terminates
if ($backendJob) {
    Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
}
