@echo off
setlocal
cd /d "%~dp0"

echo Starting Sequence Workbench frontend...
start "Sequence Workbench Frontend" cmd /k "cd /d frontend\workbench && npm install && npm run dev"

echo.
echo Optional backend:
echo   cd backend\bioapi
echo   python -m venv .venv
echo   .\.venv\Scripts\Activate.ps1
echo   pip install -r requirements.txt
echo   uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo Open the Vite URL shown in the frontend terminal.
endlocal
