const express = require('express');
const path = require('path');
const app = express();

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta principal que lista todos los HTMLs disponibles
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BERT HTML Files</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .file-list { list-style: none; padding: 0; }
            .file-list li { margin: 10px 0; }
            .file-list a { display: block; padding: 15px; background: #f0f0f0; text-decoration: none; color: #333; border-radius: 5px; }
            .file-list a:hover { background: #e0e0e0; }
        </style>
    </head>
    <body>
        <h1>🚀 BERT HTML Files</h1>
        <ul class="file-list">
            <li><a href="/test-function.html">📊 Test Function - Probador de funciones BERT</a></li>
            <li><a href="/bert-calculator.html">🧮 BERT Calculator - Calculadora integrada</a></li>
            <li><a href="/kmeans-pca-viz.html">📈 K-means PCA Visualization - Análisis de clusters</a></li>
            <li><a href="/kmeans-test.html">🔬 K-means Test - Pruebas de clustering</a></li>
            <li><a href="/linear-regression-test.html">📉 Linear Regression Test - Regresión lineal</a></li>
            <li><a href="/test-simple.html">⚡ Simple Test - Prueba básica</a></li>
        </ul>
        <hr>
        <p><strong>Servidor BERT:</strong> <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></p>
    </body>
    </html>
  `);
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`📁 HTML Server running on http://localhost:${PORT}`);
  console.log(`🌐 Available HTML files:`);
  console.log(`   - http://localhost:${PORT}/test-function.html`);
  console.log(`   - http://localhost:${PORT}/bert-calculator.html`);
  console.log(`   - http://localhost:${PORT}/kmeans-pca-viz.html`);
  console.log(`   - http://localhost:${PORT}/linear-regression-test.html`);
});