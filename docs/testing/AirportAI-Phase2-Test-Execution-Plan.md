# AirportAI Phase 2 Test Execution Plan

This document outlines the systematic approach for executing all tests for Phase 2 of the AirportAI implementation.

## Prerequisites

Before running tests, ensure the following:

1. Development environment is properly set up
2. All dependencies are installed
3. Test databases are configured
4. Environment variables are set correctly

```bash
# Install all dependencies
npm install

# Set up test database
npm run setup:test-db

# Verify environment variables
npm run check:env
```

## Test Execution Sequence

### 1. Unit Tests (10-15 minutes)

Run unit tests first as they're fastest and catch basic issues.

```bash
# Run backend service and model unit tests
npm test -- backend/tests/services/agent/NLPService.test.js
npm test -- backend/tests/services/agent/OpenAIService.test.js
npm test -- backend/tests/models/agent/Scenario.test.js
npm test -- backend/tests/services/agent/ScenarioService.test.js

# Run all backend unit tests in parallel
npm test -- backend/tests/services/agent backend/tests/models/agent

# Run frontend component unit tests
npm test -- frontend/src/components/agent/WhatIfAnalysis.test.js
npm test -- frontend/src/components/agent/ScenarioVisualization.test.js
npm test -- frontend/src/components/agent/ScenarioManagement.test.js
npm test -- frontend/src/api/scenarioApi.test.js

# Run all frontend unit tests in parallel
npm test -- frontend/src/components/agent frontend/src/api/scenarioApi.test.js
```

### 2. Integration Tests (15-20 minutes)

Run integration tests after unit tests pass.

```bash
# Run backend integration tests
npm test -- backend/tests/integration/agent/scenarioWorkflow.test.js
npm test -- backend/tests/integration/agent/scenarioApi.test.js

# Run frontend integration tests
npm test -- frontend/tests/integration/agent/WhatIfAnalysisFull.test.js
```

### 3. End-to-End Tests (20-25 minutes)

Run E2E tests after integration tests pass.

```bash
# Start the application in test mode
npm run start:test

# In a separate terminal, run E2E tests
npm run test:e2e -- frontend/tests/e2e/WhatIfScenarioJourney.test.js
npm run test:e2e -- frontend/tests/e2e/ScenarioManagementJourney.test.js
```

### 4. Performance Tests (30-40 minutes)

Run performance tests last, as they take longer and are resource-intensive.

```bash
# Run NLP performance tests
npm test -- backend/tests/performance/agent/nlpProcessingTime.test.js

# Run scenario calculation performance tests
npm test -- backend/tests/performance/agent/scenarioCalculationTime.test.js

# Run API response time tests
npm test -- backend/tests/performance/agent/apiResponseTime.test.js
```

## Automated Test Suite Execution

For CI/CD pipelines or regular testing, run all tests in sequence:

```bash
# Run full test suite
npm run test:phase2

# This command expands to:
npm test -- backend/tests/services/agent backend/tests/models/agent && \
npm test -- frontend/src/components/agent frontend/src/api/scenarioApi.test.js && \
npm test -- backend/tests/integration/agent frontend/tests/integration/agent && \
npm run start:test & npm run test:e2e && kill $! && \
npm test -- backend/tests/performance/agent
```

## Test Results Analysis

After running tests:

1. Generate test coverage report
   ```bash
   npm run test:coverage
   ```

2. Review test reports in `/reports/tests`

3. Analyze performance test results in `/reports/performance`

4. Address any failing tests or performance issues before merging code

## Test Schedule

| Test Type | Frequency | Environment | Owner |
|-----------|-----------|-------------|-------|
| Unit Tests | Every PR | Local, CI | Developer |
| Integration Tests | Every PR | CI | Developer |
| E2E Tests | Daily | CI | QA Team |
| Performance Tests | Weekly | Staging | Performance Team |

## Troubleshooting Failed Tests

1. Check test logs in `/logs/tests`
2. Verify test database state
3. Check for network connectivity issues with external services
4. Ensure mocks and stubs are correctly configured
5. Validate test data fixtures

## Test Data Management

Tests use the following data sources:

1. Fixtures in `/backend/tests/fixtures` and `/frontend/tests/fixtures`
2. Test database seeded via `/backend/tests/seed.js`
3. Mock service responses in `/backend/tests/mocks`

Refresh test data before full test runs:
```bash
npm run refresh:test-data
```

## Continuous Improvement

After each major test execution:

1. Review test coverage and add tests for uncovered code
2. Update performance thresholds based on actual results
3. Refine test scenarios to cover new edge cases
4. Optimize slow tests

## Health Checks

Before starting a test run, perform these health checks:

```bash
# Verify API server
curl http://localhost:3000/api/health

# Verify database connection
npm run check:db

# Verify frontend build
npm run check:frontend

# Verify OpenAI API connectivity
npm run check:openai
```