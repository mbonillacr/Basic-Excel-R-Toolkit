@echo off
echo ========================================
echo    BERT v3.0 - Verificador de Servidor
echo ========================================
echo.

echo [1/3] Verificando si Node.js está instalado...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado o no está en el PATH
    echo Descarga Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando dependencias...
if not exist "node_modules" (
    echo ⏳ Instalando dependencias...
    npm install
) else (
    echo ✅ Dependencias ya instaladas
)

echo.
echo [3/3] Verificando si el servidor está ejecutándose...
netstat -an | find "3002" > nul
if %errorlevel% equ 0 (
    echo ✅ Servidor ya está ejecutándose en puerto 3002
    echo 📊 Accede a: http://localhost:3002/bert-v3-main.html
    echo 🧪 Test de conectividad: http://localhost:3002/test-server-connection.html
) else (
    echo ⚠️  Servidor no está ejecutándose
    echo.
    echo ¿Deseas iniciar el servidor? (S/N)
    set /p choice=
    if /i "%choice%"=="S" (
        echo.
        echo 🚀 Iniciando servidor...
        start "BERT v3.0 Server" cmd /k "node bert-v3-server.js"
        echo.
        echo ⏳ Esperando que el servidor inicie...
        timeout /t 3 /nobreak > nul
        echo.
        echo 📊 Accede a: http://localhost:3002/bert-v3-main.html
        echo 🧪 Test de conectividad: http://localhost:3002/test-server-connection.html
    )
)

echo.
pause