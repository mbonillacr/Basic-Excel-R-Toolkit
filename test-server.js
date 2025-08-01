const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'BERT v3.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 BERT v3.0 Running!</h1>
    <p>✅ Status: Healthy</p>
    <p>📅 Time: ${new Date().toLocaleString()}</p>
    <p><a href="/health">Health Check</a></p>
  `);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 BERT v3.0 running on http://localhost:${PORT}`);
});