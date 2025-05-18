# AirportAI Phase 2 Testing Framework

This document provides an overview of the testing framework for AirportAI Phase 2 implementation, including information on how to run tests, the testing architecture, and troubleshooting tips.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Directory Structure](#directory-structure)
4. [Running Tests](#running-tests)
5. [Adding New Tests](#adding-new-tests)
6. [Test Coverage](#test-coverage)
7. [Troubleshooting](#troubleshooting)

## Overview

The AirportAI Phase 2 testing framework is designed to ensure comprehensive coverage of the AI-powered scenario analysis features added to the Airport Capacity Planner. The testing approach follows a pyramid structure with unit tests forming the base, integration tests in the middle, and end-to-end tests at the top.

## Test Types

### Unit Tests

Unit tests verify individual components in isolation by mocking dependencies:

- Backend unit tests for services, models, and controllers
- Frontend unit tests for React components and API clients

Key unit test files:
- `backend/tests/services/agent/NLPService.test.js`
- `backend/tests/services/agent/ScenarioService.test.js`
- `frontend/tests/components/agent/WhatIfAnalysis.test.js`
- `frontend/tests/components/agent/ScenarioVisualization.test.js`
- `frontend/tests/components/agent/ScenarioManagement.test.js`
- `frontend/tests/api/scenarioApi.test.js`

### Integration Tests

Integration tests verify that multiple components work together correctly:

- Backend integration tests for service-to-service and API endpoint interactions
- Frontend integration tests for component-to-component and component-to-API interactions

Key integration test files:
- `backend/tests/integration/agent/scenarioWorkflow.test.js`
- `backend/tests/integration/agent/scenarioApi.test.js`
- `backend/tests/integration/agent/nlpServiceIntegration.test.js`
- `frontend/tests/integration/agent/ScenarioWorkflowIntegration.test.js`
- `frontend/tests/integration/agent/ApiClientIntegration.test.js`

### End-to-End Tests

E2E tests verify complete user journeys using browser automation with Puppeteer:

Key E2E test files:
- `frontend/tests/e2e/WhatIfScenarioJourney.test.js`
- `frontend/tests/e2e/ScenarioManagementJourney.test.js`
- `frontend/tests/e2e/ErrorHandlingJourney.test.js`
- `frontend/tests/e2e/FullScenarioWorkflow.test.js`

### Performance Tests

Performance tests ensure the system meets required performance metrics:

Key performance test files:
- `backend/tests/performance/agent/nlpProcessingPerformance.test.js`
- `backend/tests/performance/agent/scenarioCalculationPerformance.test.js`
- `backend/tests/performance/agent/apiPerformanceTest.test.js`

## Directory Structure

```
/AirportCapacityPlanner
├── backend/tests/
│   ├── models/        # Backend model unit tests
│   ├── services/      # Backend service unit tests
│   │   └── agent/     # AirportAI-specific service tests
│   ├── controllers/   # Controller unit tests
│   ├── integration/   # Backend integration tests
│   │   └── agent/     # AirportAI-specific integration tests
│   └── performance/   # Performance tests
│       └── agent/     # AirportAI-specific performance tests
├── frontend/tests/
│   ├── components/    # Frontend component unit tests
│   │   └── agent/     # AirportAI-specific component tests
│   ├── api/           # API client tests
│   ├── integration/   # Frontend integration tests
│   │   └── agent/     # AirportAI-specific integration tests
│   └── e2e/           # End-to-end tests
├── reports/
│   ├── tests/         # Test reports output directory
│   └── performance/   # Performance test reports
├── logs/
│   └── tests/         # Test run logs
└── scripts/
    ├── simple-test-runner.js           # Unit test runner
    ├── run-integration-tests.js        # Integration test runner
    ├── run-e2e-tests.js                # E2E test runner
    ├── run-performance-tests.js        # Performance test runner
    └── run-all-phase2-tests.js         # Master test runner
```

## Running Tests

You can run tests using npm scripts defined in `package.json`:

```bash
# Run all tests
npm run test:phase2

# Run specific test types
npm run test:phase2:unit
npm run test:phase2:integration
npm run test:phase2:e2e
npm run test:phase2:performance

# Interactive test runner
npm run test:phase2:interactive
```

## Adding New Tests

### Adding a Unit Test

1. Create a new test file in the appropriate directory (`backend/tests/` or `frontend/tests/`)
2. Follow the Jest testing pattern for test structure
3. Use appropriate mocks for dependencies
4. Run the test using `npm run test:phase2:unit`

Example unit test structure:

```javascript
// frontend/tests/components/agent/NewComponent.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NewComponent from '../../../src/components/agent/NewComponent';

describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('handles user interaction', () => {
    render(<NewComponent />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Adding an Integration Test

1. Create a new test file in the appropriate integration test directory
2. Test the interaction between components rather than mocking all dependencies
3. Use transactions for database tests to ensure test isolation
4. Run the test using `npm run test:phase2:integration`

### Adding an E2E Test

1. Create a new test file in the `frontend/tests/e2e/` directory
2. Use Puppeteer for browser automation
3. Test complete user journeys from start to finish
4. Run the test using `npm run test:phase2:e2e`

## Test Coverage

The test coverage expectations for AirportAI Phase 2 are:

- Unit tests: 80% coverage of all components
- Integration tests: Coverage of all critical workflows
- E2E tests: Coverage of all user journeys
- Performance tests: Coverage of all performance-critical operations

Test coverage reports are generated in the `reports/coverage/` directory when running `npm run test:phase2` with the coverage option.

## Troubleshooting

### Common Issues

#### Test Failures Due to Database Issues

If tests fail due to database connection issues:

1. Check database connection in `.env` file
2. Ensure the database server is running
3. Run `npm run test:backend-db` to verify database connectivity

#### React Component Test Failures

If React component tests fail:

1. Check dependencies in the component's `package.json`
2. Ensure all required props are provided in test
3. Update snapshot tests if needed with `npm test -- -u`

#### End-to-End Test Failures

If E2E tests fail:

1. Check browser compatibility
2. Ensure server is running during E2E tests
3. Increase timeouts for slow operations
4. Check selectors match current implementation

### Getting Help

For additional help with the testing framework:

1. Check the test logs in `logs/tests/`
2. Review test reports in `reports/tests/`
3. Contact the development team for assistance

---

*Developed for the AirportAI Phase 2 Implementation*
EOF < /dev/null