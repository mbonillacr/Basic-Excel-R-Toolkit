@echo off
echo ========================================
echo    BERT v3.0 - Inicio Automático
echo ========================================
echo.

echo Verificando disponibilidad de R...
Rscript --version >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ✅ R detectado - Usando servidor completo
    echo.
    echo 📊 K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html
    echo 📈 Series de Tiempo: http://localhost:3002/series-tiempo-viz.html
    echo.
    echo Iniciando servidor con R...
    node bert-v3-server.js
) else (
    echo ⚠️  R no detectado - Usando servidor simulado
    echo.
    echo 📊 K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html
    echo 📈 Series de Tiempo: http://localhost:3002/series-tiempo-viz.html
    echo.
    echo Para instalar R ejecuta: setup-r-simple.bat
    echo.
    echo Iniciando servidor simulado...
    node bert-v3-server-no-r.js
)

pause