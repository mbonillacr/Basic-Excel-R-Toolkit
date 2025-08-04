@echo off
echo ========================================
echo    BERT v3.0 - Instalación de R
echo ========================================
echo.

echo [1/5] Verificando si R ya está instalado...
where Rscript >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ R ya está instalado
    Rscript --version
    goto :install_packages
)

echo [2/5] Descargando R 4.4.2...
powershell -Command "try { Invoke-WebRequest -Uri 'https://cloud.r-project.org/bin/windows/base/R-4.4.2-win.exe' -OutFile 'R-installer.exe' -UseBasicParsing } catch { Write-Host 'Error descargando R'; exit 1 }"

if not exist "R-installer.exe" (
    echo ❌ Error descargando R
    echo Descarga manualmente desde: https://cloud.r-project.org/bin/windows/base/
    pause
    exit /b 1
)

echo [3/5] Instalando R...
R-installer.exe /SILENT /DIR="C:\Program Files\R\R-4.4.2"

echo [4/5] Configurando PATH...
set "R_PATH=C:\Program Files\R\R-4.4.2\bin"
setx PATH "%PATH%;%R_PATH%" /M

echo Agregando R al PATH de la sesión actual...
set "PATH=%PATH%;%R_PATH%"

:install_packages
echo [5/5] Instalando paquetes R necesarios...
echo Esto puede tomar varios minutos...

Rscript -e "install.packages(c('tseries', 'jsonlite'), repos='https://cloud.r-project.org', dependencies=TRUE, quiet=FALSE)"

if %errorlevel% == 0 (
    echo.
    echo ✅ Instalación completada exitosamente
    echo.
    echo Para verificar la instalación:
    echo   Rscript --version
    echo.
    echo Paquetes instalados:
    echo   - tseries (análisis de series temporales)
    echo   - jsonlite (conversión JSON)
    echo.
) else (
    echo.
    echo ❌ Error instalando paquetes R
    echo Intenta instalarlos manualmente:
    echo   Rscript -e "install.packages(c('tseries', 'jsonlite'))"
    echo.
)

if exist "R-installer.exe" del "R-installer.exe"

echo ⚠️  IMPORTANTE: Reinicia la terminal para que el PATH tome efecto
echo.
pause