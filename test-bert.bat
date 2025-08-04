@echo off
echo 🧪 BERT v3.0 - Test Suite
echo.
echo Instalando dependencias...
npm install
echo.
echo Iniciando servidor para pruebas...
start /B node bert-server-full.js
echo.
echo Esperando servidor...
timeout /t 5 /nobreak >nul
echo.
echo Abriendo interfaces de prueba...
start http://localhost:3001/bert-series-tiempo.html
timeout /t 2 /nobreak >nul
start http://localhost:3001/linear-regression-test.html
echo.
echo ✅ Pruebas iniciadas
echo 📁 Archivo de prueba: test-excel-data.csv
echo.
echo Presiona cualquier tecla para cerrar servidor...
pause >nul
taskkill /f /im node.exe 2>nul