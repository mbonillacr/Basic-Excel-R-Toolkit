@echo off
echo Verificando instalación de R...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ R no encontrado en C:\Program Files\R\R-4.4.1\bin\
    echo.
    echo Verifique la instalación de R
    pause
    exit /b 1
)

echo ✅ R encontrado, iniciando BERT v3.0 completo...
echo.
node bert-v3-server-fixed.js
pause