const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <h1>🚀 BERT v3.0 Test Server</h1>
    <p>✅ Connection Working!</p>
    <p>📅 ${new Date().toLocaleString()}</p>
    <p>🔗 URL: ${req.url}</p>
  `);
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  console.log('✅ Test connection now!');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});