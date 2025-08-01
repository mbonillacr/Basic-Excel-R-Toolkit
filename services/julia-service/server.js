const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { spawn } = require('child_process');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/julia-service.log' })
  ]
});

// Load Protocol Buffers definition
const PROTO_PATH = '../../PB/variable.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const bertProto = grpc.loadPackageDefinition(packageDefinition).bert.ipc;

// Julia execution with compatibility layer
async function executeJuliaCode(code, useLegacy = false) {
  return new Promise((resolve, reject) => {
    const juliaScript = `
    include("/app/CompatibilityLayer.jl")
    using .CompatibilityLayer
    using JSON
    
    try
      result = execute_with_compatibility("${code.replace(/"/g, '\\"')}", ${useLegacy})
      println(JSON.json(result))
    catch e
      println(JSON.json(Dict(
        "success" => false,
        "result" => nothing,
        "error" => string(e)
      )))
    end
    `;

    const juliaProcess = spawn('julia', ['--startup-file=no', '-e', juliaScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, JULIA_DEPOT_PATH: '/usr/local/share/julia' }
    });

    let stdout = '';
    let stderr = '';

    juliaProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    juliaProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    juliaProcess.on('close', (code) => {
      try {
        if (code === 0 && stdout) {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } else {
          reject(new Error(stderr || `Julia process exited with code ${code}`));
        }
      } catch (error) {
        reject(new Error(`Failed to parse Julia output: ${error.message}`));
      }
    });

    // Set timeout
    setTimeout(() => {
      juliaProcess.kill('SIGTERM');
      reject(new Error('Julia execution timeout'));
    }, 30000);
  });
}

// gRPC service implementation
const languageService = {
  ExecuteFunction: async (call, callback) => {
    const startTime = Date.now();
    const { function_name, arguments: args, context } = call.request;

    try {
      logger.info('Executing Julia function', { 
        function_name, 
        workspace_id: context?.workspace_id 
      });

      // Build Julia function call
      const argsStr = args?.map(arg => {
        if (arg.type === 'VARIABLE_TYPE_STRING') {
          return `"${arg.string_value}"`;
        } else if (arg.type === 'VARIABLE_TYPE_DOUBLE') {
          return arg.double_value.toString();
        } else if (arg.type === 'VARIABLE_TYPE_INTEGER') {
          return arg.integer_value.toString();
        }
        return 'nothing';
      }).join(', ') || '';

      const juliaCode = `${function_name}(${argsStr})`;
      
      // Execute Julia code with compatibility layer
      const result = await executeJuliaCode(juliaCode);

      const executionTime = Date.now() - startTime;

      // Build gRPC response
      const response = {
        result: {
          type: typeof result.result === 'number' ? 'VARIABLE_TYPE_DOUBLE' : 'VARIABLE_TYPE_STRING',
          double_value: typeof result.result === 'number' ? result.result : undefined,
          string_value: typeof result.result === 'string' ? result.result : JSON.stringify(result.result)
        },
        status: result.success ? 'EXECUTION_STATUS_SUCCESS' : 'EXECUTION_STATUS_ERROR',
        warnings: [],
        output: [],
        metrics: {
          execution_time_ms: executionTime,
          memory_used_bytes: 0,
          cpu_time_ms: executionTime,
          start_time: { seconds: Math.floor(startTime / 1000) },
          end_time: { seconds: Math.floor(Date.now() / 1000) }
        },
        error_details: result.success ? '' : result.error
      };

      logger.info('Julia function executed', { 
        function_name, 
        execution_time: executionTime,
        success: result.success 
      });

      callback(null, response);

    } catch (error) {
      logger.error('Julia execution error', { 
        function_name, 
        error: error.message 
      });

      callback(null, {
        result: { type: 'VARIABLE_TYPE_NULL' },
        status: 'EXECUTION_STATUS_ERROR',
        warnings: [],
        output: [],
        metrics: {
          execution_time_ms: Date.now() - startTime,
          memory_used_bytes: 0,
          cpu_time_ms: 0
        },
        error_details: error.message
      });
    }
  },

  HealthCheck: (call, callback) => {
    callback(null, {
      status: 'SERVING',
      version: '3.0.0',
      language: 'LANGUAGE_TYPE_JULIA'
    });
  },

  ListFunctions: async (call, callback) => {
    try {
      // TODO: Implement function discovery from workspace
      const functions = [
        {
          name: 'TestAdd',
          description: 'Add all arguments',
          parameters: [
            {
              name: 'values',
              type: 'VARIABLE_TYPE_DOUBLE',
              required: true,
              description: 'Values to add'
            }
          ],
          return_type: 'VARIABLE_TYPE_DOUBLE',
          language: 'LANGUAGE_TYPE_JULIA'
        }
      ];

      callback(null, { functions });
    } catch (error) {
      callback(error);
    }
  }
};

// Start gRPC server
function startServer() {
  const server = new grpc.Server();
  server.addService(bertProto.LanguageService.service, languageService);

  const port = process.env.GRPC_PORT || '50052';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      logger.error('Failed to start Julia service', { error: error.message });
      return;
    }
    
    server.start();
    logger.info(`Julia Language Service running on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down Julia service');
    server.tryShutdown(() => {
      process.exit(0);
    });
  });
}

startServer();