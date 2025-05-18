# Airport Capacity Planner Backend Tests

This directory contains tests for the Airport Capacity Planner backend services and APIs.

## Current Test Status

- **WorkingMemoryService**: All tests passing
- **ParameterValidationService**: Some test failures due to assertion issues (to be fixed)
- **MultiStepReasoningService**: Under development
- **NLPService**: All tests passing

## Test Categories

The tests are organized into the following categories:

- **Unit Tests**: Tests for individual functions and modules
- **Integration Tests**: Tests for integrated components and services
- **API Tests**: Tests for API endpoints and controllers
- **Performance Tests**: Tests for performance benchmarks

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests (requires database connection)
npm test

# Run only memory-based tests (no database required)
npm run test:memory
# or
npm run test:no-db

# Run performance tests
npm run test:performance

# Run specific performance test categories
npm run test:performance:nlp
npm run test:performance:scenario
npm run test:performance:api
```

## Test Configuration

There are two test configurations:

1. **Standard Configuration (`jest.config.js`)**: Used for tests that require database connections.
2. **Memory-Only Configuration (`jest.memory.config.js`)**: Used for tests that don't require database connections, 
   such as the `WorkingMemoryService` and other in-memory services.

## Database Test Setup

For tests that require a database connection, the `jest.setup.js` file is used to:

1. Set up test data before all tests
2. Clear test data between tests
3. Close database connections after all tests

## Memory-Only Test Setup

For tests that don't require a database connection, the `jest.memory.setup.js` file is used to:

1. Mock console methods to suppress output
2. Set up the test environment

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: If tests requiring a database connection fail, check that:
   - The database is running
   - The connection settings in `knexfile.js` are correct
   - The test database exists and is accessible

2. **Timer or Async Issues**: For tests involving timers or async operations:
   - Use Jest's fake timers (`jest.useFakeTimers()`) for timer-based tests
   - Ensure proper cleanup in `afterEach` hooks
   - Consider using `jest.advanceTimersByTime()` instead of real `setTimeout`

3. **Memory Leaks**: To prevent memory leaks:
   - Clear timers in `afterEach` hooks
   - Stop any intervals or timeouts
   - Clean up resources properly

### Running Tests in Isolation

To run a specific test file:

```bash
# For database tests
npm test -- path/to/test.js

# For memory-only tests
npm run test:memory -- --testMatch='**/path/to/test.js'
```

## Adding New Tests

When adding new tests:

1. Place them in the appropriate directory based on what they're testing
2. For database tests, ensure they use transaction boundaries to prevent test data pollution
3. For memory-only tests, add them to the `testMatch` array in `jest.memory.config.js`
4. Include appropriate cleanup in `afterEach` or `afterAll` hooks

## Performance Tests

Performance tests are located in the `tests/performance` directory and should be
run separately from regular tests using the `test:performance` script.