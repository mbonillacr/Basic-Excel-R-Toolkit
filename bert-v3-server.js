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
const jobs = new Map();

// RF1.1 & RF1.2: Carga y previsualización de datos
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
        let encoding = 'utf8';

        // Procesar según tipo de archivo
        if (fileExt === '.xlsx' || fileExt === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        } else {
            // CSV/TXT - Auto-detectar separador y encoding
            const content = fs.readFileSync(filePath, encoding);
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
            preview: preview,
            encoding: encoding
        });

    } catch (error) {
        console.error('Error procesando archivo de datos:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// RF2.1 & RF2.2: Carga y parsing de scripts R
app.post('/api/upload-script', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }

        const { originalname, path: filePath } = req.file;
        const fileExt = path.extname(originalname).toLowerCase();
        
        console.log(`Procesando script R: ${originalname}`);

        // Validar extensión .R
        if (fileExt !== '.r') {
            fs.unlinkSync(filePath);
            return res.json({ success: false, error: 'Solo se permiten archivos .R' });
        }

        // Leer contenido del script
        const scriptContent = fs.readFileSync(filePath, 'utf8');
        fs.unlinkSync(filePath);

        // Parsing básico de funciones y librerías
        const functions = [];
        const libraries = [];

        // Detectar funciones: nombre <- function(...)
        const functionRegex = /(\w+)\s*<-\s*function\s*\(/g;
        let match;
        while ((match = functionRegex.exec(scriptContent)) !== null) {
            functions.push(match[1]);
        }

        // Detectar librerías: library(...) o require(...)
        const libraryRegex = /(?:library|require)\s*\(\s*['"]*(\w+)['"]*\s*\)/g;
        while ((match = libraryRegex.exec(scriptContent)) !== null) {
            if (!libraries.includes(match[1])) {
                libraries.push(match[1]);
            }
        }

        // Almacenar script en sesión
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
        console.error('Error procesando script R:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.json({ success: false, error: error.message });
    }
});

// RF3.2: Ejecución asíncrona con job_id
app.post('/api/run-analysis', (req, res) => {
    try {
        const { dataSessionId, scriptSessionId, functionName, parameters } = req.body;

        // Validar sesiones
        const dataSession = sessions.get(dataSessionId);
        const scriptSession = sessions.get(scriptSessionId);

        if (!dataSession || !scriptSession) {
            return res.json({ success: false, error: 'Sesiones inválidas o expiradas' });
        }

        // Crear job
        const jobId = uuidv4();
        jobs.set(jobId, {
            status: 'queued',
            dataSessionId,
            scriptSessionId,
            functionName,
            parameters,
            createdAt: new Date(),
            progress: 0
        });

        // Simular procesamiento asíncrono
        setTimeout(() => processAnalysis(jobId), 100);

        res.json({
            success: true,
            jobId: jobId,
            status: 'queued',
            message: 'Análisis encolado para procesamiento'
        });

    } catch (error) {
        console.error('Error iniciando análisis:', error);
        res.json({ success: false, error: error.message });
    }
});

// RF3.2: Consultar estado del job
app.get('/api/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.json({ success: false, error: 'Job no encontrado' });
    }

    res.json({
        success: true,
        jobId: jobId,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
    });
});

// RF2.3: Función para procesar análisis con R real
async function processAnalysis(jobId) {
    const job = jobs.get(jobId);
    if (!job) return;

    try {
        job.status = 'running';
        job.progress = 10;

        const dataSession = sessions.get(job.dataSessionId);
        const scriptSession = sessions.get(job.scriptSessionId);

        // Paso 1: Instalar dependencias
        job.progress = 20;
        await installRDependencies(scriptSession.libraries, job);

        // Paso 2: Preparar datos
        job.progress = 40;
        const dataFile = await prepareDataForR(dataSession.data, job);

        // Paso 3: Ejecutar análisis R
        job.progress = 60;
        const result = await executeRAnalysis(scriptSession.script, dataFile, job.functionName, job.parameters, job);

        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        job.result = result;

        // Limpiar archivos temporales
        if (dataFile) fs.unlinkSync(dataFile);

    } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        console.error(`Job ${jobId} failed:`, error);
    }
}

// RF2.3: Instalar dependencias R automáticamente
async function installRDependencies(libraries, job) {
    if (!libraries || libraries.length === 0) return;

    const { spawn } = require('child_process');
    
    for (const lib of libraries) {
        job.progress += 2;
        console.log(`Verificando librería R: ${lib}`);
        
        const installScript = `
if (!require(${lib}, quietly = TRUE)) {
    install.packages('${lib}', repos='https://cran.r-project.org', dependencies=TRUE)
    library(${lib})
    cat('INSTALLED: ${lib}\\n')
} else {
    cat('AVAILABLE: ${lib}\\n')
}
`;
        
        await new Promise((resolve, reject) => {
            const rProcess = spawn('Rscript', ['-e', installScript]);
            let output = '';
            let error = '';
            
            rProcess.stdout.on('data', data => output += data.toString());
            rProcess.stderr.on('data', data => error += data.toString());
            
            rProcess.on('close', code => {
                if (code === 0) {
                    console.log(`Librería ${lib}: ${output.includes('INSTALLED') ? 'instalada' : 'disponible'}`);
                    resolve();
                } else {
                    console.error(`Error con librería ${lib}:`, error);
                    reject(new Error(`Error instalando ${lib}: ${error}`));
                }
            });
        });
    }
}

// Preparar datos para R
async function prepareDataForR(data, job) {
    const tempFile = path.join(__dirname, `temp_data_${job.dataSessionId}.csv`);
    
    // Convertir datos a CSV
    const csvContent = data.map(row => row.join(',')).join('\n');
    fs.writeFileSync(tempFile, csvContent);
    
    return tempFile;
}

// RF3.3 & RF3.4: Ejecutar análisis R con captura de salida
async function executeRAnalysis(script, dataFile, functionName, parameters, job) {
    const { spawn } = require('child_process');
    
    // Crear script R completo
    const fullScript = `
# Cargar script del usuario
${script}

# Cargar datos
data <- read.csv('${dataFile.replace(/\\/g, '/')}')

# Ejecutar función
if (exists('${functionName}')) {
    result <- ${functionName}(data${parameters ? ', ' + parameters : ''})
    
    # Detectar tipo de salida
    if (inherits(result, 'ggplot')) {
        # Gráfico ggplot
        ggsave('temp_plot.png', result, width=10, height=6)
        cat('PLOT_SAVED: temp_plot.png\\n')
    } else if (is.data.frame(result) || is.matrix(result)) {
        # Tabla de datos
        if (nrow(result) > 0) {
            # Intentar generar tabla HTML con stargazer si está disponible
            if (require(stargazer, quietly = TRUE)) {
                html_table <- stargazer(result, type='html', summary=FALSE)
                cat('STARGAZER_START\\n')
                cat(html_table)
                cat('\\nSTARGAZER_END\\n')
            } else {
                print(result)
            }
        } else {
            print(result)
        }
    } else {
        # Salida de texto normal
        print(result)
    }
} else {
    cat('ERROR: Función', '${functionName}', 'no encontrada\\n')
}
`;
    
    return new Promise((resolve, reject) => {
        const rProcess = spawn('Rscript', ['-e', fullScript]);
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        rProcess.on('close', code => {
            if (code === 0) {
                // Procesar salida
                const result = processROutput(output);
                resolve(result);
            } else {
                reject(new Error(`Error en R: ${error}`));
            }
        });
    });
}

// RF3.3 & RF3.4: Procesar salida de R (texto, STARGAZER, gráficos Plotly)
function processROutput(output) {
    const result = {
        type: 'text',
        output: output,
        executionTime: new Date().toISOString()
    };
    
    // RF3.4: Detectar gráfico Plotly JSON
    if (output.includes('PLOTLY_START') && output.includes('PLOTLY_END')) {
        const startIndex = output.indexOf('PLOTLY_START') + 'PLOTLY_START'.length;
        const endIndex = output.indexOf('PLOTLY_END');
        const plotlyJson = output.substring(startIndex, endIndex).trim();
        
        try {
            result.type = 'plotly';
            result.plotlyData = JSON.parse(plotlyJson);
            result.output = 'Gráfico interactivo generado';
        } catch (e) {
            console.error('Error parsing Plotly JSON:', e);
            result.output = 'Error procesando gráfico Plotly';
        }
    }
    // RF3.3: Detectar tabla STARGAZER
    else if (output.includes('STARGAZER_START') && output.includes('STARGAZER_END')) {
        const startIndex = output.indexOf('STARGAZER_START') + 'STARGAZER_START'.length;
        const endIndex = output.indexOf('STARGAZER_END');
        const htmlTable = output.substring(startIndex, endIndex).trim();
        
        result.type = 'stargazer';
        result.html = htmlTable;
        result.output = 'Tabla generada con Stargazer';
    }
    // Detectar gráfico guardado (fallback)
    else if (output.includes('PLOT_SAVED:')) {
        result.type = 'plot';
        result.plotFile = 'temp_plot.png';
    }
    
    return result;
}

// Limpiar sesiones expiradas (cada 1 hora)
setInterval(() => {
    const now = new Date();
    const expireTime = 60 * 60 * 1000; // 1 hora

    for (const [id, session] of sessions.entries()) {
        if (now - session.uploadTime > expireTime) {
            sessions.delete(id);
            console.log(`Sesión expirada eliminada: ${id}`);
        }
    }

    for (const [id, job] of jobs.entries()) {
        if (now - job.createdAt > expireTime) {
            jobs.delete(id);
            console.log(`Job expirado eliminado: ${id}`);
        }
    }
}, 60 * 60 * 1000);

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

// Endpoint para análisis de series de tiempo
app.post('/api/timeseries-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, periodicidad, tipoAnalisis, tipoOutput } = req.body;
        
        let data;
        if (dataSource === 'sample') {
            // Generar serie temporal de ejemplo
            data = null; // R generará datos de ejemplo
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

// Endpoint para análisis K-Means + PCA
app.post('/api/kmeans-pca-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, k, pcaComponents, algorithm, seed } = req.body;
        
        let data;
        if (dataSource === 'iris') {
            // Usar dataset IRIS integrado
            data = null; // R cargará iris automáticamente
        } else {
            // Usar datos cargados por usuario
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            data = session.data;
        }
        
        console.log(`Ejecutando K-Means + PCA: ${dataSource}, K=${k}, PCA=${pcaComponents}`);
        
        const result = await executeKMeansPCA(data, dataSource, k, pcaComponents, algorithm, seed);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error en K-Means + PCA:', error);
        res.json({ success: false, error: error.message });
    }
});

// Función para ejecutar análisis de series de tiempo en R
async function executeTimeSeriesAnalysis(data, dataSource, periodicidad, tipoAnalisis, tipoOutput) {
    const { spawn } = require('child_process');
    
    let rScript = `
# Cargar librerías necesarias
library(tseries)
library(jsonlite)

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
        // Preparar datos de usuario
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

# Análisis específico
if (${tipoOutput} == 2) {
    # Test ADF (Raíz Unitaria)
    adf_test <- adf.test(ts_obj)
    result$analysisChart <- list(
        traces = list(list(
            x = 1:length(ts_obj),
            y = as.numeric(ts_obj),
            mode = 'lines',
            type = 'scatter',
            name = 'Serie Original'
        )),
        layout = list(
            title = list(text = 'Test ADF - Raíz Unitaria'),
            paper_bgcolor = '#161b22',
            plot_bgcolor = '#0d1117',
            font = list(color = '#c9d1d9'),
            xaxis = list(title = 'Tiempo', gridcolor = '#30363d'),
            yaxis = list(title = 'Valor', gridcolor = '#30363d')
        )
    )
    result$table <- list(
        headers = c('Estadístico', 'Valor'),
        rows = list(
            c('ADF Statistic', round(adf_test$statistic, 4)),
            c('p-value', round(adf_test$p.value, 4)),
            c('Lag Order', adf_test$parameter),
            c('Método', adf_test$method)
        )
    )
} else if (${tipoOutput} == 5) {
    # Autocorrelación
    acf_result <- acf(ts_obj, plot = FALSE)
    pacf_result <- pacf(ts_obj, plot = FALSE)
    
    result$analysisChart <- list(
        traces = list(
            list(
                x = 1:length(acf_result$acf),
                y = as.numeric(acf_result$acf),
                mode = 'lines+markers',
                type = 'scatter',
                name = 'ACF'
            ),
            list(
                x = 1:length(pacf_result$acf),
                y = as.numeric(pacf_result$acf),
                mode = 'lines+markers',
                type = 'scatter',
                name = 'PACF'
            )
        ),
        layout = list(
            title = list(text = 'Funciones de Autocorrelación'),
            paper_bgcolor = '#161b22',
            plot_bgcolor = '#0d1117',
            font = list(color = '#c9d1d9'),
            xaxis = list(title = 'Lag', gridcolor = '#30363d'),
            yaxis = list(title = 'Correlación', gridcolor = '#30363d')
        )
    )
    
    # Tabla de autocorrelaciones
    max_lags <- min(20, length(acf_result$acf))
    acf_table <- data.frame(
        Lag = 0:(max_lags-1),
        ACF = round(as.numeric(acf_result$acf[1:max_lags]), 4),
        PACF = c(NA, round(as.numeric(pacf_result$acf[1:(max_lags-1)]), 4))
    )
    
    result$table <- list(
        headers = c('Lag', 'ACF', 'PACF'),
        rows = lapply(1:nrow(acf_table), function(i) {
            c(acf_table$Lag[i], acf_table$ACF[i], 
              if(is.na(acf_table$PACF[i])) '-' else acf_table$PACF[i])
        })
    )
} else if (${tipoOutput} == 6) {
    # Descomposición aditiva
    decomp <- decompose(ts_obj, type = 'additive')
    
    result$analysisChart <- list(
        traces = list(
            list(
                x = 1:length(decomp$trend),
                y = as.numeric(decomp$trend),
                mode = 'lines',
                type = 'scatter',
                name = 'Tendencia'
            ),
            list(
                x = 1:length(decomp$seasonal),
                y = as.numeric(decomp$seasonal),
                mode = 'lines',
                type = 'scatter',
                name = 'Estacional'
            ),
            list(
                x = 1:length(decomp$random),
                y = as.numeric(decomp$random),
                mode = 'lines',
                type = 'scatter',
                name = 'Residuos'
            )
        ),
        layout = list(
            title = list(text = 'Descomposición Aditiva'),
            paper_bgcolor = '#161b22',
            plot_bgcolor = '#0d1117',
            font = list(color = '#c9d1d9'),
            xaxis = list(title = 'Tiempo', gridcolor = '#30363d'),
            yaxis = list(title = 'Valor', gridcolor = '#30363d')
        )
    )
    
    # Tabla de componentes
    decomp_table <- data.frame(
        Tiempo = 1:length(ts_obj),
        Original = as.numeric(ts_obj),
        Tendencia = as.numeric(decomp$trend),
        Estacional = as.numeric(decomp$seasonal),
        Residuos = as.numeric(decomp$random)
    )
    
    result$table <- list(
        headers = c('Tiempo', 'Original', 'Tendencia', 'Estacional', 'Residuos'),
        rows = lapply(1:nrow(decomp_table), function(i) {
            c(decomp_table$Tiempo[i], 
              round(decomp_table$Original[i], 3),
              if(is.na(decomp_table$Tendencia[i])) '-' else round(decomp_table$Tendencia[i], 3),
              round(decomp_table$Estacional[i], 3),
              if(is.na(decomp_table$Residuos[i])) '-' else round(decomp_table$Residuos[i], 3))
        })
    )
} else {
    # Análisis por defecto
    result$analysisChart <- list(
        traces = list(list(
            x = 1:length(ts_obj),
            y = as.numeric(ts_obj),
            mode = 'lines',
            type = 'scatter',
            name = 'Serie Temporal'
        )),
        layout = list(
            title = list(text = 'Serie Temporal'),
            paper_bgcolor = '#161b22',
            plot_bgcolor = '#0d1117',
            font = list(color = '#c9d1d9'),
            xaxis = list(title = 'Tiempo', gridcolor = '#30363d'),
            yaxis = list(title = 'Valor', gridcolor = '#30363d')
        )
    )
    
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
            if (code === 0) {
                try {
                    const startIndex = output.indexOf('TIMESERIES_START') + 'TIMESERIES_START'.length;
                    const endIndex = output.indexOf('TIMESERIES_END');
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

// Función para ejecutar K-Means + PCA en R
async function executeKMeansPCA(data, dataSource, k, pcaComponents, algorithm, seed) {
    const { spawn } = require('child_process');
    
    let rScript = `
# Cargar librerías necesarias
library(cluster)
library(factoextra)
library(jsonlite)

set.seed(${seed})

# Cargar datos
`;
    
    if (dataSource === 'iris') {
        rScript += `
data(iris)
df <- iris[,1:4]  # Solo variables numéricas
labels <- paste0('Obs_', 1:nrow(df))
`;
    } else {
        // Preparar datos de usuario
        const tempFile = path.join(__dirname, `temp_kmeans_${Date.now()}.csv`);
        const csvContent = data.map(row => row.join(',')).join('\n');
        fs.writeFileSync(tempFile, csvContent);
        
        rScript += `
df <- read.csv('${tempFile.replace(/\\/g, '/')}')
# Seleccionar solo columnas numéricas
numeric_cols <- sapply(df, is.numeric)
df <- df[, numeric_cols]
if(ncol(df) < 2) stop('Se requieren al menos 2 variables numéricas')
labels <- paste0('Obs_', 1:nrow(df))
`;
    }
    
    rScript += `
# Escalar datos
df_scaled <- scale(df)

# K-Means
kmeans_result <- kmeans(df_scaled, centers = ${k}, algorithm = '${algorithm}')

# PCA
pca_result <- prcomp(df_scaled, center = FALSE, scale. = FALSE)

# Preparar datos para visualización
kmeans_data <- list(
    x = pca_result$x[,1],
    y = pca_result$x[,2],
    clusters = kmeans_result$cluster,
    labels = labels
)

if(${pcaComponents} == 3 && ncol(pca_result$x) >= 3) {
    kmeans_data$z <- pca_result$x[,3]
}

# PCA loadings y varianza explicada
loadings_data <- list(
    x = pca_result$rotation[,1] * 3,  # Escalar para visualización
    y = pca_result$rotation[,2] * 3,
    labels = rownames(pca_result$rotation)
)

variance_explained <- summary(pca_result)$importance[2,] * 100

# Resultado final
result <- list(
    k = ${k},
    pcaComponents = ${pcaComponents},
    kmeans = kmeans_data,
    pca = list(
        scores = list(
            x = pca_result$x[,1],
            y = pca_result$x[,2]
        ),
        loadings = loadings_data,
        variance = list(
            pc1 = round(variance_explained[1], 1),
            pc2 = round(variance_explained[2], 1),
            total = round(variance_explained[1] + variance_explained[2], 1)
        )
    )
)

# Convertir a JSON
cat('KMEANS_PCA_START\\n')
cat(toJSON(result, auto_unbox = TRUE, pretty = FALSE))
cat('\\nKMEANS_PCA_END\\n')
`;
    
    return new Promise((resolve, reject) => {
        const rProcess = spawn('Rscript', ['-e', rScript]);
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        rProcess.on('close', code => {
            if (code === 0) {
                try {
                    // Extraer JSON del output
                    const startIndex = output.indexOf('KMEANS_PCA_START') + 'KMEANS_PCA_START'.length;
                    const endIndex = output.indexOf('KMEANS_PCA_END');
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

// Endpoint para análisis K-Means avanzado
app.post('/api/kmeans-advanced-analysis', async (req, res) => {
    try {
        const { dataSource, sessionId, k, kOptimo, algorithm, escala, seed, tipoOutput } = req.body;
        
        let data;
        if (dataSource === 'iris') {
            data = null;
        } else {
            const session = sessions.get(sessionId);
            if (!session) {
                return res.json({ success: false, error: 'Sesión de datos no encontrada' });
            }
            data = session.data;
        }
        
        console.log(`Ejecutando K-Means avanzado: ${dataSource}, K=${k}, Output=${tipoOutput}`);
        
        const result = await executeAdvancedKMeans(data, dataSource, k, kOptimo, algorithm, escala, seed, tipoOutput);
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error en K-Means avanzado:', error);
        res.json({ success: false, error: error.message });
    }
});

// Función para ejecutar K-Means avanzado
async function executeAdvancedKMeans(data, dataSource, k, kOptimo, algorithm, escala, seed, tipoOutput) {
    const { spawn } = require('child_process');
    
    let rScript = `
# Cargar librerías con manejo de errores
tryCatch({
    library(cluster)
    library(jsonlite)
}, error = function(e) {
    cat('ERROR_LOADING_LIBRARIES: ', e$message, '\\n')
    quit(status = 1)
})

set.seed(${seed})
`;
    
    if (dataSource === 'iris') {
        rScript += `
# Cargar datos IRIS
tryCatch({
    data(iris)
    df <- iris[,1:4]
    cat('IRIS data loaded successfully\\n')
}, error = function(e) {
    cat('ERROR_LOADING_IRIS: ', e$message, '\\n')
    quit(status = 1)
})
`;
    } else {
        const tempFile = path.join(__dirname, `temp_kmeans_adv_${Date.now()}.csv`);
        const csvContent = data.map(row => row.join(',')).join('\n');
        fs.writeFileSync(tempFile, csvContent);
        
        rScript += `
# Cargar datos de usuario
tryCatch({
    df <- read.csv('${tempFile.replace(/\\/g, '/')}')
    numeric_cols <- sapply(df, is.numeric)
    df <- df[, numeric_cols]
    if(ncol(df) < 2) stop('Se requieren al menos 2 variables numéricas')
    cat('User data loaded successfully\\n')
}, error = function(e) {
    cat('ERROR_LOADING_DATA: ', e$message, '\\n')
    quit(status = 1)
})
`;
    }
    
    rScript += `
# Procesar datos
tryCatch({
    if (${escala} == 1) {
        df_scaled <- scale(df)
        cat('Data scaled successfully\\n')
    } else {
        df_scaled <- as.matrix(df)
        cat('Data used without scaling\\n')
    }
    
    algorithms <- c('Hartigan-Wong', 'Lloyd', 'Forgy', 'MacQueen')
    selected_algorithm <- algorithms[${algorithm}]
    cat('Algorithm selected: ', selected_algorithm, '\\n')
    
    result <- list()
    
    if (${tipoOutput} == 1) {
        # Clustering normal
        kmeans_result <- kmeans(df_scaled, centers = ${k}, algorithm = selected_algorithm, nstart = 25)
        pca_result <- prcomp(df_scaled, center = TRUE, scale. = TRUE)
        
        result$k <- ${k}
        result$visualization <- list(
            x = as.numeric(pca_result$x[,1]),
            y = as.numeric(pca_result$x[,2]),
            clusters = as.numeric(kmeans_result$cluster),
            labels = paste0('Obs_', 1:nrow(df))
        )
        
        result$table <- list(
            headers = c('Observación', 'Cluster_Asignado'),
            rows = lapply(1:length(kmeans_result$cluster), function(i) {
                c(paste0('Obs_', i), as.character(kmeans_result$cluster[i]))
            })
        )
        
    } else if (${tipoOutput} == 7) {
        # Método del codo
        wss <- numeric(${kOptimo})
        for (i in 1:${kOptimo}) {
            kmeans_temp <- kmeans(df_scaled, centers = i, algorithm = selected_algorithm, nstart = 10)
            wss[i] <- kmeans_temp$tot.withinss
        }
        
        result$k_values <- 1:${kOptimo}
        result$within_ss <- as.numeric(wss)
        
        result$table <- list(
            headers = c('K', 'Varianza_Intra_Cluster'),
            rows = lapply(1:${kOptimo}, function(i) {
                c(as.character(i), as.character(round(wss[i], 2)))
            })
        )
    }
    
    cat('KMEANS_ADV_START\\n')
    cat(toJSON(result, auto_unbox = TRUE, pretty = FALSE))
    cat('\\nKMEANS_ADV_END\\n')
    
}, error = function(e) {
    cat('ERROR_PROCESSING: ', e$message, '\\n')
    quit(status = 1)
})
`;
    
    return new Promise((resolve, reject) => {
        const rProcess = spawn('Rscript', ['-e', rScript]);
        let output = '';
        let error = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.stderr.on('data', data => error += data.toString());
        
        rProcess.on('close', code => {
            console.log(`R process exited with code: ${code}`);
            console.log(`R stdout: ${output}`);
            console.log(`R stderr: ${error}`);
            
            if (code === 0) {
                try {
                    const startIndex = output.indexOf('KMEANS_ADV_START');
                    const endIndex = output.indexOf('KMEANS_ADV_END');
                    
                    if (startIndex === -1 || endIndex === -1) {
                        reject(new Error(`R output format error. Output: ${output}`));
                        return;
                    }
                    
                    const jsonStr = output.substring(startIndex + 'KMEANS_ADV_START'.length, endIndex).trim();
                    
                    if (!jsonStr) {
                        reject(new Error(`Empty JSON from R. Full output: ${output}`));
                        return;
                    }
                    
                    const result = JSON.parse(jsonStr);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Error parsing R output: ${e.message}. Output: ${output}`));
                }
            } else {
                reject(new Error(`R process failed (code ${code}): ${error}. Output: ${output}`));
            }
        });
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BERT v3.0 Server is running',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/upload-data',
            '/api/upload-script', 
            '/api/run-analysis',
            '/api/upload-timeseries',
            '/api/timeseries-analysis',
            '/api/kmeans-pca-analysis',
            '/api/kmeans-advanced-analysis'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`BERT v3.0 Server ejecutándose en http://localhost:${PORT}`);
    console.log('Interfaz principal: bert-v3-main.html');
    console.log('K-Means + PCA: kmeans-pca-viz-v2.html');
    console.log('Series de Tiempo: series-tiempo-viz.html');
    console.log('Funcionalidades: Carga de datos, Scripts R, Ejecución asíncrona, K-Means + PCA');
});