@echo off
echo ========================================
echo  BERT v3.0 - Instalacion Local
echo ========================================

REM Crear carpeta compartida
if not exist "%USERPROFILE%\Documents\BERT" mkdir "%USERPROFILE%\Documents\BERT"

REM Copiar archivos HTML
copy "linear-regression-test.html" "%USERPROFILE%\Documents\BERT\"
copy "bert-calculator.html" "%USERPROFILE%\Documents\BERT\"
copy "test-function.html" "%USERPROFILE%\Documents\BERT\"

REM Iniciar servicios
start /B node bert-server.js
start /B node html-server.js

echo.
echo BERT v3.0 instalado localmente
echo.
echo OPCION 1 - Usar desde navegador:
echo   Abra: http://localhost:8080/linear-regression-test.html
echo.
echo OPCION 2 - Usar archivos locales:
echo   Abra: %USERPROFILE%\Documents\BERT\linear-regression-test.html
echo.
echo Los servicios estan ejecutandose en segundo plano
echo.
pause