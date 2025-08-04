@echo off
echo Probando servidor BERT v3.0...
echo.
echo 1. Iniciando servidor en puerto 3001
start /B node r-functions-server.js
echo.
echo 2. Esperando 3 segundos...
timeout /t 3 /nobreak >nul
echo.
echo 3. Abriendo navegador...
start http://localhost:3001/bert-test.html
echo.
echo Presiona cualquier tecla para cerrar el servidor...
pause >nul
taskkill /f /im node.exe 2>nul