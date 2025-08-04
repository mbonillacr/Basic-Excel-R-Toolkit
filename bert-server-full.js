const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = 3001;

// Configurar CORS
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

// Configurar multer para archivos
const upload = multer({ dest: 'uploads/' });

// Función ST_SeriesTemporales
app.post('/api/series-tiempo', (req, res) => {
    const { datos, periodicidad = 1, tipoOutput = 0 } = req.body;
    
    if (!datos || datos.length === 0) {
        return res.json({ success: false, error: 'Datos requeridos' });
    }
    
    const rCode = `
# Instalar y cargar librerías necesarias
if (!require(tseries)) {
    install.packages('tseries', repos='https://cran.r-project.org')
    library(tseries)
}
if (!require(forecast)) {
    install.packages('forecast', repos='https://cran.r-project.org')
    library(forecast)
}

ST_SeriesTemporales <- function(SetDatosX, Periodicidad=1, TipoOutPut=0) {
    pPeriodicidad <- c(1,2,3,4,12)
    DatosX <- na.omit(as.numeric(SetDatosX))  
    DatosXts <- ts(DatosX, frequency=pPeriodicidad[Periodicidad])
    
    if (TipoOutPut==0) {
        OutPut <- "Lista de funciones: 1-Cointegración, 2-Raíz Unitaria, 3-Phillips-Perron, 4-Jarque-Bera, 5-Autocorrelación, 6-Aditivo, 7-Multiplicativo"
    } else if (TipoOutPut==1) {
        if(length(DatosX) < 2) {
            OutPut <- "Este test requiere al menos dos variables"
        } else {
            tryCatch({
                a <- tseries::po.test(DatosXts)
                OutPut <- capture.output(a)
            }, error = function(e) {
                OutPut <- paste("Error en cointegración:", e$message)
            })
        }
    } else if (TipoOutPut==2) {
        tryCatch({
            a <- tseries::adf.test(DatosXts)
            OutPut <- capture.output(a)
        }, error = function(e) {
            OutPut <- paste("Error en ADF:", e$message)
        })
    } else if (TipoOutPut==3) {
        tryCatch({
            a <- tseries::pp.test(DatosXts)
            OutPut <- capture.output(a)
        }, error = function(e) {
            OutPut <- paste("Error en Phillips-Perron:", e$message)
        })
    } else if (TipoOutPut==4) {
        tryCatch({
            a <- tseries::jarque.bera.test(DatosXts)
            OutPut <- capture.output(a)
        }, error = function(e) {
            OutPut <- paste("Error en Jarque-Bera:", e$message)
        })
    } else if (TipoOutPut==5) {
        tryCatch({
            b <- acf(DatosXts, pl=FALSE)
            c <- pacf(DatosXts, pl=FALSE)
            n <- b$n.used
            h <- (-1/n) + c(-2, 2)/sqrt(n)
            OutPut <- cbind(
                "AutoCorrelogramaTotal"=b$acf,
                "AutoCorrelogramaParcial"=c$acf,
                "LIM_inf"=h[1],
                "LIM_sup"=h[2]
            )
        }, error = function(e) {
            OutPut <- paste("Error en autocorrelación:", e$message)
        })
    } else if (TipoOutPut==6) {
        tryCatch({
            Modelo <- decompose(DatosXts, type="additive")
            OutPut <- cbind(Modelo$trend, Modelo$seasonal, Modelo$random)
        }, error = function(e) {
            OutPut <- paste("Error en descomposición aditiva:", e$message)
        })
    } else if (TipoOutPut==7) {
        tryCatch({
            Modelo <- decompose(DatosXts, type="multiplicative")
            OutPut <- cbind(Modelo$trend, Modelo$seasonal, Modelo$random)
        }, error = function(e) {
            OutPut <- paste("Error en descomposición multiplicativa:", e$message)
        })
    }
    
    return(OutPut)
}

# Ejecutar función
datos <- c(${datos.join(', ')})
cat('Datos recibidos:', length(datos), 'observaciones\n')
resultado <- ST_SeriesTemporales(datos, ${periodicidad}, ${tipoOutput})
print(resultado)
`;

    executeR(rCode, res);
});

// Función para cargar funciones R personalizadas
app.post('/api/load-functions', (req, res) => {
    const { code } = req.body;
    
    const tempFile = path.join(__dirname, 'temp_functions.R');
    fs.writeFileSync(tempFile, code);
    
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
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        
        if (code === 0 && output.trim()) {
            const functions = output.trim().split(',').filter(f => f.length > 0);
            res.json({ success: true, functions });
        } else {
            res.json({ success: false, error: error || 'Error desconocido al cargar funciones' });
        }
    });
});

// Ejecutar función específica
app.post('/api/execute-function', (req, res) => {
    const { functionName, params, rEnvironment } = req.body;
    
    let rCode = (rEnvironment || '') + '\n';
    
    if (params && params.trim()) {
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

// Endpoint para cargar archivos (XLSX, CSV, TXT)
app.post('/api/upload-file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, error: 'No se recibió archivo' });
        }
        
        console.log('Procesando archivo:', req.file.originalname);
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        let data = [];
        
        if (fileExt === '.xlsx' || fileExt === '.xls') {
            // Procesar Excel
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        } else if (fileExt === '.csv') {
            // Procesar CSV
            const csvContent = fs.readFileSync(req.file.path, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());
            data = lines.map(line => line.split(',').map(cell => cell.trim()));
        } else if (fileExt === '.txt') {
            // Procesar TXT
            const txtContent = fs.readFileSync(req.file.path, 'utf8');
            const lines = txtContent.split('\n').filter(line => line.trim());
            data = lines.map(line => [line.trim()]);
        } else {
            return res.json({ success: false, error: 'Formato no soportado. Use XLSX, CSV o TXT' });
        }
        
        console.log('Datos raw del archivo:', data.slice(0, 5));
        
        // Extraer valores numéricos (saltando headers si existen)
        const numericData = [];
        let startRow = 0;
        
        // Detectar si primera fila es header
        if (data.length > 0 && data[0].some(cell => isNaN(parseFloat(cell)) && typeof cell === 'string')) {
            startRow = 1;
        }
        
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            for (let cell of row) {
                if (cell !== null && cell !== undefined && cell !== '' && !isNaN(parseFloat(cell))) {
                    numericData.push(parseFloat(cell));
                }
            }
        }
        
        console.log('Datos numéricos extraídos:', numericData.length, 'valores');
        console.log('Primeros 10 valores:', numericData.slice(0, 10));
        
        // Limpiar archivo temporal
        fs.unlinkSync(req.file.path);
        
        if (numericData.length === 0) {
            return res.json({ success: false, error: 'No se encontraron datos numéricos en el archivo' });
        }
        
        // Retornar primeros 10 para validación
        const preview = numericData.slice(0, 10);
        res.json({ 
            success: true, 
            data: numericData, 
            preview: preview,
            total: numericData.length,
            fileType: fileExt
        });
        
    } catch (error) {
        console.error('Error procesando Excel:', error);
        res.json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🔬 BERT v3.0 Server ejecutándose en http://localhost:${PORT}`);
    console.log('📊 Series de Tiempo: bert-series-tiempo.html');
    console.log('📈 Regresión Lineal: linear-regression-test.html');
    console.log('🔧 Funciones Custom: bert-custom-functions.html');
    console.log('✅ CORS habilitado');
    console.log('📁 Upload Excel habilitado');
});