const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Servir archivos estáticos
app.get('/kmeans-pca-viz-v2.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'kmeans-pca-viz-v2.html'));
});

app.get('/series-tiempo-viz.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'series-tiempo-viz.html'));
});

app.post('/api/upload-data', upload.single('file'), (req, res) => {
  res.json({
    success: true,
    fileName: req.file.originalname,
    total: 150,
    columns: 4,
    sessionId: 'demo123'
  });
});

app.post('/api/kmeans-advanced-analysis', (req, res) => {
  const { k = 3, tipoOutput = 1 } = req.body;
  
  const result = {
    success: true,
    data: {
      k: k,
      visualization: {
        x: [1.2, 2.1, 1.8, 2.5, 1.9, 2.3],
        y: [0.8, 1.5, 1.2, 1.8, 1.1, 1.6],
        clusters: [1, 2, 1, 3, 1, 2],
        labels: ['Obs 1', 'Obs 2', 'Obs 3', 'Obs 4', 'Obs 5', 'Obs 6']
      },
      chartData: {
        traces: [{
          x: ['Cluster 1', 'Cluster 2', 'Cluster 3'],
          y: [15, 25, 10],
          type: 'bar',
          marker: { color: '#58a6ff' }
        }],
        layout: {
          title: { text: 'Distribución por Cluster', font: { color: '#f0f6fc' } },
          paper_bgcolor: '#161b22',
          plot_bgcolor: '#0d1117',
          font: { color: '#c9d1d9' },
          xaxis: { gridcolor: '#30363d' },
          yaxis: { gridcolor: '#30363d' }
        }
      },
      table: {
        headers: ['ID', 'Cluster', 'Distancia'],
        rows: [
          ['1', '1', '0.45'],
          ['2', '2', '0.32'],
          ['3', '1', '0.28'],
          ['4', '3', '0.51'],
          ['5', '1', '0.39'],
          ['6', '2', '0.42']
        ]
      }
    }
  };

  if (tipoOutput === 7) {
    result.data = {
      k_values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      within_ss: [120, 80, 45, 35, 28, 25, 23, 22, 21, 20]
    };
  }

  res.json(result);
});

app.post('/api/upload-timeseries', upload.single('file'), (req, res) => {
  res.json({
    success: true,
    fileName: req.file.originalname,
    total: 100,
    sessionId: 'ts_demo123'
  });
});

app.post('/api/timeseries-analysis', (req, res) => {
  const { tipoOutput = 2, periodicidad = 4 } = req.body;
  
  const timePoints = Array.from({length: 50}, (_, i) => i + 1);
  const values = timePoints.map(t => 
    10 + 2 * Math.sin(t * 0.3) + Math.random() * 2
  );
  
  const result = {
    success: true,
    data: {
      originalSeries: {
        time: timePoints,
        values: values
      },
      table: {
        headers: ['Estadístico', 'Valor', 'P-Valor'],
        rows: [
          ['ADF Test', '-3.45', '0.012'],
          ['Phillips-Perron', '-3.21', '0.018'],
          ['Jarque-Bera', '2.34', '0.310'],
          ['Ljung-Box', '15.67', '0.001']
        ]
      }
    }
  };
  
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`K-Means: http://localhost:${PORT}/kmeans-pca-viz-v2.html`);
  console.log(`Series Tiempo: http://localhost:${PORT}/series-tiempo-viz.html`);
});