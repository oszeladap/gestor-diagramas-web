@echo off
echo Iniciando Gestor de Diagramas...
start "Backend FastAPI" cmd /k "%~dp0start_backend.bat"
timeout /t 3 /nobreak >nul
start "Frontend Angular" cmd /k "%~dp0start_frontend.bat"
echo.
echo Servicios iniciados:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:4200
echo   API Docs: http://localhost:8000/docs
