# Test Cases for Phase 2: CLI Tool with Live Data

This document outlines the test cases for verifying the functionality of the Phase 2 implementation - the Capacity Impact Analyzer CLI tool with live data connections.

## Test Environment Setup

Before running the tests, ensure the following:

1. Database is accessible with proper credentials
2. Sample data is populated in the following tables:
   - `stands`
   - `aircraft_types`
   - `maintenance_requests`
   - `stand_aircraft_constraints`
   - `maintenance_status_types`
   - `operational_settings`
3. The test script has execution permissions: `chmod +x test_live_cli.sh`

## Test Cases

### 1. Basic Functionality Tests

#### TC1.1: Single Day Analysis
- **Description**: Verify the tool can analyze a single day with live data
- **Command**: `node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15`
- **Expected Output**:
  - Successful connection to database
  - Loading of all required data
  - Calculation of capacity impact for the specified date
  - Correctly formatted JSON output
  - Exit code 0

#### TC1.2: Multiple Days Analysis
- **Description**: Verify the tool can analyze a range of days with live data
- **Command**: `node live_cli.js --startDate 2023-12-15 --endDate 2023-12-17`
- **Expected Output**:
  - Successful analysis for each day in the range
  - Correct daily breakdown in the output
  - Exit code 0

#### TC1.3: Output to File
- **Description**: Verify the tool can save output to a file
- **Command**: `node live_cli.js --startDate 2023-12-15 --endDate 2023-12-15 --outputFile test_output.json`
- **Expected Output**:
  - File created with the specified name
  - File contains valid JSON
  - Exit code 0

### 2. Error Handling Tests

#### TC2.1: Invalid Date Format
- **Description**: Verify the tool rejects invalid date formats
- **Command**: `node live_cli.js --startDate 15-12-2023 --endDate 2023-12-17`
- **Expected Output**:
  - Error message indicating invalid date format
  - No analysis performed
  - Non-zero exit code

#### TC2.2: End Date Before Start Date
- **Description**: Verify the tool validates date range order
- **Command**: `node live_cli.js --startDate 2023-12-18 --endDate 2023-12-17`
- **Expected Output**:
  - Error message indicating invalid date range
  - No analysis performed
  - Non-zero exit code

#### TC2.3: Missing Required Arguments
- **Description**: Verify the tool requires start and end dates
- **Command**: `node live_cli.js --startDate 2023-12-15`
- **Expected Output**:
  - Error message indicating missing required argument(s)
  - Usage information displayed
  - Non-zero exit code

### 3. Data Integrity Tests

#### TC3.1: Maintenance Status Filtering
- **Description**: Verify that only relevant maintenance request statuses are included
- **Test Steps**:
  1. Run analysis for a date with known maintenance requests
  2. Examine the output to confirm only approved, in progress, completed (definite) and requested (potential) statuses are included
  3. Verify rejected and cancelled statuses are excluded
- **Expected Output**: Only maintenance requests with status IDs 1, 2, 4, and 5 are included in the analysis

#### TC3.2: Aircraft Categorization
- **Description**: Verify aircraft are correctly categorized as narrow body or wide body
- **Test Steps**:
  1. Run analysis for a date with mixed aircraft types
  2. Examine the output to confirm correct categorization
- **Expected Output**: Aircraft types are correctly categorized in capacity totals

#### TC3.3: Stand-Aircraft Compatibility
- **Description**: Verify only compatible aircraft-stand combinations are considered
- **Test Steps**:
  1. Run analysis and save detailed output
  2. Examine the compatibility rules applied
- **Expected Output**: Capacity counts reflect only valid aircraft-stand combinations

### 4. Performance Tests

#### TC4.1: Large Date Range
- **Description**: Verify the tool can handle a month-long analysis
- **Command**: `node live_cli.js --startDate 2023-12-01 --endDate 2023-12-31 --outputFile month_analysis.json`
- **Expected Output**:
  - Successful analysis with 31 days of data
  - Acceptable performance (completed within reasonable time)
  - Proper resource cleanup

#### TC4.2: Data Volume
- **Description**: Verify performance with a large number of maintenance requests
- **Test Steps**:
  1. Prepare test data with 100+ maintenance requests in the date range
  2. Run analysis
- **Expected Output**: Successful completion with accurate results and reasonable performance

### 5. Integration Tests

#### TC5.1: Database Schema Compatibility
- **Description**: Verify the tool works with the current database schema
- **Test Steps**:
  1. Review the table and column names used in queries
  2. Confirm they match the actual database schema
- **Expected Output**: No errors related to database schema mismatches

#### TC5.2: Service Integration
- **Description**: Verify integration with StandCapacityToolService and MaintenanceRequestService
- **Test Steps**:
  1. Run analysis with debug logging enabled
  2. Confirm proper service initialization and method calls
- **Expected Output**: Services are correctly initialized and used in the analysis process

#### TC5.3: Results Consistency
- **Description**: Verify results match expected values from known data
- **Test Steps**:
  1. Run analysis on a date with known maintenance impacts
  2. Compare output with manually calculated expected values
- **Expected Output**: Capacity impacts correctly calculated matching expected values

## Test Execution

The included `test_live_cli.sh` script automates many of these tests. Run it to quickly validate the implementation:

```bash
./test_live_cli.sh
```

For manual testing or more detailed analysis, run the individual commands outlined in the test cases above.

## Test Documentation

Document the test results including:
1. Test case ID and name
2. Date and time of testing
3. Test outcome (Pass/Fail)
4. Any observations or unexpected behavior
5. Screenshots or logs if relevant

This documentation will be valuable for tracking the validation of the implementation and identifying any areas that need improvement. 