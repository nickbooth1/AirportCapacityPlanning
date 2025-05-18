/**
 * Jest configuration for memory-based service tests (no database required)
 */

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  roots: ['<rootDir>/tests'],
  // Don't use testRegex because we're using testMatch
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  setupFilesAfterEnv: ['./jest.memory.setup.js'],
  testTimeout: 10000,
  // Include only memory-based service tests here (services that don't require a database)
  testMatch: [
    '**/tests/services/agent/WorkingMemoryService.test.js',
    '**/tests/services/agent/ParameterValidationService.test.js',
    '**/tests/services/agent/NLPService.test.js'
  ],
  // Tests that are still being fixed or developed
  testPathIgnorePatterns: [
    '/tests/services/agent/MultiStepReasoningService.test.js'
  ]
};