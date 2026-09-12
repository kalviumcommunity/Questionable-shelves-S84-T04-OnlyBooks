@echo off
title OnlyBooks - University Library Archive & RAG Research Platform
cls

echo =======================================================================
echo          OnlyBooks - University Library Archive & Citation RAG
echo =======================================================================
echo.
echo Starting OnlyBooks microservices:
echo   [1/2] Backend API:  http://127.0.0.1:8000 (FastAPI, SQLite, Hybrid RAG)
echo   [2/2] Frontend Web: http://localhost:5173 (React 19, TypeScript, Vite)
echo.

:: Check python environment
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\venv.
    echo Please create it using: cd backend ^&^& python -m venv venv ^&^& .\venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: Launch backend in a separate terminal window
echo Launching Backend Server on port 8000...
start "OnlyBooks Backend [FastAPI :8000]" cmd /k "cd /d ""%~dp0backend"" && venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Launch frontend in a separate terminal window
echo Launching Frontend Web Server on port 5173...
start "OnlyBooks Frontend [Vite :5173]" cmd /k "cd /d ""%~dp0frontend"" && pnpm run dev"

echo.
echo =======================================================================
echo Servers launched successfully!
echo   * Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo   * Web Application Portal:   http://localhost:5173
echo.
echo Press any key to exit this launcher (services will keep running in their own windows).
echo =======================================================================
pause >nul
