const express = require('express');
const cors = require('cors');
const { bertSum, bertKMeans, bertLinearRegression } = require('./functions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// BERT Functions
app.post('/api/functions/sum', (req, res) => {
  try {
    const { a, b } = req.body;
    const result = bertSum(a, b);
    
    res.json({
      function: 'BERT.Sum',
      parameters: { a, b },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/functions/kmeans', (req, res) => {
  try {
    const { k } = req.body;
    const result = bertKMeans(k);
    
    res.json({
      function: 'BERT.KMeans',
      parameters: { k },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/functions/linear-regression', (req, res) => {
  try {
    const { dataY, dataX, options } = req.body;
    const result = bertLinearRegression(dataY, dataX, options);
    
    res.json({
      function: 'BERT.LinearRegression',
      parameters: { dataY, dataX, options },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Functions list
app.get('/api/functions', (req, res) => {
  res.json({
    functions: [
      {
        name: 'BERT.Sum',
        description: 'Adds two numbers',
        parameters: ['a: number', 'b: number'],
        returns: 'number',
        example: 'BERT.Sum(5, 3) = 8'
      },
      {
        name: 'BERT.KMeans',
        description: 'K-means clustering on IRIS dataset',
        parameters: ['k: number (1-10)'],
        returns: 'object with clusters, centroids, and statistics',
        example: 'BERT.KMeans(3)'
      },
      {
        name: 'BERT.LinearRegression',
        description: 'Linear regression analysis (based on MR_Lineal)',
        parameters: ['dataY: array', 'dataX: array', 'options: object'],
        returns: 'regression results based on outputType',
        example: 'BERT.LinearRegression([1,2,3], [[1,2],[2,3],[3,4]], {outputType: 1})'
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`BERT API Gateway running on port ${PORT}`);
});