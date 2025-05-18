# AirportAI Comprehensive Testing Framework

This document provides guidance on the testing framework for the Airport Capacity Planning System, with specific emphasis on the AirportAI Phase 2 implementation. It covers all aspects of testing, from unit tests to performance benchmarks.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [End-to-End Tests](#end-to-end-tests)
  - [Performance Tests](#performance-tests)
- [Directory Structure](#directory-structure)
- [Running Tests](#running-tests)
  - [Running All Tests](#running-all-tests)
  - [Running Specific Test Types](#running-specific-test-types)
  - [Running Individual Tests](#running-individual-tests)
- [Test Data](#test-data)
- [Test Coverage](#test-coverage)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The AirportAI testing framework is designed to ensure comprehensive validation of functionality across all system components. Our testing strategy follows a pyramid approach:

- **Unit Tests**: Fast, focused tests for individual functions and components
- **Integration Tests**: Validate interaction between multiple components
- **End-to-End Tests**: Test complete user workflows from UI to database
- **Performance Tests**: Measure and validate system performance characteristics

## Test Types

### Unit Tests

Unit tests verify the correctness of isolated components, functions, and methods.

**Backend Unit Tests:**
- Located in: `backend/tests/`
- Test individual services, models, and utilities
- Fast execution (<100ms per test)
- No database or external dependencies
- Run with Jest

**Frontend Unit Tests:**
- Located in: `frontend/tests/`
- Test React components in isolation
- Use React Testing Library and Jest
- Mock all external dependencies

### Integration Tests

Integration tests verify the interaction between multiple components.

**Backend Integration Tests:**
- Located in: `backend/tests/integration/`
- Test interaction between services, API endpoints, and database
- Require test database
- Run with Jest

**Frontend Integration Tests:**
- Located in: `frontend/tests/integration/`
- Test interaction between multiple React components
- Test form submissions and API interactions
- Mock API responses

### End-to-End Tests

End-to-end tests validate complete user workflows from UI to database.

- Located in: `frontend/tests/e2e/`
- Test entire user journeys
- Require both frontend and backend servers running
- Use Jest and Playwright or Cypress

### Performance Tests

Performance tests measure and validate system performance characteristics.

- Located in: `backend/tests/performance/`
- Test response times, throughput, and resource utilization
- Define performance thresholds
- Identify performance bottlenecks

## Directory Structure

```
/
├── backend/
│   ├── tests/
│   │   ├── integration/            # Backend integration tests
│   │   │   ├── entity-relationships.test.js
│   │   │   ├── capacity.test.js
│   │   │   ├── capacityImpactAnalysis.test.js
│   │   │   └── agent/              # AirportAI agent integration tests
│   │   ├── models/                 # Model unit tests
│   │   ├── routes/                 # API route tests
│   │   ├── services/               # Service unit tests
│   │   │   ├── AggregatedCapacityImpactService.test.js
│   │   │   ├── standCapacityService.test.js
│   │   │   └── agent/              # AirportAI agent service tests
│   │   ├── utils/                  # Utility function tests
│   │   └── performance/            # Performance tests
│   │       ├── README.md           # Performance testing documentation
│   │       ├── agent/              # Agent performance tests
│   │       └── utils/              # Performance test utilities
├── frontend/
│   ├── tests/
│   │   ├── components/             # Component unit tests
│   │   │   ├── capacity/           # Capacity component tests
│   │   │   ├── maintenance/        # Maintenance component tests
│   │   │   └── agent/              # Agent component tests
│   │   ├── integration/            # Frontend integration tests
│   │   │   └── agent/              # Agent integration tests
│   │   ├── e2e/                    # End-to-end tests
│   │   └── api/                    # API client tests
├── tests/
│   ├── README.md                   # This documentation file
└── scripts/
    └── run-phase2-tests.js         # Test runner script
```

## Running Tests

### Running All Tests

To run the complete test suite, use the Phase 2 test runner script:

```bash
# Run all tests
node scripts/run-phase2-tests.js --all

# Interactive mode
node scripts/run-phase2-tests.js
```

### Running Specific Test Types

To run specific types of tests:

```bash
# Run only unit tests
node scripts/run-phase2-tests.js --unit

# Run only integration tests
node scripts/run-phase2-tests.js --integration

# Run only end-to-end tests
node scripts/run-phase2-tests.js --e2e

# Run only performance tests
node scripts/run-phase2-tests.js --performance
```

### Running Individual Tests

To run individual tests with Jest:

```bash
# Backend unit tests
npx jest backend/tests/services/agent/NLPService.test.js

# Frontend component tests
npx jest frontend/tests/components/agent/WhatIfAnalysis.test.js

# Integration tests
npx jest backend/tests/integration/agent/scenarioWorkflow.test.js

# E2E tests
npm run test:e2e frontend/tests/e2e/WhatIfScenarioJourney.test.js
```

## Test Data

The test framework uses controlled test data for predictable and repeatable tests.

**Flight Schedule Test Data:**
- Located in: `backend/test/flight-schedules/`
- Organized by complexity (basic, weekly, monthly)
- Progressively increases in scale and complexity

**Seed Data Script:**
- Located at: `backend/scripts/seed-test-data.js`
- Creates consistent baseline data for tests
- Includes airport configuration, stands, aircraft types, etc.

## Test Coverage

We maintain high test coverage for critical system components:

- Core services: >90% coverage
- API endpoints: >85% coverage
- UI components: >80% coverage
- Utility functions: >95% coverage

To generate and view coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open backend/coverage/lcov-report/index.html
```

## Adding New Tests

### Adding Backend Tests

1. Create a new test file in the appropriate directory:
   - Unit tests: `backend/tests/[module]/[name].test.js`
   - Integration tests: `backend/tests/integration/[module]/[name].test.js`
   - Performance tests: `backend/tests/performance/[module]/[name].test.js`

2. Follow the Jest test pattern:

```javascript
describe('ModuleName', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Clean up
  });

  test('should perform expected behavior', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Adding Frontend Tests

1. Create a new test file in the appropriate directory:
   - Component tests: `frontend/tests/components/[module]/[Component].test.js`
   - Integration tests: `frontend/tests/integration/[module]/[Workflow].test.js`
   - E2E tests: `frontend/tests/e2e/[Journey].test.js`

2. Follow the React Testing Library pattern:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Component from '../../../components/module/Component';

describe('Component', () => {
  test('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  test('handles user interaction', () => {
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    // Assert expected behavior
  });
});
```

### Adding Performance Tests

1. Create a new test file in `backend/tests/performance/[module]/[name].test.js`
2. Define performance thresholds
3. Implement test cases that measure specific performance characteristics
4. Add the new test to the test suite configuration in `run-phase2-tests.js`

## Troubleshooting

### Common Test Failures

1. **Database Connection Issues**
   - Ensure test database is running
   - Check database credentials in `.env.test`
   - Verify migrations have been applied to test database

2. **Timeout Errors**
   - Increase test timeout in Jest configuration
   - Check for performance bottlenecks
   - Ensure external services are mocked

3. **Flaky Tests**
   - Isolate test environment (avoid shared state)
   - Use explicit waits instead of timeouts in E2E tests
   - Check for race conditions

4. **Environment Setup Issues**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Verify environment variables are properly set

### Debugging Tests

For detailed test debugging:

```bash
# Run tests in debug mode
npx jest --debug backend/tests/path/to/test.js

# Run tests with increased verbosity
npx jest --verbose backend/tests/path/to/test.js
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests
2. **Mock External Dependencies**: Use Jest mocks for external services, APIs, and databases
3. **Descriptive Test Names**: Use clear and descriptive test names that explain the behavior being tested
4. **Arrange-Act-Assert Pattern**: Structure tests in a clear pattern with setup, action, and verification
5. **Test Edge Cases**: Include tests for boundary conditions, error handling, and edge cases
6. **Avoid Test Duplication**: Refactor common test setup into helper functions or fixtures
7. **Maintain Test Fixtures**: Keep test data up-to-date with schema changes
8. **Performance Awareness**: Be mindful of test execution time, especially for CI/CD pipelines
9. **Test Coverage Balance**: Focus on testing complex logic thoroughly while being pragmatic about simple code
10. **Continuous Improvement**: Regularly review and improve tests as the system evolves