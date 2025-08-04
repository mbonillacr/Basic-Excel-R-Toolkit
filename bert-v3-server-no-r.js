const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3002;

// CORS
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

// Configurar multer con límite de 50MB
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Almacenamiento en memoria para sesiones
const sessions = new Map();

// Carga de datos
app.post('/api/upload-data', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath, size } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando archivo de datos: ${originalname} (${(size/1024/1024).toFixed(2)}MB)`);

        // Validar tipo de archivo
        if (!['.csv', '.txt', '.xlsx', '.xls'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Formato no soportado. Use CSV, TXT o XLSX' });
        }

        let data = [];

        // Procesar según tipo de archivo
        if (fileExt === '.xlsx' || fileExt === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        } else {
            // CSV/TXT - Auto-detectar separador
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Detectar separador (coma, punto y coma, tab)
            const separators = [',', ';', '\t'];
            let bestSeparator = ',';
            let maxColumns = 0;
            
            for (const sep of separators) {
                const testColumns = lines[0].split(sep).length;
                if (testColumns > maxColumns) {
                    maxColumns = testColumns;
                    bestSeparator = sep;
                }
            }
            
            data = lines.map(line => line.split(bestSeparator).map(cell => cell.trim()));
        }

        // Limpiar archivo temporal
        fs.unlinkSync(filePath);

        if (data.length === 0) {
            return res.json({ success: false, error: 'No se encontraron datos en el archivo' });
        }

        // Generar preview (primeras 100 filas, 10 columnas)
        const preview = data.slice(0, 100).map(row => row.slice(0, 10));
        
        // Generar ID de sesión y almacenar datos
        const sessionId = uuidv4();
        sessions.set(sessionId, {
            data: data,
            fileName: originalname,
            fileType: fileExt,
            uploadTime: new Date()
        });

        res.json({
            success: true,
            sessionId,
            fileName: originalname,
            fileType: fileExt,
            total: data.length,
            columns: data[0]?.length || 0,
            preview: preview
        });

    } catch (error) {
        console.error('Error procesando archivo de datos:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// Análisis K-Means avanzado (simulado sin R)
app.post('/api/kmeans-advanced-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, k, kOptimo, algorithm, escala, seed, tipoOutput } = req.body;
        
        console.log(`Simulando K-Means avanzado: ${dataSource}, K=${k}, Output=${tipoOutput}`);
        
        // Simular datos de ejemplo para IRIS
        let result;
        
        if (tipoOutput === 7) {
            // Método del codo - datos simulados
            result = {
                k_values: Array.from({length: kOptimo}, (_, i) => i + 1),
                within_ss: Array.from({length: kOptimo}, (_, i) => 150 - (i * 10) + Math.random() * 5),
                table: {
                    headers: ['K', 'Varianza_Intra_Cluster'],
                    rows: Array.from({length: kOptimo}, (_, i) => [
                        i + 1, 
                        Math.round((150 - (i * 10) + Math.random() * 5) * 100) / 100
                    ])
                }
            };
        } else {
            // Clustering normal - datos simulados
            const numPoints = dataSource === 'iris' ? 150 : 100;
            result = {
                k: k,
                visualization: {
                    x: Array.from({length: numPoints}, () => Math.random() * 6 - 3),
                    y: Array.from({length: numPoints}, () => Math.random() * 4 - 2),
                    clusters: Array.from({length: numPoints}, () => Math.floor(Math.random() * k) + 1),
                    labels: Array.from({length: numPoints}, (_, i) => `Obs_${i + 1}`)
                },
                table: {
                    headers: ['Observación', 'Cluster_Asignado'],
                    rows: Array.from({length: Math.min(numPoints, 50)}, (_, i) => [
                        `Obs_${i + 1}`, 
                        Math.floor(Math.random() * k) + 1
                    ])
                }
            };
        }
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error en K-Means simulado:', error);
        res.json({ success: false, error: error.message });
    }
});

// Endpoint para carga de series temporales
app.post('/api/upload-timeseries', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath, size } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando serie temporal: ${originalname}`);

        if (!['.csv', '.txt'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Solo se permiten archivos CSV o TXT para series temporales' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        // Para series temporales, esperamos una columna de valores
        const values = lines.map(line => {
            const value = parseFloat(line.trim().split(/[,;\t]/)[0]);
            return isNaN(value) ? null : value;
        }).filter(v => v !== null);

        fs.unlinkSync(filePath);

        if (values.length < 10) {
            return res.json({ success: false, error: 'Se requieren al menos 10 observaciones para análisis de series temporales' });
        }

        const sessionId = uuidv4();
        sessions.set(sessionId, {
            data: values,
            fileName: originalname,
            fileType: 'timeseries',
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
        console.error('Error procesando serie temporal:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// Endpoint para análisis de series de tiempo (simulado)
app.post('/api/timeseries-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, periodicidad, tipoAnalisis, tipoOutput } = req.body;
        
        console.log(`Simulando análisis de series de tiempo: ${tipoAnalisis}, Output=${tipoOutput}`);
        
        let data;
        if (dataSource === 'sample') {
            // Generar serie temporal de ejemplo
            const length = 100;
            data = Array.from({length}, (_, i) => {
                const t = i + 1;
                const trend = 0.5 * t;
                const seasonal = 10 * Math.sin(2 * Math.PI * t / 12);
                const noise = (Math.random() - 0.5) * 4;
                return trend + seasonal + noise;
            });
        } else {
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            data = session.data;
        }
        
        const result = generateTimeSeriesResult(data, tipoOutput);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error en análisis de series de tiempo simulado:', error);
        res.json({ success: false, error: error.message });
    }
});

// Función para generar resultados simulados de series de tiempo
function generateTimeSeriesResult(data, tipoOutput) {
    const result = {
        originalSeries: {
            time: Array.from({length: data.length}, (_, i) => i + 1),
            values: data
        }
    };
    
    switch(tipoOutput) {
        case 2: // Test ADF (Raíz Unitaria)
            result.analysisChart = {
                traces: [{
                    x: result.originalSeries.time,
                    y: result.originalSeries.values,
                    mode: 'lines',
                    type: 'scatter',
                    name: 'Serie Original'
                }],
                layout: {
                    title: { text: 'Test ADF - Raíz Unitaria' },
                    paper_bgcolor: '#161b22',
                    plot_bgcolor: '#0d1117',
                    font: { color: '#c9d1d9' },
                    xaxis: { title: 'Tiempo', gridcolor: '#30363d' },
                    yaxis: { title: 'Valor', gridcolor: '#30363d' }
                }
            };
            result.table = {
                headers: ['Estadístico', 'Valor'],
                rows: [
                    ['ADF Statistic', '-3.2456'],
                    ['p-value', '0.0234'],
                    ['Lag Order', '3'],
                    ['Método', 'Augmented Dickey-Fuller Test']
                ]
            };
            break;
            
        case 5: // Autocorrelación
            const acfValues = Array.from({length: 20}, (_, i) => Math.exp(-i/5) * Math.cos(i/3) + Math.random() * 0.1);
            const pacfValues = Array.from({length: 20}, (_, i) => Math.exp(-i/3) * (Math.random() - 0.5));
            
            result.analysisChart = {
                traces: [
                    {
                        x: Array.from({length: 20}, (_, i) => i),
                        y: acfValues,
                        mode: 'lines+markers',
                        type: 'scatter',
                        name: 'ACF'
                    },
                    {
                        x: Array.from({length: 20}, (_, i) => i),
                        y: pacfValues,
                        mode: 'lines+markers',
                        type: 'scatter',
                        name: 'PACF'
                    }
                ],
                layout: {
                    title: { text: 'Funciones de Autocorrelación' },
                    paper_bgcolor: '#161b22',
                    plot_bgcolor: '#0d1117',
                    font: { color: '#c9d1d9' },
                    xaxis: { title: 'Lag', gridcolor: '#30363d' },
                    yaxis: { title: 'Correlación', gridcolor: '#30363d' }
                }
            };
            
            result.table = {
                headers: ['Lag', 'ACF', 'PACF'],
                rows: Array.from({length: 20}, (_, i) => [
                    i,
                    Math.round(acfValues[i] * 10000) / 10000,
                    i === 0 ? '-' : Math.round(pacfValues[i] * 10000) / 10000
                ])
            };
            break;
            
        case 6: // Descomposición aditiva
            const trend = data.map((_, i) => 0.5 * (i + 1) + Math.random() * 2);
            const seasonal = data.map((_, i) => 10 * Math.sin(2 * Math.PI * (i + 1) / 12));
            const residuals = data.map((val, i) => val - trend[i] - seasonal[i]);
            
            result.analysisChart = {
                traces: [
                    {
                        x: result.originalSeries.time,
                        y: trend,
                        mode: 'lines',
                        type: 'scatter',
                        name: 'Tendencia'
                    },
                    {
                        x: result.originalSeries.time,
                        y: seasonal,
                        mode: 'lines',
                        type: 'scatter',
                        name: 'Estacional'
                    },
                    {
                        x: result.originalSeries.time,
                        y: residuals,
                        mode: 'lines',
                        type: 'scatter',
                        name: 'Residuos'
                    }
                ],
                layout: {
                    title: { text: 'Descomposición Aditiva' },
                    paper_bgcolor: '#161b22',
                    plot_bgcolor: '#0d1117',
                    font: { color: '#c9d1d9' },
                    xaxis: { title: 'Tiempo', gridcolor: '#30363d' },
                    yaxis: { title: 'Valor', gridcolor: '#30363d' }
                }
            };
            
            result.table = {
                headers: ['Tiempo', 'Original', 'Tendencia', 'Estacional', 'Residuos'],
                rows: data.slice(0, 50).map((val, i) => [
                    i + 1,
                    Math.round(val * 1000) / 1000,
                    Math.round(trend[i] * 1000) / 1000,
                    Math.round(seasonal[i] * 1000) / 1000,
                    Math.round(residuals[i] * 1000) / 1000
                ])
            };
            break;
            
        default:
            // Análisis por defecto
            result.analysisChart = {
                traces: [{
                    x: result.originalSeries.time,
                    y: result.originalSeries.values,
                    mode: 'lines',
                    type: 'scatter',
                    name: 'Serie Temporal'
                }],
                layout: {
                    title: { text: 'Serie Temporal' },
                    paper_bgcolor: '#161b22',
                    plot_bgcolor: '#0d1117',
                    font: { color: '#c9d1d9' },
                    xaxis: { title: 'Tiempo', gridcolor: '#30363d' },
                    yaxis: { title: 'Valor', gridcolor: '#30363d' }
                }
            };
            
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
            const std = Math.sqrt(variance);
            
            result.table = {
                headers: ['Estadística', 'Valor'],
                rows: [
                    ['Número de observaciones', data.length],
                    ['Media', Math.round(mean * 10000) / 10000],
                    ['Desviación estándar', Math.round(std * 10000) / 10000],
                    ['Mínimo', Math.round(Math.min(...data) * 10000) / 10000],
                    ['Máximo', Math.round(Math.max(...data) * 10000) / 10000]
                ]
            };
    }
    
    return result;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT v3.0 Server (Sin R) is running',
        timestamp: new Date().toISOString(),
        note: 'Servidor funcionando en modo simulado - R no disponible',
        endpoints: [
            '/api/upload-data',
            '/api/upload-timeseries',
            '/api/kmeans-advanced-analysis',
            '/api/timeseries-analysis'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`BERT v3.0 Server (Sin R) ejecutándose en http://localhost:${PORT}`);
    console.log('⚠️  MODO SIMULADO: R no está disponible, usando datos de ejemplo');
    console.log('K-Means + PCA: http://localhost:3002/kmeans-pca-viz-v2.html');
    console.log('Series de Tiempo: http://localhost:3002/series-tiempo-viz.html');
    console.log('Para funcionalidad completa, instale R y agregue Rscript al PATH');
});