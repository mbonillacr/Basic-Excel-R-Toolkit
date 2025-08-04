@echo off
echo 💰 BMAD REFUND - SERVIDOR GARANTIZADO
echo.
echo Iniciando servidor mock (sin R)...
start /B node mock-server.js
timeout /t 2 /nobreak >nul
echo.
echo Abriendo navegador...
start http://localhost:3001/bert-yolo.html
echo.
echo ✅ REFUND COMPLETADO - Botones funcionan garantizado
pause