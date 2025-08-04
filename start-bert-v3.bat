@echo off
echo ========================================
echo    BERT v3.0 - Plataforma Web
echo ========================================
echo.
echo [1/3] Instalando dependencias...
npm install
echo.
echo [2/3] Iniciando servidor...
echo.
echo 🔬 BERT v3.0 - Funcionalidades implementadas:
echo ✅ RF1: Carga y previsualización de datos (CSV/TXT/XLSX)
echo ✅ RF2: Gestión de scripts R y parsing de dependencias  
echo ✅ RF3: Ejecución asíncrona con job_id y polling
echo ✅ RF4: Visualización Plotly interactiva y Stargazer
echo ✅ Tema oscuro GitHub (#0d1117, #c9d1d9, #21262d)
echo ✅ Drag-and-drop para archivos
echo ✅ Preview de 100 filas x 10 columnas
echo ✅ Auto-detección de separadores CSV
echo ✅ K-Means + PCA con datos IRIS o personalizados
echo.
echo 📊 Interfaz Principal: http://localhost:3002/bert-v3-main.html
echo 🔍 K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html
echo.
echo [3/3] Ejecutando servidor...
node bert-v3-server.js
pause