module.exports = {
  projects: [
    {
      displayName: 'API Gateway Tests',
      testMatch: ['<rootDir>/tests/unit/api-gateway/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/api-gateway.setup.js'],
      collectCoverageFrom: [
        'services/api-gateway/**/*.js',
        '!services/api-gateway/node_modules/**'
      ],
      coverageDirectory: '<rootDir>/coverage/api-gateway',
      coverageReporters: ['text', 'lcov', 'html']
    },
    {
      displayName: 'R Service Tests',
      testMatch: ['<rootDir>/tests/unit/r-service/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/r-service.setup.js'],
      collectCoverageFrom: [
        'services/r-service/**/*.js',
        '!services/r-service/node_modules/**'
      ],
      coverageDirectory: '<rootDir>/coverage/r-service'
    },
    {
      displayName: 'Julia Service Tests',
      testMatch: ['<rootDir>/tests/unit/julia-service/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/julia-service.setup.js'],
      collectCoverageFrom: [
        'services/julia-service/**/*.js',
        '!services/julia-service/node_modules/**'
      ],
      coverageDirectory: '<rootDir>/coverage/julia-service'
    },
    {
      displayName: 'Web Console Tests',
      testMatch: ['<rootDir>/tests/unit/web-console/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/tests/setup/web-console.setup.js'
      ],
      collectCoverageFrom: [
        'web-clients/web-console/src/**/*.{js,jsx,ts,tsx}',
        '!web-clients/web-console/src/index.js',
        '!web-clients/web-console/src/serviceWorker.js'
      ],
      coverageDirectory: '<rootDir>/coverage/web-console',
      moduleNameMapping: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      }
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js'],
      testTimeout: 30000
    },
    {
      displayName: 'Regression Tests',
      testMatch: ['<rootDir>/tests/regression/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/regression.setup.js'],
      testTimeout: 60000
    }
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'web-clients/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  verbose: true,
  testTimeout: 10000
};