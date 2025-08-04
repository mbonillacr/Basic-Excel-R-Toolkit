// QA Test - Verificación del Servidor BERT
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 QA Test Suite - BERT v3.0');
console.log('================================\n');

// Test 1: Verificar R
async function testR() {
    console.log('[Test 1] Verificando R 4.4.1...');
    
    const R_PATH = 'C:\\Program Files\\R\\R-4.4.1\\bin\\Rscript.exe';
    
    if (!fs.existsSync(R_PATH)) {
        console.log('❌ FAIL: Rscript.exe no encontrado');
        return false;
    }
    
    return new Promise((resolve) => {
        const rProcess = spawn(R_PATH, ['--version']);
        let output = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ PASS: R disponible -', output.split('\\n')[0]);
                resolve(true);
            } else {
                console.log('❌ FAIL: Error ejecutando R');
                resolve(false);
            }
        });
        
        rProcess.on('error', () => {
            console.log('❌ FAIL: No se puede ejecutar R');
            resolve(false);
        });
    });
}

// Test 2: Verificar paquetes R
async function testRPackages() {
    console.log('\\n[Test 2] Verificando paquetes R...');
    
    const R_PATH = 'C:\\Program Files\\R\\R-4.4.1\\bin\\Rscript.exe';
    const script = `
packages <- c('tseries', 'jsonlite')
missing <- c()
for (pkg in packages) {
    if (!require(pkg, quietly=TRUE, character.only=TRUE)) {
        missing <- c(missing, pkg)
    }
}
if (length(missing) > 0) {
    cat('MISSING:', paste(missing, collapse=','), '\\n')
} else {
    cat('ALL_OK\\n')
}
`;

    return new Promise((resolve) => {
        const rProcess = spawn(R_PATH, ['-e', script]);
        let output = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.on('close', (code) => {
            if (output.includes('ALL_OK')) {
                console.log('✅ PASS: Todos los paquetes disponibles');
                resolve(true);
            } else if (output.includes('MISSING:')) {
                const missing = output.split('MISSING:')[1].trim();
                console.log(`⚠️  WARN: Paquetes faltantes: ${missing}`);
                resolve(false);
            } else {
                console.log('❌ FAIL: Error verificando paquetes');
                resolve(false);
            }
        });
    });
}

// Test 3: Prueba de análisis básico
async function testBasicAnalysis() {
    console.log('\\n[Test 3] Prueba de análisis básico...');
    
    const R_PATH = 'C:\\Program Files\\R\\R-4.4.1\\bin\\Rscript.exe';
    const script = `
tryCatch({
    library(jsonlite, quietly=TRUE)
    data <- c(10, 12, 13, 12, 15, 16, 18, 17, 19, 20)
    ts_obj <- ts(data, frequency=12)
    result <- list(
        mean = mean(ts_obj),
        length = length(ts_obj),
        min = min(ts_obj),
        max = max(ts_obj)
    )
    cat('ANALYSIS_START\\n')
    cat(toJSON(result, auto_unbox=TRUE))
    cat('\\nANALYSIS_END\\n')
}, error = function(e) {
    cat('ERROR:', e$message, '\\n')
})
`;

    return new Promise((resolve) => {
        const rProcess = spawn(R_PATH, ['-e', script]);
        let output = '';
        
        rProcess.stdout.on('data', data => output += data.toString());
        rProcess.on('close', (code) => {
            if (output.includes('ANALYSIS_START') && output.includes('ANALYSIS_END')) {
                try {
                    const start = output.indexOf('ANALYSIS_START') + 'ANALYSIS_START'.length;
                    const end = output.indexOf('ANALYSIS_END');
                    const json = output.substring(start, end).trim();
                    const result = JSON.parse(json);
                    console.log('✅ PASS: Análisis básico exitoso');
                    console.log(`   Media: ${result.mean}, Observaciones: ${result.length}`);
                    resolve(true);
                } catch (e) {
                    console.log('❌ FAIL: Error parsing JSON');
                    resolve(false);
                }
            } else {
                console.log('❌ FAIL: Error en análisis básico');
                console.log('Output:', output);
                resolve(false);
            }
        });
    });
}

// Test 4: Verificar dependencias Node.js
function testNodeDependencies() {
    console.log('\\n[Test 4] Verificando dependencias Node.js...');
    
    const required = ['express', 'multer', 'xlsx', 'uuid'];
    let allOk = true;
    
    for (const pkg of required) {
        try {
            require(pkg);
            console.log(`✅ ${pkg}: OK`);
        } catch (e) {
            console.log(`❌ ${pkg}: MISSING`);
            allOk = false;
        }
    }
    
    return allOk;
}

// Ejecutar todas las pruebas
async function runAllTests() {
    console.log('Iniciando suite de pruebas QA...\\n');
    
    const results = {
        r: await testR(),
        packages: await testRPackages(),
        analysis: await testBasicAnalysis(),
        node: testNodeDependencies()
    };
    
    console.log('\\n================================');
    console.log('📊 RESUMEN DE PRUEBAS QA');
    console.log('================================');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log(`✅ Pruebas pasadas: ${passed}/${total}`);
    console.log(`❌ Pruebas fallidas: ${total - passed}/${total}`);
    
    if (results.r && results.packages && results.analysis && results.node) {
        console.log('\\n🎉 TODAS LAS PRUEBAS PASARON - Sistema listo para producción');
        return true;
    } else {
        console.log('\\n⚠️  ALGUNAS PRUEBAS FALLARON - Revisar configuración');
        
        if (!results.r) console.log('   - Configurar PATH de R');
        if (!results.packages) console.log('   - Instalar paquetes R faltantes');
        if (!results.analysis) console.log('   - Verificar configuración de R');
        if (!results.node) console.log('   - Instalar dependencias Node.js');
        
        return false;
    }
}

// Ejecutar
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
});