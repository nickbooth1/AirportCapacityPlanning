/**
 * Jest configuration for AgentController tests
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  // Run only agent controller tests
  testMatch: [
    '**/tests/unit/agent/AgentController.test.js',
    '**/tests/integration/agent/AgentController.test.js',
    // Uncomment to run E2E tests (requires a running server and test database)
    // '**/tests/e2e/agent/AgentController.e2e.test.js'
  ],
  // Generate coverage report
  collectCoverage: true,
  collectCoverageFrom: [
    '**/src/controllers/agent/AgentController.js',
    '**/src/services/agent/ContextService.js',
    '**/src/models/agent/ConversationContext.js',
    '**/src/models/agent/LongTermMemory.js'
  ],
  coverageDirectory: 'coverage/agent-controller',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: 'node',
  verbose: true
};