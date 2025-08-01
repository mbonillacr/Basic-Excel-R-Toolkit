@echo off
echo 🚀 BERT v3.0 Simple Start (No Docker)
echo ===================================

echo ⚡ Starting API Gateway...
cd services\api-gateway
start "API Gateway" cmd /k "npm start"
cd ..\..

echo ⚡ Starting R Service...
cd services\r-service
start "R Service" cmd /k "npm start"
cd ..\..

echo ⚡ Starting Julia Service...
cd services\julia-service
start "Julia Service" cmd /k "npm start"
cd ..\..

echo ⚡ Starting Auth Service...
cd services\auth-service
start "Auth Service" cmd /k "npm start"
cd ..\..

echo ⚡ Starting AI Service...
cd services\ai-service
start "AI Service" cmd /k "npm start"
cd ..\..

echo ⚡ Starting Plugin Manager...
cd services\plugin-manager
start "Plugin Manager" cmd /k "npm start"
cd ..\..

echo ⚡ Starting Python Service...
cd services\python-service
start "Python Service" cmd /k "npm start"
cd ..\..

timeout /t 5 /nobreak >nul

echo ✅ BERT v3.0 Services Started!
echo 🌐 API Gateway: http://localhost:3000
echo 📊 Health Check: http://localhost:3000/health
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3000/health