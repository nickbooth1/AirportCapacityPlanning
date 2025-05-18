/**
 * Test Runner Script
 * 
 * This script runs the various test cases to validate the airport capacity planning system.
 * Each test case loads a different flight schedule and processes it through the system.
 * 
 * Usage: node run-tests.js [test-name]
 * 
 * Available tests:
 * - sample: Basic test with the fixed sample file (16 flights)
 * - peak-hour: Test with a busy morning period (6-9am, ~48 flights)
 * - full-day: Test with a complete 24-hour cycle (~200 flights)
 * - weekly: Test with a week-long schedule (~150 flights across different days)
 * - monthly: Test with a month-long schedule (~400 flights across different weeks)
 * 
 * If no test name is provided, it will run the sample test.
 */

const fs = require('fs');
const path = require('path');
const { seedTestData } = require('./scripts/seed-test-data');
const { runInjectionAndProcess } = require('./run-flight-injection');
const { validateResults } = require('./test/validate-results');

// Map test names to their CSV files
const TEST_FILES = {
  'sample': 'test/flight-schedules/basic/sample.csv',
  'peak-hour': 'test/flight-schedules/basic/peak-hour.csv',
  'full-day': 'test/flight-schedules/basic/full-day.csv',
  'weekly': 'test/flight-schedules/weekly/weekly-schedule.csv',
  'monthly': 'test/flight-schedules/monthly/monthly-schedule.csv'
};

// Map test names to their expected results (for validation)
const EXPECTED_RESULTS = {
  'sample': {
    totalFlights: 16,
    expectedAllocationRate: 0.9, // 90% allocation success rate expected
    standUtilization: {
      'T1': 0.25, // Terminal 1 utilization 25%
      'T2': 0.30, // Terminal 2 utilization 30%
      'T3': 0.40, // Terminal 3 utilization 40%
      'T4': 0.30, // Terminal 4 utilization 30%
      'T5': 0.35  // Terminal 5 utilization 35%
    }
  },
  'peak-hour': {
    totalFlights: 48,
    expectedAllocationRate: 0.85, // 85% allocation success rate expected
    standUtilization: {
      'T1': 0.60, // Terminal 1 utilization 60%
      'T2': 0.75, // Terminal 2 utilization 75%
      'T3': 0.80, // Terminal 3 utilization 80%
      'T4': 0.70, // Terminal 4 utilization 70%
      'T5': 0.85  // Terminal 5 utilization 85%
    },
    expectedUnallocatedReasons: [
      "No compatible stand available during required time period",
      "Stand maintenance conflict"
    ]
  },
  'full-day': {
    totalFlights: 200,
    expectedAllocationRate: 0.80, // 80% allocation success rate expected
    standUtilization: {
      'T1': 0.70, // Terminal 1 utilization 70%
      'T2': 0.80, // Terminal 2 utilization 80%
      'T3': 0.85, // Terminal 3 utilization 85%
      'T4': 0.75, // Terminal 4 utilization 75%
      'T5': 0.90  // Terminal 5 utilization 90%
    },
    expectedUnallocatedReasons: [
      "No compatible stand available during required time period",
      "Stand maintenance conflict",
      "Adjacency constraint violation",
      "No stand compatible with aircraft size"
    ]
  },
  'weekly': {
    totalFlights: 150,
    expectedAllocationRate: 0.78, // 78% allocation success rate expected
    standUtilization: {
      'T1': 0.65, // Terminal 1 utilization 65%
      'T2': 0.75, // Terminal 2 utilization 75%
      'T3': 0.80, // Terminal 3 utilization 80%
      'T4': 0.70, // Terminal 4 utilization 70%
      'T5': 0.85  // Terminal 5 utilization 85%
    },
    expectedUnallocatedReasons: [
      "No compatible stand available during required time period",
      "Stand maintenance conflict",
      "Adjacency constraint violation",
      "No stand compatible with aircraft size",
      "Terminal preference not available"
    ]
  },
  'monthly': {
    totalFlights: 400,
    expectedAllocationRate: 0.75, // 75% allocation success rate expected
    standUtilization: {
      'T1': 0.70, // Terminal 1 utilization 70%
      'T2': 0.80, // Terminal 2 utilization 80%
      'T3': 0.85, // Terminal 3 utilization 85%
      'T4': 0.75, // Terminal 4 utilization 75%
      'T5': 0.90  // Terminal 5 utilization 90%
    },
    expectedUnallocatedReasons: [
      "No compatible stand available during required time period",
      "Stand maintenance conflict",
      "Adjacency constraint violation",
      "No stand compatible with aircraft size",
      "Terminal preference not available",
      "Operational constraint violation"
    ]
  }
};

/**
 * Run a specific test
 * @param {string} testName - Name of the test to run
 */
async function runTest(testName) {
  try {
    console.log('='.repeat(80));
    console.log(`RUNNING TEST: ${testName}`);
    console.log('='.repeat(80));
    
    // 1. Seed the test data
    console.log('Seeding test data...');
    const seedResult = await seedTestData();
    
    if (!seedResult.success) {
      throw new Error(`Failed to seed test data: ${seedResult.error}`);
    }
    
    console.log('Test data seeded successfully');
    
    // 2. Create a temporary test file copy with today's date
    const sourceFile = path.join(__dirname, TEST_FILES[testName]);
    const tempFile = path.join(__dirname, `temp_${testName}_${Date.now()}.csv`);
    
    // Read the source file
    const fileContent = fs.readFileSync(sourceFile, 'utf8');
    
    // Replace date with today + 1 day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    
    // Replace all instances of the date (2025-05-20 or 2025-06-XX) with tomorrow's date
    const updatedContent = fileContent.replace(/2025-0[56]-\d{2}/g, tomorrowDateStr);
    
    // Write the updated content to the temp file
    fs.writeFileSync(tempFile, updatedContent);
    
    console.log(`Created temporary test file: ${tempFile}`);
    
    // 3. Override the inject-test-flights.js behavior to use our test file
    const originalInjectFunc = require('./inject-test-flights').main;
    
    require('./inject-test-flights').main = async function() {
      console.log(`Using test file: ${tempFile}`);
      
      // Here we would ideally implement actual CSV file upload and processing
      // For now, we'll create a modified mock that counts lines in the CSV
      const csvLines = fs.readFileSync(tempFile, 'utf8').split('\n').filter(line => line.trim().length > 0);
      const flightCount = csvLines.length - 1; // Subtract 1 for header row
      
      return {
        success: true,
        uploadId: Date.now(),
        flightCount
      };
    };
    
    // 4. Run the injection and processing
    console.log('Running flight injection and processing...');
    const result = await runInjectionAndProcess();
    
    if (!result.success) {
      throw new Error(`Test failed: ${result.error}`);
    }
    
    console.log(`Test completed with upload ID: ${result.uploadId}, schedule ID: ${result.scheduleId}`);
    
    // 5. Validate the results
    console.log('Validating test results...');
    const validationResults = await validateResults(result.scheduleId, EXPECTED_RESULTS[testName]);
    
    console.log('\nVALIDATION RESULTS:');
    console.log('-'.repeat(40));
    console.log(`Schedule: ${validationResults.schedule.name} (ID: ${validationResults.schedule.id})`);
    console.log(`Status: ${validationResults.schedule.status}`);
    console.log(`Total Flights: ${validationResults.metrics.totalFlights}`);
    console.log(`Allocated: ${validationResults.metrics.allocatedCount} (${(validationResults.metrics.actualAllocationRate * 100).toFixed(1)}%)`);
    console.log(`Unallocated: ${validationResults.metrics.unallocatedCount}`);
    
    console.log('\nTerminal Utilization:');
    Object.entries(validationResults.terminalUtilization).forEach(([terminal, stats]) => {
      console.log(`  ${terminal}: ${(stats.average * 100).toFixed(1)}% (${stats.standCount} stands, range: ${(stats.min * 100).toFixed(1)}% - ${(stats.max * 100).toFixed(1)}%)`);
    });
    
    console.log('\nUnallocation Reasons:');
    validationResults.unallocationReasons.forEach(reason => {
      console.log(`  - ${reason}`);
    });
    
    console.log('\nValidation Checks:');
    console.log(`  Flight Count: ${validationResults.validations.flightCountValid ? 'PASS' : 'FAIL'}`);
    console.log(`  Allocation Rate: ${validationResults.validations.allocationRateValid ? 'PASS' : 'FAIL'}`);
    console.log(`  Terminal Utilization: ${validationResults.validations.terminalUtilizationValid ? 'PASS' : 'FAIL'}`);
    console.log(`  Unallocation Reasons: ${validationResults.validations.reasonsValid ? 'PASS' : 'FAIL'}`);
    
    console.log('-'.repeat(40));
    console.log(`OVERALL RESULT: ${validationResults.allValidationsPass ? 'PASS' : 'FAIL'}`);
    
    // 6. Clean up the temporary file
    fs.unlinkSync(tempFile);
    console.log(`Removed temporary test file: ${tempFile}`);
    
    // Restore original inject function
    require('./inject-test-flights').main = originalInjectFunc;
    
    console.log('='.repeat(80));
    return { 
      success: validationResults.allValidationsPass, 
      result: validationResults 
    };
  } catch (error) {
    console.error(`Test "${testName}" failed:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  // Get the test name from command line arguments
  const testName = process.argv[2] || 'sample';
  
  if (!TEST_FILES[testName]) {
    console.error(`Unknown test name: ${testName}`);
    console.error('Available tests:', Object.keys(TEST_FILES).join(', '));
    process.exit(1);
  }
  
  const result = await runTest(testName);
  
  if (result.success) {
    console.log(`Test "${testName}" completed successfully!`);
    process.exit(0);
  } else {
    console.error(`Test "${testName}" failed:`, result.error);
    process.exit(1);
  }
}

// Execute if script is run directly
if (require.main === module) {
  main()
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runTest }; 