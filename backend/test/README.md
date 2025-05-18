# Airport Capacity Planning System Testing Framework

This testing framework provides a systematic approach to validating the integrated functionality of the Airport Capacity Planning System. It includes test data generation, execution, and validation components to ensure the stand allocation algorithm and capacity assessment features work correctly across different scales of operation.

## Test Design Philosophy

The tests are designed to:

1. Create a consistent, controlled environment with predictable base data
2. Progressively increase the complexity and scale of flight schedules
3. Validate both the allocation algorithm's effectiveness and the system's ability to handle constraints
4. Provide detailed metrics on stand utilization and allocation success rates
5. Compare actual results against expected outcomes to verify system correctness

## Directory Structure

```
backend/test/
├── README.md                # This documentation file
├── validate-results.js      # Validation module for test results
├── flight-schedules/        # Test flight schedules
│   ├── basic/               # Basic test scenarios
│   │   ├── sample.csv       # Sample flight schedule (16 flights)
│   │   ├── peak-hour.csv    # Peak hour test (48 flights)
│   │   └── full-day.csv     # Full day test (200 flights)
│   ├── weekly/              # Weekly test scenarios
│   │   └── weekly-schedule.csv  # Week-long flight patterns (150 flights)
│   └── monthly/             # Monthly test scenarios
│       └── monthly-schedule.csv # Month-long patterns (400 flights)
```

## Components

### Seed Data Script (`/scripts/seed-test-data.js`)

This script establishes a consistent baseline of test data, including:

- Base airport configuration (LHR)
- Consistent stand definitions across terminals
- Aircraft type configurations with appropriate turnaround times
- Airline definitions with terminal preferences and contact stand requirements
- Operational settings (safety gaps, turnaround times, etc.)
- Maintenance requests on specific stands to validate constraint handling

### Test Flight Schedules

Flight schedules of increasing complexity:

1. **Sample Test** (`flight-schedules/basic/sample.csv`)
   - 16 flights across a two-day period
   - Basic validation of core allocation functionality

2. **Peak Hour Test** (`flight-schedules/basic/peak-hour.csv`)
   - ~48 flights concentrated in a 6-9am period
   - Tests stand contention during peak operations
   - Validates allocation prioritization and constraint handling

3. **Full Day Test** (`flight-schedules/basic/full-day.csv`)
   - ~200 flights across a complete 24-hour cycle
   - Tests allocation throughout different periods of the day
   - Validates the system's ability to handle typical operational patterns

4. **Weekly Test** (`flight-schedules/weekly/weekly-schedule.csv`)
   - ~150 flights across a 7-day period
   - Models weekday vs weekend traffic patterns
   - Tests the system's handling of day-of-week variations
   - Includes business travel peaks (Thursday) and leisure travel patterns (Saturday-Sunday)
   - Validates more complex allocation scenarios with different operational constraints

5. **Monthly Test** (`flight-schedules/monthly/monthly-schedule.csv`)
   - ~400 flights across a 4-week period
   - Each week represents a different pattern in the month:
     - Week 1: Regular operations
     - Week 2: Mid-month business travel increase
     - Week 3: Beginning of summer travel peak
     - Week 4: School holiday impact
   - Tests the system's ability to handle seasonal variations
   - Validates allocation with changing demand patterns throughout a month

### Validation Module (`/test/validate-results.js`)

Provides functions to validate the results against expected outcomes:

- Allocation success rate checks
- Terminal utilization validation
- Unallocated flight reason analysis
- Comprehensive reporting of test outcomes

### Test Runner (`/run-tests.js`)

Orchestrates the test execution:

1. Seeds the test data
2. Processes the appropriate flight schedule
3. Executes the stand allocation algorithm
4. Validates results against expected outcomes
5. Generates detailed reports on test success/failure

## Running the Tests

Execute tests using the test runner:

```bash
# Run the sample test (default)
node backend/run-tests.js

# Run the peak hour test
node backend/run-tests.js peak-hour

# Run the full day test
node backend/run-tests.js full-day

# Run the weekly test
node backend/run-tests.js weekly

# Run the monthly test
node backend/run-tests.js monthly
```

## Complete Test Suite

Run all tests in sequence:

```bash
node backend/run-all-tests.js
```

## Expected Results

Each test has predefined expected outcomes including:

- Expected allocation success rate
- Terminal utilization targets
- Expected unallocation reasons

The expected success rates decrease as complexity increases:
- Sample test: 90% allocation rate
- Peak hour test: 85% allocation rate
- Full day test: 80% allocation rate
- Weekly test: 78% allocation rate
- Monthly test: 75% allocation rate

This decreasing success rate models the real-world challenge of allocating stands with increasing complexity, variability, and longer time horizons.

## Weekly Test Pattern Details

The weekly test models flight patterns across a full week, capturing:

- Regular weekday patterns (Monday-Wednesday)
- Business travel peak (Thursday)
- Mixed business and leisure (Friday)
- Leisure travel peak (Saturday)
- Return leisure peak (Sunday)

This test validates:
- Day-of-week allocation patterns
- Recovery from busy periods
- Terminal preference handling across a week
- Consistent stand allocations for recurring flights

## Monthly Test Pattern Details

The monthly test samples four different weeks within a month, illustrating:

- Regular operations (Week 1)
- Mid-month business travel increase (Week 2)
- Summer travel peak begins (Week 3)
- School holiday impact (Week 4)

This test validates:
- Handling of seasonal variations
- Allocation prioritization under different demand patterns
- Terminal utilization across different operational modes
- Impact of monthly flight pattern evolution on stand allocations

## Extending the Framework

To add new test cases:

1. Create a new CSV file in the appropriate subdirectory of `test/flight-schedules/`
2. Add the test file mapping in `run-tests.js`
3. Define expected results in the `EXPECTED_RESULTS` object
4. Run your new test with `node backend/run-tests.js your-test-name`

## Understanding Test Results

The test runner generates detailed validation results that include:

- Overall allocation metrics (total flights, allocation rate)
- Terminal-by-terminal utilization statistics
- Reasons for unallocated flights
- Pass/fail status for each validation criterion

## Troubleshooting

If tests fail, examine the validation results to understand specific areas of failure:

- Flight count discrepancies may indicate upload processing issues
- Allocation rate failures may indicate algorithm configuration problems
- Terminal utilization issues may point to stand compatibility or assignment logic problems
- Unexpected unallocation reasons may reveal constraint handling issues 