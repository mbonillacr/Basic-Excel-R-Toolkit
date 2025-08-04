const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('.'));

let rEnv = '';

app.post('/api/load-functions', (req, res) => {
    const code = req.body.code;
    rEnv = code;
    
    const rProcess = spawn('Rscript', ['-e', `
        ${code}
        funcs <- ls()[sapply(ls(), function(x) is.function(get(x)))]
        cat(paste(funcs, collapse=','))
    `]);
    
    let out = '';
    let err = '';
    
    rProcess.stdout.on('data', d => out += d);
    rProcess.stderr.on('data', d => err += d);
    rProcess.on('close', code => {
        if (code === 0 && out.trim()) {
            res.json({success: true, functions: out.trim().split(',')});
        } else {
            res.json({success: false, error: err || 'R not found'});
        }
    });
});

app.post('/api/execute-function', (req, res) => {
    const {functionName, params} = req.body;
    const code = `${rEnv}\nresult <- ${functionName}(${params})\nprint(result)`;
    execR(code, res);
});

app.post('/api/execute-r', (req, res) => {
    execR(req.body.code, res);
});

function execR(code, res) {
    const rProcess = spawn('Rscript', ['-e', code]);
    let out = '', err = '';
    
    rProcess.stdout.on('data', d => out += d);
    rProcess.stderr.on('data', d => err += d);
    rProcess.on('close', code => {
        res.json(code === 0 ? {success: true, output: out.trim()} : {success: false, error: err});
    });
}

app.listen(3001, () => console.log('🚀 YOLO Server: http://localhost:3001/bert-yolo.html'));