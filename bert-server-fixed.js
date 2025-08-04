const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
const PORT = 3003;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());
app.use(express.static('.'));

const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });
const sessions = new Map();

// Endpoint para carga de series temporales
app.post('/api/upload-timeseries', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath } = req.file;
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const values = lines.map(line => {
            const value = parseFloat(line.trim().split(/[,;\t]/)[0]);
            return isNaN(value) ? null : value;
        }).filter(v => v !== null);

        fs.unlinkSync(filePath);

        if (values.length < 3) {
            return res.json({ success: false, error: 'Se requieren al menos 3 observaciones' });
        }

        const sessionId = uuidv4();
        sessions.set(sessionId, {
            data: values,
            fileName: originalname,
            uploadTime: new Date()
        });

        res.json({
            success: true,
            sessionId,
            fileName: originalname,
            total: values.length,
            preview: values.slice(0, 20)
        });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// Endpoint para análisis - SIN R, usando simulación
app.post('/api/timeseries-analysis', async (req, res) => {
    try {
        const { sessionId, tipoOutput } = req.body;
        
        const session = sessions.get(sessionId);
        if (!session) {
            return res.json({ success: false, error: 'Sesión no encontrada' });
        }

        const data = session.data;
        
        // Simulación de análisis sin R
        let result = {
            analysis: 'Estadísticas Descriptivas',
            table: {
                headers: ['Estadística', 'Valor'],
                rows: [
                    ['Observaciones', data.length],
                    ['Media', (data.reduce((a,b) => a+b, 0) / data.length).toFixed(4)],
                    ['Mínimo', Math.min(...data).toFixed(4)],
                    ['Máximo', Math.max(...data).toFixed(4)]
                ]
            }
        };

        if (tipoOutput == 2) {
            result.analysis = 'Test ADF - Raíz Unitaria (Simulado)';
            result.table = {
                headers: ['Estadístico', 'Valor'],
                rows: [
                    ['ADF Statistic', '-2.8456'],
                    ['p-value', '0.0234'],
                    ['Interpretación', 'Serie estacionaria (simulado)']
                ]
            };
        }

        res.json({ success: true, data: result });
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT Server (Sin R)',
        rAvailable: false,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 BERT Server (Sin R) ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Series de Tiempo: bert-series-tiempo.html`);
    console.log(`⚠️  Usando simulación - R no disponible`);
});