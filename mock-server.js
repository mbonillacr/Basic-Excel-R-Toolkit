const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// Mock R responses sin dependencias
app.post('/api/load-functions', (req, res) => {
    const code = req.body.code;
    const functions = [];
    
    // Extraer nombres de funciones del código
    const matches = code.match(/(\w+)\s*<-\s*function/g);
    if (matches) {
        matches.forEach(match => {
            const funcName = match.split('<-')[0].trim();
            functions.push(funcName);
        });
    }
    
    res.json({success: true, functions});
});

app.post('/api/execute-function', (req, res) => {
    const {functionName, params} = req.body;
    
    // Mock responses para funciones comunes
    if (functionName === 'suma') {
        const nums = params.split(',').map(n => parseFloat(n.trim()));
        const result = nums.reduce((a, b) => a + b, 0);
        res.json({success: true, output: `[1] ${result}`});
    } else {
        res.json({success: true, output: `[1] "Función ${functionName} ejecutada con parámetros: ${params}"`});
    }
});

app.post('/api/execute-r', (req, res) => {
    const code = req.body.code.trim();
    
    // Mock responses para código R común
    if (code === '1 + 1') {
        res.json({success: true, output: '[1] 2'});
    } else if (code === '2 + 2') {
        res.json({success: true, output: '[1] 4'});
    } else {
        res.json({success: true, output: `[1] "Código R ejecutado: ${code}"`});
    }
});

app.listen(3001, () => {
    console.log('🚀 Mock Server RUNNING: http://localhost:3001/bert-yolo.html');
    console.log('✅ No R required - Mock responses active');
});