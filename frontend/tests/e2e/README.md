# End-to-End (E2E) Tests for AirportAI Phase 2

This directory contains end-to-end tests for the AirportAI Phase 2 functionality. These tests simulate real user interactions with the system to verify that all components work correctly together.

## Testing Framework

- **Jest**: Testing framework for assertions
- **Puppeteer**: Headless browser automation for simulating user interactions
- **jest-image-snapshot**: Visual regression testing tool

## Test Files

### 1. WhatIfScenarioJourney.test.js
Tests the basic journey of creating a what-if scenario using both natural language and template-based approaches. Covers visualization and comparison of multiple scenarios.

### 2. ScenarioManagementJourney.test.js
Tests the management functionality including creating, editing, recalculating, comparing, and deleting scenarios.

### 3. ErrorHandlingJourney.test.js
Tests how the system handles various error conditions including:
- Invalid input handling
- NLP service unavailability
- Network errors and reconnection
- Concurrent operations and race conditions

### 4. FullScenarioWorkflow.test.js
Comprehensive end-to-end tests covering:
- Full workflow from dashboard to scenario creation to visualization
- Complete scenario management workflow including editing and comparison

## Running the Tests

### Run all E2E tests:
```bash
npm run test:phase2:e2e
```

### Run a specific E2E test:
```bash
npx jest frontend/tests/e2e/FullScenarioWorkflow.test.js
```

### Run in development mode (with browser visible):
```bash
CI=false npx jest frontend/tests/e2e/ErrorHandlingJourney.test.js
```

## Visual Regression Testing

These tests include visual regression testing using jest-image-snapshot. The first time the tests run, they will create baseline images. Subsequent test runs will compare against these baselines.

To update baseline images:
```bash
npx jest frontend/tests/e2e/WhatIfScenarioJourney.test.js -u
```

## Test Configuration

- Tests run headless in CI environments and with browser visible in local development
- Screenshots are taken at key points in the user journeys for visual verification
- Network requests are intercepted to mock authentication and simulate specific error conditions
- Timeouts and wait times are configurable in the test files

## Adding New Tests

When adding new E2E tests:
1. Create a new test file following the existing pattern
2. Add the file path to the `e2e` array in `/scripts/run-phase2-tests.js`
3. Follow the pattern of using page.setRequestInterception() for mocking API responses
4. Use takeScreenshot() at key points in the user journey
5. Add appropriate assertions to verify expected behavior