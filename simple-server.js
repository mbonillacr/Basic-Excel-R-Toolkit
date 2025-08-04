const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'bert-v3-main.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Main interface: http://localhost:${PORT}/bert-v3-main.html`);
});