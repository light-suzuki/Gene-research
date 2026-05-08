@echo off
setlocal
cd /d "%~dp0"

echo Starting Sequence Workbench frontend...
start "Sequence Workbench Frontend" cmd /k "cd /d frontend\workbench && set VITE_BIOAPI_BASE_URL=http://127.0.0.1:8000 && npm install && npm run dev"

echo.
echo Backend on WSL (recommended on Windows):
echo   wsl bash ./start_backend_wsl.sh
echo.
echo Backend on Windows Python (alternative):
echo   cd backend\bioapi
echo   python -m venv .venv
echo   .\.venv\Scripts\Activate.ps1
echo   pip install -r requirements.txt
echo   uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo Open the Vite URL shown in the frontend terminal.
endlocal
