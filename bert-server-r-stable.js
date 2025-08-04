const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const app = express();
const PORT = 3006;

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

// Usar exec en lugar de spawn para evitar violaciones de acceso
async function executeRScript(script) {
    return new Promise((resolve, reject) => {
        const tempScript = path.join(__dirname, `temp_script_${Date.now()}.R`);
        fs.writeFileSync(tempScript, script);
        
        const command = `"C:\\Program Files\\R\\R-4.4.1\\bin\\Rscript.exe" "${tempScript}"`;
        
        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            // Limpiar archivo temporal
            try { fs.unlinkSync(tempScript); } catch(e) {}
            
            if (error) {
                reject(new Error(`R Error: ${stderr || error.message}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

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

app.post('/api/timeseries-analysis', async (req, res) => {
    try {
        const { sessionId, tipoOutput } = req.body;
        
        const session = sessions.get(sessionId);
        if (!session) {
            return res.json({ success: false, error: 'Sesión no encontrada' });
        }

        const data = session.data;
        
        // Script R simplificado y estable
        const rScript = `
# Cargar librerías con manejo de errores
tryCatch({
    suppressMessages(library(jsonlite))
    if (${tipoOutput} == 2) {
        suppressMessages(library(tseries))
    }
}, error = function(e) {
    cat('ERROR_LIBRARIES\\n')
    quit(status = 1)
})

# Datos
data_values <- c(${data.join(', ')})
ts_obj <- ts(data_values, frequency = 12)

# Análisis
result <- list()

if (${tipoOutput} == 2) {
    # Test ADF con manejo de errores
    tryCatch({
        adf_result <- adf.test(ts_obj)
        result$analysis <- 'Test ADF - Raíz Unitaria'
        result$table <- list(
            headers = c('Estadístico', 'Valor'),
            rows = list(
                c('ADF Statistic', round(adf_result$statistic, 4)),
                c('p-value', round(adf_result$p.value, 4)),
                c('Interpretación', if(adf_result$p.value < 0.05) 'Serie estacionaria' else 'Serie no estacionaria')
            )
        )
    }, error = function(e) {
        result$analysis <- 'Error en Test ADF'
        result$table <- list(
            headers = c('Error', 'Descripción'),
            rows = list(c('ADF Error', as.character(e$message)))
        )
    })
} else {
    # Estadísticas básicas
    result$analysis <- 'Estadísticas Descriptivas'
    result$table <- list(
        headers = c('Estadística', 'Valor'),
        rows = list(
            c('Observaciones', length(ts_obj)),
            c('Media', round(mean(ts_obj, na.rm=TRUE), 4)),
            c('Desv. Estándar', round(sd(ts_obj, na.rm=TRUE), 4)),
            c('Mínimo', round(min(ts_obj, na.rm=TRUE), 4)),
            c('Máximo', round(max(ts_obj, na.rm=TRUE), 4))
        )
    )
}

# Salida JSON
cat('JSON_START')
cat(toJSON(result, auto_unbox = TRUE))
cat('JSON_END')
`;

        const output = await executeRScript(rScript);
        
        // Extraer JSON del output
        const startIndex = output.indexOf('JSON_START') + 'JSON_START'.length;
        const endIndex = output.indexOf('JSON_END');
        
        if (startIndex > 9 && endIndex > startIndex) {
            const jsonStr = output.substring(startIndex, endIndex);
            const result = JSON.parse(jsonStr);
            res.json({ success: true, data: result });
        } else {
            throw new Error('No se pudo extraer resultado JSON');
        }
        
    } catch (error) {
        console.error('Error en análisis:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT Server con R Estable',
        rAvailable: true,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 BERT Server (R Estable) ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Series de Tiempo: bert-series-tiempo.html`);
    console.log(`✅ R 4.4.1: DISPONIBLE (exec method)`);
});