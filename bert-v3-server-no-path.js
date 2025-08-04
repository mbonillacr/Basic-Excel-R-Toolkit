const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3002;

// Ruta completa a R
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

// Test R connection with full path
async function testRConnection() {
    return new Promise((resolve, reject) => {
        console.log('Probando conexión con R usando ruta completa...');
        
        const rProcess = spawn(R_PATH, ['-e', 'cat("R OK\\n"); cat(R.version.string)'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        const timeout = setTimeout(() => {
            rProcess.kill();
            reject(new Error('R connection timeout'));
        }, 10000);
        
        rProcess.on('close', code => {
            clearTimeout(timeout);
            console.log(`R test exit code: ${code}`);
            console.log(`R output: ${output}`);
            if (error) console.log(`R error: ${error}`);
            
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`R failed with code ${code}: ${error}`));
            }
        });
        
        rProcess.on('error', err => {
            clearTimeout(timeout);
            reject(new Error(`R spawn error: ${err.message}`));
        });
    });
}

// Execute R script with full path
async function executeRScript(script) {
    return new Promise((resolve, reject) => {
        console.log('Ejecutando script R...');
        
        const rProcess = spawn(R_PATH, ['-e', script], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        const timeout = setTimeout(() => {
            rProcess.kill();
            reject(new Error('R execution timeout'));
        }, 30000);
        
        rProcess.on('close', code => {
            clearTimeout(timeout);
            console.log(`R process exit code: ${code}`);
            if (output) console.log(`R stdout: ${output}`);
            if (error) console.log(`R stderr: ${error}`);
            
            if (code === 0) {
                resolve({ output, error });
            } else {
                reject(new Error(`R process failed (code ${code}): ${error || 'Unknown error'}`));
            }
        });
        
        rProcess.on('error', err => {
            clearTimeout(timeout);
            reject(new Error(`R spawn error: ${err.message}`));
        });
    });
}

// Test endpoint
app.get('/api/test-r', async (req, res) => {
    try {
        const result = await testRConnection();
        res.json({
            success: true,
            message: 'R connection successful',
            rVersion: result.trim(),
            rPath: R_PATH
        });
    } catch (error) {
        console.error('R test failed:', error);
        res.json({
            success: false,
            error: error.message,
            rPath: R_PATH
        });
    }
});

// Simple R execution endpoint
app.post('/api/execute-r', async (req, res) => {
    try {
        const { script } = req.body;
        
        if (!script) {
            return res.json({ success: false, error: 'No script provided' });
        }
        
        const result = await executeRScript(script);
        
        res.json({
            success: true,
            output: result.output,
            stderr: result.error
        });
        
    } catch (error) {
        console.error('R execution failed:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Test packages endpoint
app.get('/api/test-packages', async (req, res) => {
    try {
        const script = `
# Test required packages
packages <- c('cluster', 'factoextra', 'jsonlite', 'tseries')
results <- list()

for (pkg in packages) {
    if (require(pkg, quietly = TRUE, character.only = TRUE)) {
        results[[pkg]] <- 'OK'
    } else {
        results[[pkg]] <- 'NOT_INSTALLED'
    }
}

cat('PACKAGES_START\\n')
for (pkg in names(results)) {
    cat(pkg, ':', results[[pkg]], '\\n')
}
cat('PACKAGES_END\\n')
`;
        
        const result = await executeRScript(script);
        
        res.json({
            success: true,
            output: result.output,
            stderr: result.error
        });
        
    } catch (error) {
        console.error('Package test failed:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT v3.0 Server (No PATH) is running',
        timestamp: new Date().toISOString(),
        rPath: R_PATH
    });
});

// Start server and test R
app.listen(PORT, async () => {
    console.log(`BERT v3.0 Server (No PATH) ejecutándose en http://localhost:${PORT}`);
    console.log(`Usando R en: ${R_PATH}`);
    
    try {
        const result = await testRConnection();
        console.log('✅ R configurado correctamente');
        console.log(`📊 Versión: ${result.trim()}`);
        console.log('🔗 Endpoints disponibles:');
        console.log('  - GET  /api/health');
        console.log('  - GET  /api/test-r');
        console.log('  - GET  /api/test-packages');
        console.log('  - POST /api/execute-r');
    } catch (error) {
        console.error('❌ Error con R:', error.message);
        console.log('💡 Verificar que R esté instalado en:', R_PATH);
    }
});