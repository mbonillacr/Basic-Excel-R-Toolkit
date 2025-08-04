@echo off
echo ========================================
echo   BERT v3.0 - Configuración PATH de R
echo ========================================
echo.

echo [1/3] Verificando instalación de R...
if exist "C:\Program Files\R\R-4.4.1\bin\Rscript.exe" (
    echo ✅ R 4.4.1 encontrado en C:\Program Files\R\R-4.4.1
) else (
    echo ❌ R no encontrado en la ubicación esperada
    exit /b 1
)

echo [2/3] Configurando PATH del sistema...
set "R_PATH=C:\Program Files\R\R-4.4.1\bin"
setx PATH "%PATH%;%R_PATH%" /M

echo [3/3] Configurando PATH de la sesión actual...
set "PATH=%PATH%;%R_PATH%"

echo.
echo ✅ Configuración completada
echo.
echo Verificando instalación:
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" --version

echo.
echo ⚠️  IMPORTANTE: Reinicia la terminal para que el PATH tome efecto globalmente
pause