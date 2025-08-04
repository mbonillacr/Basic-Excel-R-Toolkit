const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

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

// Verificar si R está disponible
let rAvailable = false;

function checkRAvailability() {
    return new Promise((resolve) => {
        const rProcess = spawn('Rscript', ['--version']);
        
        rProcess.on('close', (code) => {
            rAvailable = (code === 0);
            console.log(`R disponible: ${rAvailable ? 'SÍ' : 'NO'}`);
            resolve(rAvailable);
        });
        
        rProcess.on('error', () => {
            rAvailable = false;
            console.log('R no está instalado o no está en el PATH');
            resolve(false);
        });
    });
}

// Endpoint para carga de series temporales
app.post('/api/upload-timeseries', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando serie temporal: ${originalname}`);

        if (!['.csv', '.txt'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Solo se permiten archivos CSV o TXT para series temporales' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const values = lines.map(line => {
            const value = parseFloat(line.trim().split(/[,;\t]/)[0]);
            return isNaN(value) ? null : value;
        }).filter(v => v !== null);

        fs.unlinkSync(filePath);

        if (values.length < 3) {
            return res.json({ success: false, error: 'Se requieren al menos 3 observaciones para análisis de series temporales' });
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

// Endpoint para análisis de series de tiempo
app.post('/api/timeseries-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, periodicidad, tipoAnalisis, tipoOutput } = req.body;
        
        if (!rAvailable) {
            return res.json({ 
                success: false, 
                error: 'R no está disponible. Por favor instala R y reinicia el servidor.' 
            });
        }
        
        let data;
        if (dataSource === 'sample') {
            data = null;
        } else {
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            data = session.data;
        }
        
        console.log(`Ejecutando análisis de series de tiempo: ${tipoAnalisis}, Output=${tipoOutput}`);
        
        const result = await executeTimeSeriesAnalysis(data, dataSource, periodicidad, tipoAnalisis, tipoOutput);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error en análisis de series de tiempo:', error);
        res.json({ success: false, error: error.message });
    }
});

// Función para ejecutar análisis de series de tiempo en R
async function executeTimeSeriesAnalysis(data, dataSource, periodicidad, tipoAnalisis, tipoOutput) {
    let rScript = `
# Cargar librerías necesarias
tryCatch({
    library(tseries)
    library(jsonlite)
    cat('Librerías cargadas exitosamente\\n')
}, error = function(e) {
    cat('ERROR_LOADING_LIBRARIES: ', e$message, '\\n')
    quit(status = 1)
})

# Preparar datos
`;
    
    if (dataSource === 'sample') {
        rScript += `
# Generar serie temporal de ejemplo
set.seed(123)
t <- 1:100
trend <- 0.5 * t
seasonal <- 10 * sin(2 * pi * t / 12)
noise <- rnorm(100, 0, 2)
ts_data <- trend + seasonal + noise
ts_obj <- ts(ts_data, frequency = c(1,2,4,12)[${periodicidad}])
`;
    } else {
        const tempFile = path.join(__dirname, `temp_ts_${Date.now()}.csv`);
        const csvContent = data.join('\n');
        fs.writeFileSync(tempFile, csvContent);
        
        rScript += `
ts_data <- read.csv('${tempFile.replace(/\\/g, '/')}', header=FALSE)[,1]
ts_obj <- ts(ts_data, frequency = c(1,2,4,12)[${periodicidad}])
`;
    }
    
    rScript += `
# Ejecutar análisis según tipo de salida
result <- list()

# Serie original para visualización
result$originalSeries <- list(
    time = 1:length(ts_obj),
    values = as.numeric(ts_obj)
)

if (${tipoOutput} == 2) {
    # Test ADF (Raíz Unitaria)
    tryCatch({
        adf_test <- adf.test(ts_obj)
        result$table <- list(
            headers = c('Estadístico', 'Valor'),
            rows = list(
                c('ADF Statistic', round(adf_test$statistic, 4)),
                c('p-value', round(adf_test$p.value, 4)),
                c('Lag Order', adf_test$parameter),
                c('Método', adf_test$method)
            )
        )
        cat('Test ADF completado\\n')
    }, error = function(e) {
        result$table <- list(
            headers = c('Error', 'Descripción'),
            rows = list(c('Error ADF', e$message))
        )
    })
} else {
    # Análisis básico
    result$table <- list(
        headers = c('Estadística', 'Valor'),
        rows = list(
            c('Número de observaciones', length(ts_obj)),
            c('Media', round(mean(ts_obj, na.rm=TRUE), 4)),
            c('Desviación estándar', round(sd(ts_obj, na.rm=TRUE), 4)),
            c('Mínimo', round(min(ts_obj, na.rm=TRUE), 4)),
            c('Máximo', round(max(ts_obj, na.rm=TRUE), 4))
        )
    )
}

# Convertir a JSON
cat('TIMESERIES_START\\n')
cat(toJSON(result, auto_unbox = TRUE, pretty = FALSE))
cat('\\nTIMESERIES_END\\n')
`;
    
    return new Promise((resolve, reject) => {
        const rProcess = spawn('Rscript', ['-e', rScript]);
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        rProcess.on('close', code => {
            console.log(`R process exited with code: ${code}`);
            console.log(`R output: ${output}`);
            
            if (code === 0) {
                try {
                    const startIndex = output.indexOf('TIMESERIES_START') + 'TIMESERIES_START'.length;
                    const endIndex = output.indexOf('TIMESERIES_END');
                    
                    if (startIndex === -1 || endIndex === -1) {
                        reject(new Error(`R output format error. Output: ${output}`));
                        return;
                    }
                    
                    const jsonStr = output.substring(startIndex, endIndex).trim();
                    const result = JSON.parse(jsonStr);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Error parsing R output: ${e.message}`));
                }
            } else {
                reject(new Error(`Error en R: ${error}`));
            }
        });
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT Server is running',
        rAvailable: rAvailable,
        timestamp: new Date().toISOString()
    });
});

// Inicializar servidor
async function startServer() {
    await checkRAvailability();
    
    app.listen(PORT, () => {
        console.log(`BERT Server ejecutándose en http://localhost:${PORT}`);
        console.log(`R disponible: ${rAvailable ? 'SÍ' : 'NO'}`);
        
        if (!rAvailable) {
            console.log('\n⚠️  ADVERTENCIA: R no está disponible');
            console.log('Para instalar R:');
            console.log('1. Descarga R desde: https://cran.r-project.org/bin/windows/base/');
            console.log('2. Instala R en C:\\Program Files\\R\\');
            console.log('3. Agrega C:\\Program Files\\R\\R-x.x.x\\bin al PATH');
            console.log('4. Reinicia esta terminal');
        }
    });
}

startServer();