@echo off
echo =============================================
echo  Gestor de Diagramas - Frontend (Angular)
echo =============================================
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Instalando dependencias de Node...
    npm install
)

echo Iniciando Angular en http://localhost:4200 ...
echo Para detener presione Ctrl+C
echo.
npx ng serve --open
