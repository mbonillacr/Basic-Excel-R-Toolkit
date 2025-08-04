@echo off
echo Opening BERT v3.0 Web Interface...
echo.
echo If the browser doesn't open automatically, use these URLs:
echo.
echo Main Interface: http://localhost:3002/bert-v3-main.html
echo Connection Test: http://localhost:3002/test-server-connection.html
echo Health Check: http://localhost:3002/api/health
echo.

REM Open the main interface
start http://localhost:3002/bert-v3-main.html

REM Wait a moment and open connection test as backup
timeout /t 2 /nobreak >nul
start http://localhost:3002/test-server-connection.html

echo Browser windows should be opening...
pause