# AgentController Test Suite

This directory contains comprehensive tests for the AgentController and related components, implementing the conversation context management system.

## Test Structure

The tests are organized into three levels:

1. **Unit Tests** (`/tests/unit/agent/AgentController.test.js`)
   - Tests the controller methods in isolation using mocks
   - Fast execution, focused on controller logic
   - Full code coverage of the controller methods

2. **Integration Tests** (`/tests/integration/agent/AgentController.test.js`)
   - Tests the controller with real service implementations but mocked models
   - Validates proper integration between controller and services
   - Ensures all components work together correctly

3. **End-to-End Tests** (`/tests/e2e/agent/AgentController.e2e.test.js`)
   - Tests the full API integration with a running server
   - Validates the complete request-response cycle
   - Tests conversation flows and error handling

## Running the Tests

You can run the tests using the `run-agent-tests.js` script:

```bash
# Run all test types
node run-agent-tests.js

# Run specific test types
node run-agent-tests.js unit
node run-agent-tests.js integration
node run-agent-tests.js e2e

# Run tests in watch mode
node run-agent-tests.js unit --watch

# Run tests with verbose output
node run-agent-tests.js integration --verbose
```

Alternatively, you can use Jest directly:

```bash
# Run all agent tests
npx jest --config jest.agent.config.js

# Run specific test file
npx jest tests/unit/agent/AgentController.test.js
```

## Test Coverage

The tests cover:

- AgentController methods
- Conversation context management
- Error handling
- API endpoint validation
- User authentication and authorization
- Conversation flow and history
- Feedback processing
- Action approval and rejection

## Test Configuration

The tests use a specific Jest configuration file (`jest.agent.config.js`) that:

- Runs only the AgentController tests
- Generates a coverage report
- Sets up the test environment with appropriate mocks
- Provides detailed test output

## End-to-End Testing Notes

The E2E tests require:

1. A running server instance
2. A test database with the appropriate schema
3. Valid JWT authentication

These tests should be run in a controlled environment, not in production.