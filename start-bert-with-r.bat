@echo off
echo ========================================
echo    BERT v3.0 - Servidor con R
echo ========================================
echo.

echo Configurando R...
set PATH=%PATH%;C:\Program Files\R\R-4.4.1\bin

echo ✅ R 4.4.1 configurado
echo ✅ Paquetes instalados: cluster, factoextra, jsonlite, tseries
echo.
echo 📊 K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html
echo 📈 Series de Tiempo: http://localhost:3002/series-tiempo-viz.html
echo.
echo Iniciando servidor con R...
node bert-v3-server.js