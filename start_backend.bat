@echo off
echo =============================================
echo  Gestor de Diagramas - Backend (FastAPI)
echo =============================================
cd /d "%~dp0backend"

if not exist "venv" (
    echo Creando entorno virtual Python...
    python -m venv venv
)

echo Activando entorno virtual...
call venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt --quiet

if not exist "plantuml.jar" (
    echo.
    echo AVISO: plantuml.jar NO encontrado.
    echo Para usar PlantUML, descargue plantuml.jar desde:
    echo   https://plantuml.com/download
    echo y coloquelo en: %~dp0backend\plantuml.jar
    echo.
    echo Los diagramas Mermaid funcionaran sin plantuml.jar
    echo.
)

echo Iniciando servidor en http://localhost:8000 ...
echo Para detener presione Ctrl+C
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
