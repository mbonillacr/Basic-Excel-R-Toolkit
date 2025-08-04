const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Verificar si R está disponible
const { execSync } = require('child_process');
try {
    execSync('Rscript --version', { stdio: 'ignore' });
    console.log('✅ R está disponible');
} catch (error) {
    console.log('❌ R no está disponible. Instala R desde https://cran.r-project.org/');
}

app.use(express.json());
app.use(express.static('.'));

let loadedFunctions = [];
let rEnvironment = '';

// Cargar funciones R
app.post('/api/load-functions', (req, res) => {
    const { code } = req.body;
    
    // Guardar código en archivo temporal
    const tempFile = path.join(__dirname, 'temp_functions.R');
    fs.writeFileSync(tempFile, code);
    
    // Ejecutar R para cargar funciones
    const rProcess = spawn('Rscript', ['-e', `
        source('${tempFile.replace(/\\/g, '/')}')
        functions <- ls()[sapply(ls(), function(x) is.function(get(x)))]
        cat(paste(functions, collapse=','))
    `]);
    
    let output = '';
    let error = '';
    
    rProcess.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    rProcess.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    rProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
            loadedFunctions = output.trim().split(',').filter(f => f.length > 0);
            rEnvironment = req.body.code;
            res.json({ success: true, functions: loadedFunctions });
        } else {
            res.json({ success: false, error: error || 'Error desconocido al cargar funciones' });
        }
        
        // Limpiar archivo temporal
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    });
});

// Ejecutar función específica
app.post('/api/execute-function', (req, res) => {
    const { functionName, params } = req.body;
    
    if (!loadedFunctions.includes(functionName)) {
        return res.json({ success: false, error: 'Función no encontrada' });
    }
    
    // Preparar código R
    let rCode = rEnvironment + '\n';
    
    if (params && params.trim()) {
        // Procesar parámetros
        const processedParams = params.includes('c(') ? params : 
                               params.includes(',') ? `c(${params})` : params;
        rCode += `result <- ${functionName}(${processedParams})\n`;
    } else {
        rCode += `result <- ${functionName}()\n`;
    }
    
    rCode += 'print(result)';
    
    executeR(rCode, res);
});

// Ejecutar código R directo
app.post('/api/execute-r', (req, res) => {
    const { code } = req.body;
    executeR(code, res);
});

function executeR(code, res) {
    const tempFile = path.join(__dirname, 'temp_execute.R');
    fs.writeFileSync(tempFile, code);
    
    const rProcess = spawn('Rscript', [tempFile]);
    
    let output = '';
    let error = '';
    
    rProcess.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    rProcess.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    rProcess.on('close', (code) => {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        
        if (code === 0) {
            res.json({ success: true, output: output.trim() });
        } else {
            res.json({ success: false, error: error || 'Error en la ejecución de R' });
        }
    });
}

app.listen(PORT, () => {
    console.log(`🔬 Servidor BERT v3.0 ejecutándose en http://localhost:${PORT}`);
    console.log('📝 Interfaz disponible en: bert-custom-functions.html');
});