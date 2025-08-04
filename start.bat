@echo off
echo Iniciando servidor BERT...
echo.
echo Instalando dependencias...
call npm install
echo.
echo Iniciando servidor en puerto 3002...
echo.
echo URLs disponibles:
echo   K-Means: http://localhost:3002/kmeans-pca-viz-v2.html
echo   Series Tiempo: http://localhost:3002/series-tiempo-viz.html
echo.
echo Presiona Ctrl+C para detener el servidor
echo.
node server.js
pause