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

// Data upload endpoint
app.post('/api/upload-data', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath, size } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando archivo: ${originalname} (${(size/1024/1024).toFixed(2)}MB)`);

        if (!['.csv', '.txt', '.xlsx', '.xls'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Formato no soportado. Use CSV, TXT o XLSX' });
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
            return res.json({ success: false, error: 'No se encontraron datos en el archivo' });
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
        console.error('Error procesando archivo:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// Script upload endpoint
app.post('/api/upload-script', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        if (fileExt !== '.r') {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Solo se permiten archivos .R' });
        }

        const scriptContent = fs.readFileSync(filePath, 'utf8');
        fs.unlinkSync(filePath);

        const functions = [];
        const libraries = [];

        const functionRegex = /(\w+)\s*<-\s*function\s*\(/g;
        let match;
        while ((match = functionRegex.exec(scriptContent)) !== null) {
            functions.push(match[1]);
        }

        const libraryRegex = /(?:library|require)\s*\(\s*['"]*(\\w+)['\"]*\s*\)/g;
        while ((match = libraryRegex.exec(scriptContent)) !== null) {
            if (!libraries.includes(match[1])) {
                libraries.push(match[1]);
            }
        }

        const sessionId = uuidv4();
        sessions.set(sessionId, {
            script: scriptContent,
            fileName: originalname,
            functions: functions,
            libraries: libraries,
            uploadTime: new Date()
        });

        res.json({
            success: true,
            sessionId,
            fileName: originalname,
            functions: functions,
            libraries: libraries,
            linesCount: scriptContent.split('\n').length
        });

    } catch (error) {
        console.error('Error procesando script:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// Analysis endpoint (returns error message about R)
app.post('/api/run-analysis', (req, res) => {
    res.json({
        success: false,
        error: 'R no está instalado. Por favor instale R desde https://cran.r-project.org/bin/windows/base/ y reinicie el servidor.'
    });
});

// Status endpoint
app.get('/api/status/:jobId', (req, res) => {
    res.json({
        success: false,
        error: 'R no está instalado. Instale R para ejecutar análisis.'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT Server (Sin R) ejecutándose',
        timestamp: new Date().toISOString(),
        warning: 'R no está instalado - solo carga de archivos disponible'
    });
});

app.listen(PORT, () => {
    console.log(`BERT Server (Sin R) ejecutándose en http://localhost:${PORT}`);
    console.log('⚠️  ADVERTENCIA: R no está instalado');
    console.log('📁 Solo carga de archivos disponible');
    console.log('🔧 Para análisis completo, instale R desde: https://cran.r-project.org/bin/windows/base/');
});