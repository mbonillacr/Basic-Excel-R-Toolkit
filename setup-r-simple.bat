@echo off
echo ========================================
echo    BERT v3.0 - Configuración R Simple
echo ========================================
echo.
echo Para usar BERT con R necesitas:
echo.
echo 1. Descargar R desde: https://cran.r-project.org/bin/windows/base/
echo 2. Instalar R en la ubicación por defecto
echo 3. Agregar R al PATH del sistema
echo.
echo Pasos detallados:
echo.
echo [PASO 1] Descargar R:
echo - Ve a: https://cran.r-project.org/bin/windows/base/
echo - Descarga "Download R-4.3.2 for Windows"
echo.
echo [PASO 2] Instalar R:
echo - Ejecuta el instalador descargado
echo - Acepta la ubicación por defecto: C:\Program Files\R\R-4.3.2
echo.
echo [PASO 3] Configurar PATH:
echo - Abre "Variables de entorno del sistema"
echo - Edita la variable PATH
echo - Agrega: C:\Program Files\R\R-4.3.2\bin
echo.
echo [PASO 4] Instalar paquetes (después de reiniciar terminal):
echo - Ejecuta: install-r-packages.bat
echo.
echo ¿Quieres abrir la página de descarga de R? (S/N)
set /p choice=
if /i "%choice%"=="S" start https://cran.r-project.org/bin/windows/base/
echo.
pause