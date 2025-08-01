@echo off
echo ========================================
echo BERT v3.0 Installation Script
echo ========================================

echo.
echo Step 1: Checking prerequisites...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Docker not found. Please install Docker Desktop first.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✓ Docker found
echo ✓ Node.js found

echo.
echo Step 2: Setting up environment...
if not exist .env.production (
    copy .env.example .env.production
    echo ✓ Environment file created
) else (
    echo ✓ Environment file already exists
)

echo.
echo Step 3: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install main dependencies
    pause
    exit /b 1
)

echo ✓ Main dependencies installed

echo.
echo Step 4: Installing service dependencies...
cd services\api-gateway && call npm install && cd ..\..
cd services\r-service && call npm install && cd ..\..
cd services\julia-service && call npm install && cd ..\..
cd services\auth-service && call npm install && cd ..\..
cd services\ai-service && call npm install && cd ..\..
cd services\plugin-manager && call npm install && cd ..\..
cd services\python-service && call npm install && cd ..\..

echo ✓ All service dependencies installed

echo.
echo Step 5: Starting BERT v3.0 services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo ✓ Services started successfully

echo.
echo Step 6: Verifying installation...
timeout /t 10 /nobreak >nul
curl -s http://localhost:3000/health >nul
if %errorlevel% neq 0 (
    echo WARNING: API Gateway health check failed. Services may still be starting...
) else (
    echo ✓ API Gateway is responding
)

echo.
echo ========================================
echo BERT v3.0 Installation Complete!
echo ========================================
echo.
echo Access Points:
echo - Web Console: http://localhost:3000/console
echo - Admin Dashboard: http://localhost:3000/admin
echo - API Health: http://localhost:3000/health
echo.
echo To check logs: docker-compose logs
echo To stop: docker-compose down
echo.
pause