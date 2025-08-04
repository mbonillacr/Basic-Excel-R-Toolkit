const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3002;

// Configurar ruta de R
const R_PATH = 'C:\\Program Files\\R\\R-4.4.1\\bin\\Rscript.exe';

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

// Configurar multer
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Almacenamiento en memoria
const sessions = new Map();
const jobs = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT v3.0 Server is running',
        timestamp: new Date().toISOString(),
        rPath: R_PATH
    });
});

// Test R connection
app.get('/api/test-r', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        const result = await new Promise((resolve, reject) => {
            const rProcess = spawn(R_PATH, ['-e', 'cat(R.version.string)']);
            let output = '';
            let error = '';
            
            rProcess.stdout.on('data', data => output += data.toString());
            rProcess.stderr.on('data', data => error += data.toString());
            
            rProcess.on('close', code => {
                if (code === 0) {
                    resolve({ 
                        success: true, 
                        version: output.trim() || 'R 4.4.1 detected',
                        rPath: R_PATH
                    });
                } else {
                    reject(new Error(`R test failed: ${error}`));
                }
            });
        });
        
        res.json(result);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Función para ejecutar K-Means simple
app.post('/api/simple-kmeans', async (req, res) => {
    try {
        const { k = 3 } = req.body;
        
        const rScript = `
library(cluster)
library(jsonlite)

# Cargar datos IRIS
data(iris)
df <- iris[,1:4]

# K-Means
set.seed(123)
kmeans_result <- kmeans(df, centers = ${k}, nstart = 25)

# PCA para visualización
pca_result <- prcomp(df, center = TRUE, scale. = TRUE)

result <- list(
    k = ${k},
    clusters = as.numeric(kmeans_result$cluster),
    pca_x = as.numeric(pca_result$x[,1]),
    pca_y = as.numeric(pca_result$x[,2]),
    centers = kmeans_result$centers,
    species = as.character(iris$Species)
)

cat('RESULT_START\\n')
cat(toJSON(result, auto_unbox = TRUE))
cat('\\nRESULT_END\\n')
`;

        const { spawn } = require('child_process');
        const result = await new Promise((resolve, reject) => {
            const rProcess = spawn(R_PATH, ['-e', rScript]);
            let output = '';
            let error = '';
            
            rProcess.stdout.on('data', data => output += data.toString());
            rProcess.stderr.on('data', data => error += data.toString());
            
            rProcess.on('close', code => {
                if (code === 0) {
                    try {
                        const startIndex = output.indexOf('RESULT_START') + 'RESULT_START'.length;
                        const endIndex = output.indexOf('RESULT_END');
                        const jsonStr = output.substring(startIndex, endIndex).trim();
                        const data = JSON.parse(jsonStr);
                        resolve(data);
                    } catch (e) {
                        reject(new Error(`Error parsing R output: ${e.message}`));
                    }
                } else {
                    reject(new Error(`R execution failed: ${error}`));
                }
            });
        });
        
        res.json({ success: true, data: result });
        
    } catch (error) {
        console.error('Error en K-Means simple:', error);
        res.json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ BERT v3.0 Server ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Usando R: ${R_PATH}`);
    console.log(`🔗 Endpoints disponibles:`);
    console.log(`   - GET  /api/health     - Estado del servidor`);
    console.log(`   - GET  /api/test-r     - Probar conexión con R`);
    console.log(`   - POST /api/simple-kmeans - K-Means con datos IRIS`);
});