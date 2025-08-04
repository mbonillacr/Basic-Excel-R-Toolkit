@echo off
cls
echo.
echo ========================================
echo    BERT v3.0 - INICIO AUTOMATICO
echo ========================================
echo.
echo [1/2] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias de Node.js...
    call npm install
    echo.
)

echo [2/2] Iniciando servidor unificado...
echo.
echo 🚀 BERT v3.0 se esta iniciando...
echo 📍 URL Principal: http://localhost:3002
echo 📊 K-Means + PCA disponible
echo 📈 Series de Tiempo disponible
echo.
echo ⚠️  NO CIERRES esta ventana mientras uses BERT
echo ⚠️  Para detener: presiona Ctrl+C
echo.
echo ========================================
echo.

node bert-unified-server.js

echo.
echo ========================================
echo    BERT v3.0 - SERVIDOR DETENIDO
echo ========================================
pause