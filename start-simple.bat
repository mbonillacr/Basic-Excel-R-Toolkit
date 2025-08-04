@echo off
echo ========================================
echo    BERT v3.0 - Servidor Simplificado
echo ========================================
echo.
echo Iniciando servidor sin dependencia de R...
echo.
echo Interfaces disponibles:
echo - K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html
echo - Health Check: http://localhost:3002/api/health
echo.
node bert-v3-server-simple.js
pause