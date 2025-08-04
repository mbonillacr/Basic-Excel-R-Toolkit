@echo off
echo Probando R...
echo.

echo 1. Verificando si R está en PATH:
where R
echo.

echo 2. Verificando Rscript:
where Rscript
echo.

echo 3. Probando versión de R:
R --version
echo.

echo 4. Probando Rscript simple:
Rscript -e "cat('R funciona correctamente\n'); R.version.string"
echo.

echo 5. Probando librerías instaladas:
Rscript -e "installed.packages()[c('cluster', 'factoextra', 'jsonlite', 'tseries'), c('Package', 'Version')]"
echo.

pause