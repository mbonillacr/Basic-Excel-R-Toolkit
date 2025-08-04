@echo off
echo ========================================
echo    BERT v3.0 - Instalación de R
echo ========================================
echo.
echo [1/4] Descargando R...
powershell -Command "Invoke-WebRequest -Uri 'https://cran.r-project.org/bin/windows/base/R-4.3.2-win.exe' -OutFile 'R-installer.exe'"

echo.
echo [2/4] Instalando R...
R-installer.exe /SILENT /DIR="C:\Program Files\R\R-4.3.2"

echo.
echo [3/4] Configurando PATH...
setx PATH "%PATH%;C:\Program Files\R\R-4.3.2\bin" /M

echo.
echo [4/4] Instalando paquetes R necesarios...
"C:\Program Files\R\R-4.3.2\bin\Rscript.exe" -e "install.packages(c('cluster', 'factoextra', 'jsonlite', 'tseries'), repos='https://cran.r-project.org', dependencies=TRUE)"

echo.
echo ✅ Instalación completada
echo ⚠️  Reinicia la terminal para que el PATH tome efecto
echo.
del R-installer.exe
pause