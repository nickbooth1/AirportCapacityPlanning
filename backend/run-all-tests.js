/**
 * Run All Tests Script
 * 
 * This script runs all the test cases in sequence to validate the entire
 * Airport Capacity Planning System.
 * 
 * Usage: node run-all-tests.js
 */

const { runTest } = require('./run-tests');

// Define the tests to run in sequence
const TEST_SEQUENCE = [
  'sample',    // Basic test with 16 flights
  'peak-hour', // Peak hour test with ~48 flights
  'full-day',  // Full day test with ~200 flights
  'weekly',    // Weekly test with ~150 flights over 7 days
  'monthly'    // Monthly test with ~400 flights over 4 weeks
];

// Store the results of each test
const results = {};

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('AIRPORT CAPACITY PLANNING SYSTEM - FULL TEST SUITE');
  console.log('='.repeat(80));
  
  let allPassed = true;
  
  // Run each test in sequence
  for (const testName of TEST_SEQUENCE) {
    console.log(`\nStarting test: ${testName}`);
    
    try {
      const result = await runTest(testName);
      results[testName] = result;
      
      if (!result.success) {
        allPassed = false;
        console.error(`Test "${testName}" failed!`);
      } else {
        console.log(`Test "${testName}" completed successfully.`);
      }
    } catch (error) {
      results[testName] = { success: false, error: error.message };
      allPassed = false;
      console.error(`Test "${testName}" failed with error:`, error);
    }
    
    console.log('-'.repeat(40));
  }
  
  // Print summary
  console.log('\nTEST SUMMARY:');
  console.log('='.repeat(80));
  
  let passedCount = 0;
  for (const testName of TEST_SEQUENCE) {
    const success = results[testName]?.success || false;
    console.log(`${testName}: ${success ? 'PASS' : 'FAIL'}`);
    
    if (success) {
      passedCount++;
    }
  }
  
  console.log('-'.repeat(40));
  console.log(`Passed: ${passedCount} / ${TEST_SEQUENCE.length} (${Math.round(passedCount * 100 / TEST_SEQUENCE.length)}%)`);
  console.log(`Overall Result: ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(80));
  
  return allPassed;
}

// Execute if run directly
if (require.main === module) {
  runAllTests()
    .then(allPassed => {
      console.log('\nTest suite completed.');
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests }; 