/**
 * Jest configuration for performance tests
 */

module.exports = {
  // Set a longer timeout since performance tests can take time
  testTimeout: 60000, // 60 seconds
  
  // Disable auto mocks
  automock: false,
  
  // Display detailed test information
  verbose: true,
  
  // Run tests in sequence
  maxWorkers: 1,
  
  // Output directory for coverage reports
  coverageDirectory: '../coverage/performance',
  
  // The root directory where tests are located
  rootDir: '../../',
  
  // The test environment
  testEnvironment: 'node',
  
  // Only run performance tests
  testMatch: ['**/tests/performance/**/*.test.js'],
  
  // Setup file for performance tests
  setupFilesAfterEnv: ['<rootDir>/tests/performance/performanceTestSetup.js'],
  
  // Global variables available in tests
  globals: {
    PERFORMANCE_TEST: true
  },
  
  // Report on slow tests
  slowTestThreshold: 10,
  
  // Custom reporters for performance metrics
  reporters: [
    'default',
    ['<rootDir>/tests/performance/utils/performanceReporter.js', {}]
  ]
};