# AirportAI Phase 2 Testing Approach

This document outlines the testing approach for Phase 2 of the AirportAI Agent implementation.

## Testing Goals

1. **Verify OpenAI API Integration**: Ensure the system correctly integrates with the OpenAI API for natural language processing, query analysis, and reasoning capabilities.
2. **Validate Scenario Management**: Test the scenario creation, modification, and analysis workflows.
3. **Check System Resiliency**: Verify the system continues to function with graceful fallbacks when dependencies are unavailable.
4. **Measure Performance**: Ensure all operations meet performance requirements, especially those involving AI processing.

## Test Types

### Unit Tests

Unit tests verify that individual components function correctly in isolation. We use Jest for unit testing with the following approaches:

- **Mock-Based Testing**: Tests using mocked dependencies to isolate the unit under test.
- **Actual Component Testing**: Tests that use real components when available, falling back to mocks when necessary.

Key unit test files:
- `backend/tests/services/agent/OpenAIService.test.js`
- `backend/tests/services/agent/NLPService.test.js`
- `backend/tests/models/agent/Scenario.test.js`

### Integration Tests

Integration tests verify that multiple components work together correctly. Our approach includes:

- **Live API Integration**: Tests the interaction with the actual OpenAI API using a valid API key.
- **Database Integration**: Tests database operations with transaction-based isolation.
- **API Client Integration**: Tests frontend components' interaction with backend APIs.

Key integration test files:
- `backend/tests/integration/agent/nlpServiceIntegration.test.js`
- `backend/tests/integration/agent/scenarioWorkflow.test.js`
- `frontend/tests/integration/agent/ApiClientIntegration.test.js`

### End-to-End Tests

E2E tests verify complete workflows from the user interface to the backend services and database:

- **Browser Automation**: Uses Puppeteer to simulate user actions in the browser.
- **Full Workflow Testing**: Tests complete user workflows from start to finish.

Key E2E test files:
- `backend/tests/e2e/agent/fullScenarioWorkflow.test.js`

### Performance Tests

Performance tests measure the system's responsiveness, throughput, and resource utilization:

- **Response Time Testing**: Measures API response times under different loads.
- **Throughput Testing**: Measures the number of operations per second the system can handle.
- **Resource Utilization**: Measures CPU, memory, and network usage.

Key performance test files:
- `backend/tests/performance/agent/nlpProcessingPerformance.test.js`
- `backend/tests/performance/agent/scenarioCalculationPerformance.test.js`

## Test Configuration

### Environment Variables

- `OPENAI_API_KEY`: API key for the OpenAI service.
- `RUN_LIVE_OPENAI_TESTS`: When set to 'true', enables tests that use the actual OpenAI API.
- `TEST_API_URL`: Base URL for API tests, defaults to 'http://localhost:3001'.

### Test Runners

We've developed custom test runners to manage different test types:

- `scripts/simple-test-runner.js`: Runs unit tests with fallback to mocks.
- `scripts/run-integration-tests.js`: Runs integration tests with actual database when available.
- `scripts/run-integration-tests-with-openai.js`: Runs integration tests specifically targeting OpenAI functionality.
- `scripts/run-e2e-tests.js`: Runs end-to-end tests with browser automation.
- `scripts/run-performance-tests.js`: Runs performance and load tests.
- `scripts/run-all-phase2-tests.js`: Master script that runs all test types in sequence.

Additionally, `run-phase2-tests.sh` provides a convenient shell script to run all tests and report results.

## Running Tests

### Basic Usage

```bash
# Run all tests
npm run test:phase2

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:openai
npm run test:e2e
npm run test:performance

# Run with live OpenAI API integration
OPENAI_API_KEY=<your-api-key> RUN_LIVE_OPENAI_TESTS=true npm run test:openai
```

### Test Isolation

- Database tests use transactions to prevent modifications to the test database.
- E2E tests use a separate test database that gets reset between test runs.
- Tests that require external dependencies include graceful fallbacks to ensure they can run in any environment.

## Reporting

Test results are stored in the following locations:

- Console output for immediate feedback
- Log files in `logs/tests/` directory
- Detailed test reports in `reports/tests/` directory

## Special Considerations

### Mock vs. Live Testing

The testing framework is designed to use actual system components whenever possible, but gracefully fall back to mocks when components are unavailable. This approach:

1. Ensures tests can run in any environment
2. Maximizes the value of tests by using real components when available
3. Provides clear reporting about which tests used actual vs. mock components

### OpenAI API Testing

Testing with the actual OpenAI API requires:

1. A valid API key set in the `OPENAI_API_KEY` environment variable
2. Setting `RUN_LIVE_OPENAI_TESTS=true` to enable live API tests
3. Increased timeouts for tests involving API calls (default: 30 seconds)

Without these conditions, the tests will still run but will use mocked responses.