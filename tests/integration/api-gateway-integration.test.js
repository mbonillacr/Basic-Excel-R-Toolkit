const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('API Gateway Integration Tests', () => {
  let apiGateway;
  let rService;
  let juliaService;
  
  beforeAll(async () => {
    // Start R service
    rService = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../../services/r-service'),
      env: { ...process.env, GRPC_PORT: '50051' }
    });
    
    // Start Julia service
    juliaService = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../../services/julia-service'),
      env: { ...process.env, GRPC_PORT: '50052' }
    });
    
    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start API Gateway
    const app = require('../../services/api-gateway/server');
    apiGateway = app;
  });
  
  afterAll(async () => {
    if (rService) rService.kill();
    if (juliaService) juliaService.kill();
  });

  describe('Health Checks', () => {
    test('API Gateway health endpoint responds', async () => {
      const response = await request(apiGateway)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version', '3.0.0');
    });
  });

  describe('Function Execution', () => {
    test('Execute R function through API Gateway', async () => {
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          function_name: 'sum',
          language: 'R',
          parameters: [1, 2, 3, 4, 5],
          workspace_id: 'test'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('result', 15);
      expect(response.body).toHaveProperty('execution_time');
      expect(response.body.execution_time).toBeGreaterThan(0);
    });

    test('Execute Julia function through API Gateway', async () => {
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          function_name: 'sum',
          language: 'Julia',
          parameters: [1, 2, 3, 4, 5],
          workspace_id: 'test'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('result', 15);
    });

    test('Handle invalid function name', async () => {
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          function_name: 'nonexistent_function',
          language: 'R',
          parameters: [],
          workspace_id: 'test'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('error');
    });

    test('Handle missing required fields', async () => {
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          parameters: [1, 2, 3]
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('Performance Requirements', () => {
    test('Function execution completes within 150ms for simple operations', async () => {
      const startTime = Date.now();
      
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          function_name: 'sum',
          language: 'R',
          parameters: [1, 2, 3],
          workspace_id: 'test'
        })
        .expect(200);
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(150);
      expect(response.body.status).toBe('success');
    });
  });

  describe('Error Handling', () => {
    test('Handle service unavailable gracefully', async () => {
      // This test would require stopping a service temporarily
      // For now, test with unsupported language
      const response = await request(apiGateway)
        .post('/api/v1/functions/execute')
        .send({
          function_name: 'test',
          language: 'Python', // Not yet implemented
          parameters: [],
          workspace_id: 'test'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Unsupported language');
    });
  });

  describe('Rate Limiting', () => {
    test('Rate limiting works correctly', async () => {
      const requests = [];
      
      // Send 101 requests rapidly (limit is 100 per 15 minutes)
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(apiGateway)
            .get('/api/v1/functions')
            .query({ language: 'R' })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});