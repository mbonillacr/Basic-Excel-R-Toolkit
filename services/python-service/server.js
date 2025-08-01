const express = require('express');
const { spawn } = require('child_process');
const winston = require('winston');

const app = express();
app.use(express.json());

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'python-service.log' }),
    new winston.transports.Console()
  ]
});

// Python execution with security constraints
const executePython = (code, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['-c', code], {
      timeout,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Python execution failed: ${stderr}`));
      }
    });

    python.on('error', (error) => {
      reject(error);
    });
  });
};

// Execute Python code
app.post('/execute', async (req, res) => {
  try {
    const { code, context } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Python code is required' });
    }

    // Add safety wrapper and Excel integration
    const wrappedCode = `
import sys
import json
import pandas as pd
import numpy as np
from io import StringIO
import warnings
warnings.filterwarnings('ignore')

# Redirect stdout to capture output
old_stdout = sys.stdout
sys.stdout = StringIO()

try:
    # User code execution
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    # Capture output
    output = sys.stdout.getvalue()
    sys.stdout = old_stdout
    
    # Return results in JSON format
    result = {
        'success': True,
        'output': output,
        'type': 'text'
    }
    print(json.dumps(result))
    
except Exception as e:
    sys.stdout = old_stdout
    error_result = {
        'success': False,
        'error': str(e),
        'type': 'error'
    }
    print(json.dumps(error_result))
`;

    const result = await executePython(wrappedCode);
    
    try {
      const parsedResult = JSON.parse(result.stdout.trim());
      
      logger.info('Python code executed', { 
        success: parsedResult.success,
        codeLength: code.length 
      });
      
      res.json(parsedResult);
    } catch (parseError) {
      // Fallback for non-JSON output
      res.json({
        success: true,
        output: result.stdout,
        type: 'text'
      });
    }

  } catch (error) {
    logger.error('Python execution failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message,
      type: 'error'
    });
  }
});

// Get available Python packages
app.get('/packages', async (req, res) => {
  try {
    const code = `
import pkg_resources
packages = [d.project_name for d in pkg_resources.working_set]
print('\\n'.join(sorted(packages)))
`;

    const result = await executePython(code);
    const packages = result.stdout.trim().split('\n').filter(p => p);
    
    res.json({ packages });
  } catch (error) {
    logger.error('Failed to get packages', { error: error.message });
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

// Python environment info
app.get('/info', async (req, res) => {
  try {
    const code = `
import sys
import platform
print(f"Python Version: {sys.version}")
print(f"Platform: {platform.platform()}")
print(f"Architecture: {platform.architecture()[0]}")
`;

    const result = await executePython(code);
    
    res.json({
      info: result.stdout.trim(),
      service: 'python-service',
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Failed to get Python info', { error: error.message });
    res.status(500).json({ error: 'Failed to get Python info' });
  }
});

// Data analysis helper functions
app.post('/analyze-data', async (req, res) => {
  try {
    const { data, analysis_type } = req.body;
    
    const analysisCode = `
import pandas as pd
import numpy as np
import json

# Convert data to DataFrame
data = ${JSON.stringify(data)}
df = pd.DataFrame(data)

# Perform analysis based on type
if "${analysis_type}" == "summary":
    result = df.describe().to_dict()
elif "${analysis_type}" == "correlation":
    result = df.corr().to_dict()
elif "${analysis_type}" == "missing":
    result = df.isnull().sum().to_dict()
else:
    result = {"error": "Unknown analysis type"}

print(json.dumps(result, default=str))
`;

    const result = await executePython(analysisCode);
    const analysisResult = JSON.parse(result.stdout.trim());
    
    logger.info('Data analysis completed', { 
      analysisType: analysis_type,
      dataSize: JSON.stringify(data).length 
    });
    
    res.json({
      success: true,
      analysis: analysisResult,
      type: analysis_type
    });

  } catch (error) {
    logger.error('Data analysis failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'python-service',
    language: 'Python',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Python Service running on port ${PORT}`);
  logger.info('Python Service started', { port: PORT });
});

module.exports = app;