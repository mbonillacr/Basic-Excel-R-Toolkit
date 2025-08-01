@echo off
echo ========================================
echo    BERT v3.0 - Version Web
echo ========================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no encontrado
    echo Descargue desde: https://nodejs.org
    pause
    exit /b 1
)

REM Verificar R
where R >nul 2>nul
if %errorlevel% neq 0 (
    echo ADVERTENCIA: R no encontrado
    echo Descargue desde: https://cran.r-project.org/bin/windows/base/
)

REM Instalar dependencias
echo Instalando dependencias...
call npm install

REM Iniciar servicios
echo Iniciando BERT v3.0...
start /B node bert-server.js
start /B node html-server.js

timeout /t 3 >nul

echo.
echo ========================================
echo BERT v3.0 Web Version ejecutandose:
echo   Console Principal: http://localhost:3000
echo   Herramientas HTML: http://localhost:8080
echo ========================================
echo.
echo Para usar con Excel:
echo 1. Abra Excel
echo 2. Use las funciones web en: http://localhost:8080
echo 3. Copie/pegue resultados a Excel
echo.
echo Presione CTRL+C para detener los servicios
echo Presione cualquier tecla para abrir el navegador...
pause >nul

start http://localhost:8080