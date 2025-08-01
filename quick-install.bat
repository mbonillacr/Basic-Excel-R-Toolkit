@echo off
echo ========================================
echo    BERT v3.0 - Instalacion Rapida
echo ========================================
echo.

REM Verificar R
where R >nul 2>nul
if %errorlevel% neq 0 (
    echo ADVERTENCIA: R no encontrado en PATH
    echo Descargue R desde: https://cran.r-project.org/bin/windows/base/
    echo.
)

REM Iniciar servicios BERT
echo Iniciando servicios BERT...
start /B node bert-server.js
timeout /t 2 >nul

echo.
echo ========================================
echo BERT v3.0 esta ejecutandose en:
echo   Console: http://localhost:3000
echo   HTML Tests: http://localhost:8080
echo ========================================
echo.
echo Para usar en Excel:
echo 1. Abra Excel
echo 2. Vaya a Insertar > Mis complementos
echo 3. Agregue manifiesto: %CD%\bert-manifest.xml
echo.
echo Presione cualquier tecla para abrir Excel...
pause >nul

start excel.exe