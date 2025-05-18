# AirportAI Phase 2 Test Scripts

This directory contains test scripts for running the Phase 2 AirportAI Agent tests.

## Available Scripts

### Test Runners

- **`run-all-phase2-tests.js`**: Master script that runs all test types in sequence.
- **`simple-test-runner.js`**: Runs unit tests with fallback to mocks.
- **`run-integration-tests.js`**: Runs integration tests with actual components when available.
- **`run-integration-tests-with-openai.js`**: Runs tests targeting OpenAI functionality.
- **`run-e2e-tests.js`**: Runs end-to-end tests with browser automation.
- **`run-performance-tests.js`**: Runs performance and load tests.

## Usage

You can run these scripts directly or through the npm scripts defined in package.json:

```bash
# Run all tests
npm run test:phase2

# Run specific test types
npm run test:phase2:unit
npm run test:phase2:integration
npm run test:phase2:openai
npm run test:phase2:e2e
npm run test:phase2:performance
```

## Using the OpenAI API

To run tests with the actual OpenAI API, you need to:

1. Set the `OPENAI_API_KEY` environment variable
2. Set `RUN_LIVE_OPENAI_TESTS=true` to enable tests with the live API

```bash
OPENAI_API_KEY=your-api-key RUN_LIVE_OPENAI_TESTS=true npm run test:phase2:openai
```

If the API key is not available, the tests will still run but will use mocked responses.

## Test Reports

Test reports are generated in the following locations:

- `logs/tests/`: Log files with detailed test execution information
- `reports/tests/`: Formatted test reports with summary information

## Common Issues

- **Jest Not Found**: If you get an error about Jest not being found, make sure you've installed all dependencies with `npm install`.
- **OpenAI API Errors**: If OpenAI API tests fail, check that your API key is valid and has sufficient quota.
- **Database Errors**: Database tests require a running PostgreSQL instance with the correct schema.

For more details on the testing approach, see the [Phase2_TestingApproach.md](../docs/Phase2_TestingApproach.md) document.