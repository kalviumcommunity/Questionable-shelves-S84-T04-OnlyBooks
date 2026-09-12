# OnlyBooks Unified Production Launcher for Windows PowerShell
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "       OnlyBooks - University Library Archive & Citation RAG" -ForegroundColor White
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERROR] Python virtualenv not found at $pythonExe" -ForegroundColor Red
    Write-Host "Please set up the backend environment first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/2] Starting Backend FastAPI on port 8000..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$backendDir`" && `"$pythonExe`" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -PassThru

Write-Host "[2/2] Starting Frontend Vite on port 5173..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontendDir`" && pnpm run dev" -PassThru

Write-Host ""
Write-Host "Waiting for backend health check..." -ForegroundColor Gray
$maxTries = 15
$healthy = $false
for ($i = 0; $i -lt $maxTries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok" -or $resp.app -eq "OnlyBooks") {
            $healthy = $true
            break
        }
    } catch {
        # Retry until available
    }
}

Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Cyan
if ($healthy) {
    Write-Host " [SUCCESS] All OnlyBooks services are online and operational!" -ForegroundColor Green
} else {
    Write-Host " [NOTICE] Services started; initializing catalog & indices..." -ForegroundColor Yellow
}
Write-Host "   * Frontend Web UI:        http://localhost:5173" -ForegroundColor White
Write-Host "   * Backend FastAPI Docs:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "   * Health Status Endpoint: http://127.0.0.1:8000/api/health" -ForegroundColor White
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "Both services are running in their respective background windows." -ForegroundColor Gray
