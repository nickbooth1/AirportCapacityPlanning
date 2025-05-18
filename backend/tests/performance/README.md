# AirportAI Phase 2 Performance Tests

This directory contains performance tests for the AirportAI Phase 2 functionality. These tests are designed to measure and validate the performance characteristics of various components of the system under different load conditions.

## Test Suites

The performance tests are organized into the following categories:

### NLP Processing Performance

Tests for natural language processing components:
- Processing time for various complexity levels of inputs
- Concurrent NLP processing capabilities
- Memory usage during NLP operations
- Consistency of processing across similar requests

### Scenario Calculation Performance

Tests for scenario calculation functionality:
- Calculation time for different scenario complexities
- Performance with large datasets
- Concurrent scenario calculation capabilities
- Memory usage during calculations
- Caching effectiveness

### API Performance

Tests for API endpoints:
- Response times for different endpoints
- Performance under various loads (concurrent requests)
- Pagination and filtering performance
- Throughput and error rates

## Running the Tests

### Prerequisites

- Node.js 14+ installed
- Project dependencies installed (`npm install`)
- Test database configured

### Running All Performance Tests

To run all performance tests:

```bash
npm run test:phase2:performance
```

### Running Specific Test Suites

To run specific test suites:

```bash
# NLP Processing tests
npx jest backend/tests/performance/agent/nlpProcessingPerformance.test.js

# Scenario Calculation tests
npx jest backend/tests/performance/agent/scenarioCalculationPerformance.test.js

# API Performance tests
npx jest backend/tests/performance/agent/apiPerformanceTest.test.js
```

## Test Configuration

Performance thresholds are defined in each test file. You may need to adjust these thresholds based on your specific hardware and environment.

### Key Threshold Settings

- **NLP Processing**:
  - Simple queries: 800ms
  - Moderate complexity: 2000ms
  - Complex queries: 5000ms

- **Scenario Calculation**:
  - Simple scenarios: 3000ms
  - Moderate scenarios: 10000ms
  - Complex scenarios: 30000ms
  - Very large scenarios: 90000ms

- **API Response Times**:
  - Simple read operations: 300-500ms
  - Write operations: 800-1000ms
  - Complex operations: 2000-5000ms

## Interpreting Results

Test results will show performance metrics including:
- Response/processing times for various operations
- Memory usage
- Throughput (requests per second)
- Error rates under load
- Performance degradation under sustained load

If any test exceeds the defined thresholds, it will fail, indicating a potential performance issue that needs to be addressed.

## Extending the Tests

To add new performance tests:

1. Create a new test file in the appropriate subdirectory
2. Define appropriate thresholds based on performance requirements
3. Implement tests that measure specific performance characteristics
4. Add the new test to the test runner configuration

## Performance Profiling

For more detailed performance profiling:

- Use the `--expose-gc` Node.js flag to enable garbage collection in memory tests
- Consider using tools like Clinic.js or 0x for more detailed profiling
- For API load testing, consider using dedicated tools like k6 or Apache JMeter

## Continuous Performance Testing

To integrate performance testing into CI/CD:

1. Add performance test jobs to your CI pipeline
2. Set appropriate timeouts for long-running tests
3. Define performance budgets based on baseline measurements
4. Track performance metrics over time to identify regressions