const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
const PORT = 3002;

// Configuración específica para R 4.4.1
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

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }
});

const sessions = new Map();
let rAvailable = false;

// Verificar R 4.4.1 específicamente
async function checkRAvailability() {
    return new Promise((resolve) => {
        console.log(`Verificando R en: ${R_PATH}`);
        
        if (!fs.existsSync(R_PATH)) {
            console.log('❌ Rscript.exe no encontrado en la ruta especificada');
            rAvailable = false;
            resolve(false);
            return;
        }

        const rProcess = spawn(R_PATH, ['--version']);
        let output = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => output += data.toString());
        
        rProcess.on('close', (code) => {
            rAvailable = (code === 0);
            console.log(`✅ R 4.4.1 disponible: ${rAvailable ? 'SÍ' : 'NO'}`);
            if (rAvailable) {
                console.log(`Versión R: ${output.split('\n')[0]}`);
            }
            resolve(rAvailable);
        });
        
        rProcess.on('error', (error) => {
            console.log(`❌ Error ejecutando R: ${error.message}`);
            rAvailable = false;
            resolve(false);
        });
    });
}

// Instalar paquetes R necesarios
async function installRPackages() {
    if (!rAvailable) return false;
    
    console.log('📦 Instalando paquetes R necesarios...');
    
    const installScript = `
packages <- c('tseries', 'jsonlite')
for (pkg in packages) {
    if (!require(pkg, quietly = TRUE, character.only = TRUE)) {
        cat('Instalando:', pkg, '\\n')
        install.packages(pkg, repos='https://cloud.r-project.org', dependencies=TRUE, quiet=TRUE)
        if (require(pkg, quietly = TRUE, character.only = TRUE)) {
            cat('✅ Instalado:', pkg, '\\n')
        } else {
            cat('❌ Error instalando:', pkg, '\\n')
        }
    } else {
        cat('✅ Disponible:', pkg, '\\n')
    }
}
`;

    return new Promise((resolve) => {
        const rProcess = spawn(R_PATH, ['-e', installScript]);
        let output = '';
        
        rProcess.stdout.on('data', data => {
            const text = data.toString();
            output += text;
            console.log(text.trim());
        });
        
        rProcess.on('close', (code) => {
            console.log(`Instalación de paquetes completada (código: ${code})`);
            resolve(code === 0);
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
        
        console.log(`📁 Procesando serie temporal: ${originalname}`);

        if (!['.csv', '.txt'].includes(fileExt)) {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Solo se permiten archivos CSV o TXT' });
        }

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
            fileType: 'timeseries',
            uploadTime: new Date()
        });

        console.log(`✅ Datos cargados: ${values.length} observaciones`);

        res.json({
            success: true,
            sessionId,
            fileName: originalname,
            total: values.length,
            preview: values.slice(0, 20)
        });

    } catch (error) {
        console.error('❌ Error procesando archivo:', error);
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
                error: 'R no está disponible. Verifica la instalación en C:\\Program Files\\R\\R-4.4.1' 
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
        
        console.log(`🔬 Ejecutando análisis: Tipo=${tipoOutput}, Periodicidad=${periodicidad}`);
        
        const result = await executeTimeSeriesAnalysis(data, dataSource, periodicidad, tipoOutput);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error en análisis:', error);
        res.json({ success: false, error: error.message });
    }
});

// Función optimizada para ejecutar análisis con R 4.4.1
async function executeTimeSeriesAnalysis(data, dataSource, periodicidad, tipoOutput) {
    let rScript = `
# Configuración inicial
options(warn=-1)  # Suprimir warnings
cat('🔬 Iniciando análisis de series temporales\\n')

# Cargar librerías
tryCatch({
    library(tseries, quietly=TRUE)
    library(jsonlite, quietly=TRUE)
    cat('✅ Librerías cargadas\\n')
}, error = function(e) {
    cat('❌ ERROR_LIBRARIES:', e$message, '\\n')
    quit(status = 1)
})

# Preparar datos
`;
    
    if (dataSource === 'sample') {
        rScript += `
set.seed(123)
ts_data <- c(10, 12, 13, 12, 15, 16, 18, 17, 19, 20, 22, 21, 23, 25, 24, 26, 28, 27, 29, 30)
ts_obj <- ts(ts_data, frequency = c(1,2,4,12)[${periodicidad}])
cat('✅ Datos de ejemplo generados\\n')
`;
    } else {
        const tempFile = path.join(__dirname, `temp_ts_${Date.now()}.csv`);
        const csvContent = data.join('\n');
        fs.writeFileSync(tempFile, csvContent);
        
        rScript += `
tryCatch({
    ts_data <- read.csv('${tempFile.replace(/\\/g, '/')}', header=FALSE)[,1]
    ts_obj <- ts(ts_data, frequency = c(1,2,4,12)[${periodicidad}])
    cat('✅ Datos de usuario cargados:', length(ts_obj), 'observaciones\\n')
}, error = function(e) {
    cat('❌ ERROR_DATA:', e$message, '\\n')
    quit(status = 1)
})
`;
    }
    
    rScript += `
# Análisis según tipo
result <- list()
result$originalSeries <- list(
    time = 1:length(ts_obj),
    values = as.numeric(ts_obj)
)

if (${tipoOutput} == 2) {
    # Test ADF
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
        cat('✅ Test ADF completado\\n')
    }, error = function(e) {
        result$table <- list(
            headers = c('Error', 'Descripción'),
            rows = list(c('Error ADF', e$message))
        )
        cat('❌ Error en ADF:', e$message, '\\n')
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
    cat('✅ Estadísticas básicas completadas\\n')
}

# Salida JSON
cat('TIMESERIES_START\\n')
cat(toJSON(result, auto_unbox = TRUE, pretty = FALSE))
cat('\\nTIMESERIES_END\\n')
`;
    
    return new Promise((resolve, reject) => {
        const rProcess = spawn(R_PATH, ['-e', rScript]);
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => {
            const text = data.toString();
            output += text;
            console.log(text.trim());
        });
        
        rProcess.stderr.on('data', data => {
            error += data.toString();
        });
        
        rProcess.on('close', code => {
            console.log(`🔬 Proceso R finalizado (código: ${code})`);
            
            if (code === 0) {
                try {
                    const startIndex = output.indexOf('TIMESERIES_START') + 'TIMESERIES_START'.length;
                    const endIndex = output.indexOf('TIMESERIES_END');
                    
                    if (startIndex > 15 && endIndex > startIndex) {
                        const jsonStr = output.substring(startIndex, endIndex).trim();
                        const result = JSON.parse(jsonStr);
                        console.log('✅ Análisis completado exitosamente');
                        resolve(result);
                    } else {
                        reject(new Error('Formato de salida R inválido'));
                    }
                } catch (e) {
                    reject(new Error(`Error parsing JSON: ${e.message}`));
                }
            } else {
                reject(new Error(`Error en R (código ${code}): ${error}`));
            }
        });
    });
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT Server R 4.4.1',
        rAvailable: rAvailable,
        rPath: R_PATH,
        timestamp: new Date().toISOString()
    });
});

// Inicializar servidor
async function startServer() {
    console.log('🚀 Iniciando BERT Server con R 4.4.1...');
    
    await checkRAvailability();
    
    if (rAvailable) {
        await installRPackages();
    }
    
    app.listen(PORT, () => {
        console.log(`\n🌐 BERT Server ejecutándose en http://localhost:${PORT}`);
        console.log(`📊 Series de Tiempo: bert-series-tiempo.html`);
        console.log(`🔧 R 4.4.1: ${rAvailable ? '✅ DISPONIBLE' : '❌ NO DISPONIBLE'}`);
        
        if (!rAvailable) {
            console.log('\n⚠️  Para habilitar R:');
            console.log('1. Ejecuta: configure-r-path.bat');
            console.log('2. Reinicia esta terminal');
        }
        console.log('\n');
    });
}

startServer();