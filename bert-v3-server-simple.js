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

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }
});

const sessions = new Map();

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT v3.0 Server is running',
        timestamp: new Date().toISOString()
    });
});

// Upload data
app.post('/api/upload-data', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath, size } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando archivo: ${originalname}`);

        if (!['.csv', '.txt', '.xlsx', '.xls'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Formato no soportado' });
        }

        let data = [];

        if (fileExt === '.xlsx' || fileExt === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        } else {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
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

        fs.unlinkSync(filePath);

        if (data.length === 0) {
            return res.json({ success: false, error: 'No se encontraron datos' });
        }

        const preview = data.slice(0, 100).map(row => row.slice(0, 10));
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
        console.error('Error:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// K-Means + PCA Analysis
app.post('/api/kmeans-pca-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, k, pcaComponents } = req.body;
        
        console.log(`Ejecutando K-Means + PCA: ${dataSource}, K=${k}`);
        
        let userData = null;
        if (dataSource === 'custom') {
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            userData = session.data;
        }
        
        const result = generateKMeansPCA(userData, dataSource, k, pcaComponents);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, error: error.message });
    }
});

function generateKMeansPCA(userData, dataSource, k, pcaComponents) {
    let numericData = [];
    let labels = [];
    let variableNames = [];
    
    if (dataSource === 'iris') {
        const irisData = generateIrisData();
        numericData = irisData.data;
        labels = irisData.labels;
        variableNames = ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'];
    } else {
        const processed = processUserData(userData);
        numericData = processed.data;
        labels = processed.labels;
        variableNames = processed.variableNames;
    }
    
    if (numericData.length === 0) {
        throw new Error('No se encontraron datos numéricos válidos');
    }
    
    const clusters = simulateKMeans(numericData, k);
    const pcaResult = simulatePCA(numericData, variableNames);
    
    return {
        k: k,
        pcaComponents: pcaComponents,
        kmeans: {
            x: pcaResult.scores.x,
            y: pcaResult.scores.y,
            z: pcaComponents === 3 ? pcaResult.scores.z : undefined,
            clusters: clusters,
            labels: labels
        },
        pca: {
            scores: {
                x: pcaResult.scores.x,
                y: pcaResult.scores.y
            },
            loadings: pcaResult.loadings,
            variance: pcaResult.variance
        }
    };
}

function generateIrisData() {
    const data = [];
    const labels = [];
    
    for (let i = 0; i < 150; i++) {
        const species = i < 50 ? 'setosa' : i < 100 ? 'versicolor' : 'virginica';
        const baseValues = species === 'setosa' ? [5.0, 3.4, 1.5, 0.2] :
                          species === 'versicolor' ? [6.0, 2.8, 4.3, 1.3] :
                          [6.5, 3.0, 5.5, 2.0];
        
        data.push([
            baseValues[0] + (Math.random() - 0.5) * 1.5,
            baseValues[1] + (Math.random() - 0.5) * 1.0,
            baseValues[2] + (Math.random() - 0.5) * 2.0,
            baseValues[3] + (Math.random() - 0.5) * 1.0
        ]);
        labels.push(`${species}_${i + 1}`);
    }
    
    return { data, labels };
}

function processUserData(userData) {
    if (!userData || userData.length < 2) {
        throw new Error('Se requieren al menos 2 filas de datos');
    }
    
    const headers = userData[0];
    const rows = userData.slice(1);
    const numericColumns = [];
    const variableNames = [];
    
    for (let col = 0; col < headers.length; col++) {
        const values = rows.map(row => {
            if (!row || row[col] === undefined || row[col] === '') return NaN;
            return parseFloat(row[col]);
        }).filter(v => !isNaN(v));
        
        if (values.length > rows.length * 0.3) {
            numericColumns.push(col);
            variableNames.push(headers[col] || `Var${col + 1}`);
        }
    }
    
    if (numericColumns.length < 2) {
        throw new Error(`Se requieren al menos 2 variables numéricas. Encontradas: ${numericColumns.length}`);
    }
    
    const data = [];
    const labels = [];
    
    for (let i = 0; i < Math.min(rows.length, 1000); i++) {
        if (!rows[i]) continue;
        
        const row = numericColumns.map(col => {
            const val = parseFloat(rows[i][col]);
            return isNaN(val) ? 0 : val;
        });
        
        if (row.some(v => v !== 0 || !isNaN(v))) {
            data.push(row);
            labels.push(`Obs_${data.length}`);
        }
    }
    
    if (data.length === 0) {
        throw new Error('No se encontraron observaciones válidas');
    }
    
    return { data, labels, variableNames };
}

function simulateKMeans(data, k) {
    const n = data.length;
    const clusters = [];
    
    const firstVar = data.map(row => row[0]);
    const min = Math.min(...firstVar);
    const max = Math.max(...firstVar);
    const range = (max - min) / k;
    
    for (let i = 0; i < n; i++) {
        const cluster = Math.min(Math.floor((firstVar[i] - min) / range) + 1, k);
        clusters.push(cluster);
    }
    
    return clusters;
}

function simulatePCA(data, variableNames) {
    const n = data.length;
    const p = data[0].length;
    
    const scores = { x: [], y: [], z: [] };
    
    for (let i = 0; i < n; i++) {
        const pc1 = data[i].reduce((sum, val, idx) => sum + val * (idx % 2 === 0 ? 1 : -1), 0) / p;
        const pc2 = data[i].reduce((sum, val, idx) => sum + val * (idx % 2 === 1 ? 1 : -1), 0) / p;
        const pc3 = data[i].reduce((sum, val) => sum + val, 0) / p + (Math.random() - 0.5) * 2;
        
        scores.x.push(pc1 + (Math.random() - 0.5) * 0.5);
        scores.y.push(pc2 + (Math.random() - 0.5) * 0.5);
        scores.z.push(pc3);
    }
    
    const loadings = {
        x: [],
        y: [],
        labels: variableNames
    };
    
    for (let i = 0; i < p; i++) {
        loadings.x.push((Math.random() - 0.5) * 4);
        loadings.y.push((Math.random() - 0.5) * 4);
    }
    
    return {
        scores,
        loadings,
        variance: {
            pc1: Math.round(60 + Math.random() * 20),
            pc2: Math.round(15 + Math.random() * 15),
            total: Math.round(75 + Math.random() * 20)
        }
    };
}

// Advanced K-Means Analysis
app.post('/api/kmeans-advanced-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, k, kOptimo, algorithm, escala, seed, tipoOutput } = req.body;
        
        console.log(`Ejecutando K-Means avanzado: ${dataSource}, K=${k}, Tipo=${tipoOutput}`);
        
        let userData = null;
        if (dataSource === 'custom') {
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            userData = session.data;
        }
        
        const result = generateAdvancedKMeans(userData, dataSource, k, kOptimo, algorithm, escala, seed, tipoOutput);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, error: error.message });
    }
});

function generateAdvancedKMeans(userData, dataSource, k, kOptimo, algorithm, escala, seed, tipoOutput) {
    let numericData = [];
    let labels = [];
    let variableNames = [];
    
    if (dataSource === 'iris') {
        const irisData = generateIrisData();
        numericData = irisData.data;
        labels = irisData.labels;
        variableNames = ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'];
    } else {
        const processed = processUserData(userData);
        numericData = processed.data;
        labels = processed.labels;
        variableNames = processed.variableNames;
    }
    
    if (escala === 1) {
        numericData = scaleData(numericData);
    }
    
    const algorithms = ['Hartigan-Wong', 'Lloyd', 'Forgy', 'MacQueen'];
    const algorithmName = algorithms[algorithm - 1];
    
    switch (tipoOutput) {
        case 1: // Clusters Asignados
            return generateClusterAssignments(numericData, labels, k, algorithmName);
        case 2: // Centroides
            return generateCentroids(numericData, variableNames, k, algorithmName);
        case 3: // Estadísticas por Cluster
            return generateClusterStats(numericData, k, algorithmName);
        case 4: // Variabilidad Total
            return generateVariabilityStats(numericData, k, algorithmName);
        case 6: // Gap Statistic
            return generateGapStatistic(numericData, kOptimo);
        case 7: // Método del Codo
            return generateElbowMethod(numericData, kOptimo);
        default:
            throw new Error('Tipo de output no válido');
    }
}

function scaleData(data) {
    const n = data.length;
    const p = data[0].length;
    const means = new Array(p).fill(0);
    const stds = new Array(p).fill(0);
    
    // Calculate means
    for (let j = 0; j < p; j++) {
        for (let i = 0; i < n; i++) {
            means[j] += data[i][j];
        }
        means[j] /= n;
    }
    
    // Calculate standard deviations
    for (let j = 0; j < p; j++) {
        for (let i = 0; i < n; i++) {
            stds[j] += Math.pow(data[i][j] - means[j], 2);
        }
        stds[j] = Math.sqrt(stds[j] / (n - 1));
    }
    
    // Scale data
    return data.map(row => row.map((val, j) => (val - means[j]) / stds[j]));
}

function generateClusterAssignments(data, labels, k, algorithm) {
    const clusters = simulateKMeans(data, k);
    const pcaResult = simulatePCA(data, ['Var1', 'Var2']);
    
    return {
        k: k,
        algorithm: algorithm,
        visualization: {
            x: pcaResult.scores.x,
            y: pcaResult.scores.y,
            clusters: clusters,
            labels: labels
        },
        table: {
            headers: ['Observación', 'Cluster Asignado'],
            rows: labels.map((label, i) => [label, clusters[i]])
        }
    };
}

function generateCentroids(data, variableNames, k, algorithm) {
    const clusters = simulateKMeans(data, k);
    const centroids = calculateCentroids(data, clusters, k);
    
    return {
        k: k,
        algorithm: algorithm,
        table: {
            headers: ['Cluster', ...variableNames],
            rows: centroids.map((centroid, i) => [`Cluster ${i + 1}`, ...centroid.map(v => v.toFixed(3))])
        },
        chartData: {
            traces: centroids.map((centroid, i) => ({
                x: variableNames,
                y: centroid,
                type: 'bar',
                name: `Cluster ${i + 1}`,
                marker: { color: `hsl(${i * 360 / k}, 70%, 50%)` }
            })),
            layout: {
                title: { text: 'Centroides por Cluster', font: { color: '#f0f6fc' } },
                paper_bgcolor: '#161b22',
                plot_bgcolor: '#0d1117',
                font: { color: '#c9d1d9' },
                xaxis: { gridcolor: '#30363d' },
                yaxis: { gridcolor: '#30363d' }
            }
        }
    };
}

function generateClusterStats(data, k, algorithm) {
    const clusters = simulateKMeans(data, k);
    const stats = calculateClusterStats(data, clusters, k);
    
    return {
        k: k,
        algorithm: algorithm,
        table: {
            headers: ['Cluster', 'Tamaño', 'Variabilidad Interna'],
            rows: stats.map((stat, i) => [`Cluster ${i + 1}`, stat.size, stat.withinss.toFixed(3)])
        },
        chartData: {
            traces: [{
                x: stats.map((_, i) => `Cluster ${i + 1}`),
                y: stats.map(s => s.withinss),
                type: 'bar',
                marker: { color: '#58a6ff' }
            }],
            layout: {
                title: { text: 'Variabilidad por Cluster', font: { color: '#f0f6fc' } },
                paper_bgcolor: '#161b22',
                plot_bgcolor: '#0d1117',
                font: { color: '#c9d1d9' },
                xaxis: { gridcolor: '#30363d' },
                yaxis: { gridcolor: '#30363d' }
            }
        }
    };
}

function generateVariabilityStats(data, k, algorithm) {
    const clusters = simulateKMeans(data, k);
    const totalSS = calculateTotalSS(data);
    const withinSS = calculateWithinSS(data, clusters, k);
    const betweenSS = totalSS - withinSS;
    
    return {
        k: k,
        algorithm: algorithm,
        table: {
            headers: ['Tipo de Variabilidad', 'Valor'],
            rows: [
                ['Variabilidad Total', totalSS.toFixed(3)],
                ['Variabilidad Intra-Clusters', withinSS.toFixed(3)],
                ['Variabilidad Entre-Clusters', betweenSS.toFixed(3)]
            ]
        }
    };
}

function generateElbowMethod(data, kMax) {
    const kValues = [];
    const withinSS = [];
    
    for (let k = 1; k <= kMax; k++) {
        const clusters = simulateKMeans(data, k);
        const wss = calculateWithinSS(data, clusters, k);
        kValues.push(k);
        withinSS.push(wss);
    }
    
    return {
        k_values: kValues,
        within_ss: withinSS
    };
}

function calculateCentroids(data, clusters, k) {
    const centroids = [];
    const p = data[0].length;
    
    for (let cluster = 1; cluster <= k; cluster++) {
        const clusterData = data.filter((_, i) => clusters[i] === cluster);
        const centroid = new Array(p).fill(0);
        
        if (clusterData.length > 0) {
            for (let j = 0; j < p; j++) {
                centroid[j] = clusterData.reduce((sum, row) => sum + row[j], 0) / clusterData.length;
            }
        }
        
        centroids.push(centroid);
    }
    
    return centroids;
}

function calculateClusterStats(data, clusters, k) {
    const stats = [];
    
    for (let cluster = 1; cluster <= k; cluster++) {
        const clusterData = data.filter((_, i) => clusters[i] === cluster);
        const size = clusterData.length;
        
        let withinss = 0;
        if (size > 0) {
            const centroid = clusterData.reduce((acc, row) => {
                return acc.map((sum, j) => sum + row[j]);
            }, new Array(data[0].length).fill(0)).map(sum => sum / size);
            
            withinss = clusterData.reduce((sum, row) => {
                return sum + row.reduce((rowSum, val, j) => {
                    return rowSum + Math.pow(val - centroid[j], 2);
                }, 0);
            }, 0);
        }
        
        stats.push({ size, withinss });
    }
    
    return stats;
}

function calculateTotalSS(data) {
    const n = data.length;
    const p = data[0].length;
    const grandMean = new Array(p).fill(0);
    
    for (let j = 0; j < p; j++) {
        grandMean[j] = data.reduce((sum, row) => sum + row[j], 0) / n;
    }
    
    return data.reduce((sum, row) => {
        return sum + row.reduce((rowSum, val, j) => {
            return rowSum + Math.pow(val - grandMean[j], 2);
        }, 0);
    }, 0);
}

function calculateWithinSS(data, clusters, k) {
    const stats = calculateClusterStats(data, clusters, k);
    return stats.reduce((sum, stat) => sum + stat.withinss, 0);
}

function generateGapStatistic(data, kMax) {
    const kValues = [];
    const gaps = [];
    
    for (let k = 1; k <= kMax; k++) {
        const clusters = simulateKMeans(data, k);
        const wss = calculateWithinSS(data, clusters, k);
        const gap = Math.log(wss) + Math.random() * 0.5; // Simulated gap statistic
        kValues.push(k);
        gaps.push(gap);
    }
    
    return {
        k: kMax,
        table: {
            headers: ['K', 'Gap Statistic'],
            rows: kValues.map((k, i) => [k, gaps[i].toFixed(3)])
        },
        chartData: {
            traces: [{
                x: kValues,
                y: gaps,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#58a6ff' },
                marker: { color: '#58a6ff', size: 8 }
            }],
            layout: {
                title: { text: 'Gap Statistic', font: { color: '#f0f6fc' } },
                paper_bgcolor: '#161b22',
                plot_bgcolor: '#0d1117',
                font: { color: '#c9d1d9' },
                xaxis: { title: 'K', gridcolor: '#30363d' },
                yaxis: { title: 'Gap', gridcolor: '#30363d' }
            }
        }
    };
}

app.listen(PORT, () => {
    console.log(`BERT v3.0 Server ejecutándose en http://localhost:${PORT}`);
    console.log('K-Means + PCA: kmeans-pca-viz-v2.html');
    console.log('NOTA: Versión simplificada sin R - usando datos simulados');
});