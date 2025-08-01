const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { bertSum } = require('./functions');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gateway.log' })
  ]
});

// Redis client for caching and session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
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

// gRPC clients for language services
const rServiceClient = new bertProto.LanguageService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const juliaServiceClient = new bertProto.LanguageService(
  'localhost:50052', 
  grpc.credentials.createInsecure()
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  req.requestId = uuidv4();
  logger.info(`${req.method} ${req.path}`, { 
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// BERT Custom Functions
app.post('/api/functions/sum', (req, res) => {
  try {
    const { a, b } = req.body;
    const result = bertSum(a, b);
    
    logger.info('BERT.Sum executed', { 
      requestId: req.requestId,
      parameters: { a, b },
      result
    });
    
    res.json({
      function: 'BERT.Sum',
      parameters: { a, b },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('BERT.Sum error', { 
      requestId: req.requestId,
      error: error.message 
    });
    res.status(400).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

// Function execution endpoint
app.post('/api/v1/functions/execute', async (req, res) => {
  try {
    const { function_name, language, parameters, workspace_id, execution_context } = req.body;
    
    // Validate request
    if (!function_name || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: function_name, language' 
      });
    }

    // Create gRPC request
    const grpcRequest = {
      function_name,
      language: language.toUpperCase(),
      arguments: parameters || [],
      context: {
        workspace_id: workspace_id || 'default',
        user_id: req.user?.id || 'anonymous',
        timeout_ms: execution_context?.timeout || 30000,
        memory_limit_bytes: execution_context?.memory_limit || 512 * 1024 * 1024,
        debug_mode: execution_context?.debug || false
      }
    };

    // Route to appropriate language service
    let client;
    switch (language.toLowerCase()) {
      case 'r':
        client = rServiceClient;
        break;
      case 'julia':
        client = juliaServiceClient;
        break;
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    // Execute function via gRPC
    client.ExecuteFunction(grpcRequest, (error, response) => {
      if (error) {
        logger.error('gRPC execution error', { 
          requestId: req.requestId,
          error: error.message 
        });
        return res.status(500).json({ 
          error: 'Function execution failed',
          details: error.message 
        });
      }

      // Transform gRPC response to REST format
      const result = {
        result: response.result?.string_value || response.result?.double_value || response.result?.integer_value,
        execution_time: response.metrics?.execution_time_ms || 0,
        status: response.status === 'EXECUTION_STATUS_SUCCESS' ? 'success' : 'error',
        output_logs: response.output || [],
        warnings: response.warnings || []
      };

      logger.info('Function executed successfully', {
        requestId: req.requestId,
        function_name,
        language,
        execution_time: result.execution_time
      });

      res.json(result);
    });

  } catch (error) {
    logger.error('API Gateway error', { 
      requestId: req.requestId,
      error: error.message 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Workspace management endpoints
app.get('/api/v1/workspaces', (req, res) => {
  // TODO: Implement workspace listing
  res.json({ workspaces: [] });
});

app.post('/api/v1/workspaces', (req, res) => {
  // TODO: Implement workspace creation
  res.json({ message: 'Workspace creation not yet implemented' });
});

// BERT Functions listing
app.get('/api/functions', (req, res) => {
  res.json({
    functions: [
      {
        name: 'BERT.Sum',
        description: 'Adds two numbers',
        parameters: ['a: number', 'b: number'],
        returns: 'number',
        example: 'BERT.Sum(5, 3) = 8'
      }
    ]
  });
});

// Function listing endpoint
app.get('/api/v1/functions', async (req, res) => {
  try {
    const { language, workspace_id } = req.query;
    
    const client = language === 'r' ? rServiceClient : juliaServiceClient;
    const request = {
      workspace_id: workspace_id || 'default',
      language: language?.toUpperCase() || 'R'
    };

    client.ListFunctions(request, (error, response) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ functions: response.functions || [] });
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    requestId: req.requestId,
    error: error.message,
    stack: error.stack 
  });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
    
    app.listen(PORT, () => {
      logger.info(`BERT API Gateway running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

startServer();