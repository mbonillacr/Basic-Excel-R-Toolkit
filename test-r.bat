@echo off
echo ========================================
echo    QA Test - Verificación de R
echo ========================================
echo.

echo [1/4] Verificando R...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" --version
if %errorlevel% neq 0 (
    echo ❌ Error ejecutando R
    exit /b 1
)

echo.
echo [2/4] Verificando paquetes necesarios...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" -e "if(require('tseries', quietly=TRUE)) cat('✅ tseries: OK\n') else cat('❌ tseries: MISSING\n'); if(require('jsonlite', quietly=TRUE)) cat('✅ jsonlite: OK\n') else cat('❌ jsonlite: MISSING\n')"

echo.
echo [3/4] Instalando paquetes faltantes...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" -e "packages <- c('tseries', 'jsonlite'); for(pkg in packages) { if(!require(pkg, quietly=TRUE, character.only=TRUE)) { cat('Instalando:', pkg, '\n'); install.packages(pkg, repos='https://cloud.r-project.org', dependencies=TRUE, quiet=TRUE) } }"

echo.
echo [4/4] Prueba final de análisis...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" -e "library(tseries); library(jsonlite); data <- c(1,2,3,4,5,6,7,8,9,10); ts_obj <- ts(data); result <- list(mean=mean(ts_obj), length=length(ts_obj)); cat('RESULT_START\n'); cat(toJSON(result)); cat('\nRESULT_END\n')"

echo.
echo ✅ Pruebas de R completadas
pause