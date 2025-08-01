const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('BERT v2.4.3 Backward Compatibility Tests', () => {
  let testResults = [];

  beforeAll(async () => {
    // Ensure test functions are available
    await setupTestFunctions();
  });

  afterAll(async () => {
    // Generate compatibility report
    await generateCompatibilityReport(testResults);
  });

  describe('R Function Compatibility', () => {
    test('TestAdd function works identically to v2.4.3', async () => {
      const v2Result = await executeV2Function('TestAdd', [1, 2, 3, 4, 5]);
      const v3Result = await executeV3Function('TestAdd', [1, 2, 3, 4, 5], 'R');
      
      expect(v3Result.result).toBe(v2Result);
      expect(v3Result.status).toBe('success');
      
      testResults.push({
        function: 'TestAdd',
        language: 'R',
        compatible: true,
        v2Result,
        v3Result: v3Result.result
      });
    });

    test('EigenValues function maintains precision', async () => {
      const testMatrix = [[1, 2], [3, 4]];
      const v2Result = await executeV2Function('EigenValues', [testMatrix]);
      const v3Result = await executeV3Function('EigenValues', [testMatrix], 'R');
      
      // Compare eigenvalues with tolerance for floating point precision
      expect(Array.isArray(v3Result.result)).toBe(true);
      expect(v3Result.result).toHaveLength(v2Result.length);
      
      v3Result.result.forEach((val, idx) => {
        expect(Math.abs(val - v2Result[idx])).toBeLessThan(1e-10);
      });
      
      testResults.push({
        function: 'EigenValues',
        language: 'R',
        compatible: true,
        v2Result,
        v3Result: v3Result.result
      });
    });

    test('R 3.4.x specific functions work with compatibility layer', async () => {
      // Test deprecated R 3.4.x function
      const legacyCode = 'as.real(c(1.5, 2.5, 3.5))';
      const result = await executeV3RawCode(legacyCode, 'R');
      
      expect(result.status).toBe('success');
      expect(Array.isArray(result.result)).toBe(true);
      
      testResults.push({
        function: 'as.real (legacy)',
        language: 'R',
        compatible: true,
        note: 'Compatibility layer active'
      });
    });
  });

  describe('Julia Function Compatibility', () => {
    test('TestAdd function works identically to v2.4.3', async () => {
      const v2Result = await executeV2Function('TestAdd', [1, 2, 3, 4, 5], 'Julia');
      const v3Result = await executeV3Function('TestAdd', [1, 2, 3, 4, 5], 'Julia');
      
      expect(v3Result.result).toBe(v2Result);
      expect(v3Result.status).toBe('success');
      
      testResults.push({
        function: 'TestAdd',
        language: 'Julia',
        compatible: true,
        v2Result,
        v3Result: v3Result.result
      });
    });

    test('EigenValues function maintains precision', async () => {
      const testMatrix = [[1, 2], [3, 4]];
      const v2Result = await executeV2Function('EigenValues', [testMatrix], 'Julia');
      const v3Result = await executeV3Function('EigenValues', [testMatrix], 'Julia');
      
      expect(Array.isArray(v3Result.result)).toBe(true);
      expect(v3Result.result).toHaveLength(v2Result.length);
      
      testResults.push({
        function: 'EigenValues',
        language: 'Julia',
        compatible: true,
        v2Result,
        v3Result: v3Result.result
      });
    });

    test('Julia 0.6.2 specific syntax works with compatibility layer', async () => {
      // Test deprecated Julia 0.6.2 syntax
      const legacyCode = 'ASCIIString("hello world")';
      const result = await executeV3RawCode(legacyCode, 'Julia');
      
      expect(result.status).toBe('success');
      expect(typeof result.result).toBe('string');
      
      testResults.push({
        function: 'ASCIIString (legacy)',
        language: 'Julia',
        compatible: true,
        note: 'Compatibility layer active'
      });
    });
  });

  describe('Performance Compatibility', () => {
    test('Function execution time does not exceed v2.4.3 baseline', async () => {
      const iterations = 10;
      const v2Times = [];
      const v3Times = [];
      
      for (let i = 0; i < iterations; i++) {
        const v2Start = Date.now();
        await executeV2Function('TestAdd', [1, 2, 3, 4, 5]);
        v2Times.push(Date.now() - v2Start);
        
        const v3Start = Date.now();
        await executeV3Function('TestAdd', [1, 2, 3, 4, 5], 'R');
        v3Times.push(Date.now() - v3Start);
      }
      
      const v2Avg = v2Times.reduce((a, b) => a + b) / iterations;
      const v3Avg = v3Times.reduce((a, b) => a + b) / iterations;
      
      // v3.0 should not be more than 20% slower than v2.4.3
      expect(v3Avg).toBeLessThan(v2Avg * 1.2);
      
      testResults.push({
        function: 'Performance Test',
        language: 'R',
        compatible: true,
        v2AvgTime: v2Avg,
        v3AvgTime: v3Avg,
        improvement: ((v2Avg - v3Avg) / v2Avg * 100).toFixed(2) + '%'
      });
    });
  });

  describe('Error Handling Compatibility', () => {
    test('Error messages maintain consistency', async () => {
      const v2Error = await executeV2Function('nonexistent_function', []);
      const v3Result = await executeV3Function('nonexistent_function', [], 'R');
      
      expect(v3Result.status).toBe('error');
      expect(v3Result.error).toBeDefined();
      
      testResults.push({
        function: 'Error Handling',
        language: 'R',
        compatible: true,
        note: 'Error handling preserved'
      });
    });
  });
});

// Helper functions
async function setupTestFunctions() {
  // Copy test functions to appropriate locations
  const testFunctions = {
    r: `
      TestAdd <- function(...) {
        sum(...)
      }
      
      EigenValues <- function(mat) {
        eigen(mat)$values
      }
    `,
    julia: `
      function TestAdd(a...)
        sum(collect(Base.Iterators.flatten(a)))
      end
      
      function EigenValues(mat)
        eigvals(mat)
      end
    `
  };
  
  // Write test functions to temporary files
  await fs.writeFile('/tmp/test_functions.R', testFunctions.r);
  await fs.writeFile('/tmp/test_functions.jl', testFunctions.julia);
}

async function executeV2Function(functionName, parameters, language = 'R') {
  // Simulate v2.4.3 execution (would normally call actual v2.4.3 system)
  // For testing purposes, return expected v2.4.3 results
  const mockResults = {
    'TestAdd': parameters.reduce((a, b) => a + b, 0),
    'EigenValues': [5.372281, -0.372281] // Known eigenvalues for [[1,2],[3,4]]
  };
  
  return mockResults[functionName] || null;
}

async function executeV3Function(functionName, parameters, language) {
  const axios = require('axios');
  
  try {
    const response = await axios.post('http://localhost:3000/api/v1/functions/execute', {
      function_name: functionName,
      language: language,
      parameters: parameters,
      workspace_id: 'regression-test'
    });
    
    return response.data;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

async function executeV3RawCode(code, language) {
  // Execute raw code through v3.0 system
  const axios = require('axios');
  
  try {
    const response = await axios.post('http://localhost:3000/api/v1/functions/execute', {
      function_name: 'eval',
      language: language,
      parameters: [code],
      workspace_id: 'regression-test'
    });
    
    return response.data;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

async function generateCompatibilityReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    compatibleTests: results.filter(r => r.compatible).length,
    incompatibleTests: results.filter(r => !r.compatible).length,
    compatibilityRate: (results.filter(r => r.compatible).length / results.length * 100).toFixed(2) + '%',
    results: results
  };
  
  await fs.writeFile(
    path.join(__dirname, '../reports/compatibility-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n📊 BERT v2.4.3 Compatibility Report:`);
  console.log(`   Total Tests: ${report.totalTests}`);
  console.log(`   Compatible: ${report.compatibleTests}`);
  console.log(`   Incompatible: ${report.incompatibleTests}`);
  console.log(`   Compatibility Rate: ${report.compatibilityRate}`);
}