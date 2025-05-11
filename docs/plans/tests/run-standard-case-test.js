#!/usr/bin/env node

/**
 * Stand Capacity Tool: Standard Case Test Runner
 * 
 * This script runs the test-standard-case.js test to verify that 
 * the standard case capacity implementation works correctly.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Paths
const TEST_SCRIPT_PATH = path.join(__dirname, 'test-standard-case.js');
const LOG_FILE_PATH = path.join(__dirname, 'standard-case-test-results.log');

// Clear logs
if (fs.existsSync(LOG_FILE_PATH)) {
  fs.unlinkSync(LOG_FILE_PATH);
}

console.log('=== STAND CAPACITY TOOL: STANDARD CASE TEST RUNNER ===');
console.log(`Running test script: ${TEST_SCRIPT_PATH}`);
console.log(`Results will be logged to: ${LOG_FILE_PATH}`);

try {
  // Run the test script
  const output = execSync(`node ${TEST_SCRIPT_PATH}`, { encoding: 'utf8' });
  
  // Write results to log file
  fs.writeFileSync(LOG_FILE_PATH, output);
  
  // Check if test passed
  if (output.includes('VERIFICATION PASSED')) {
    console.log('\n✅ TEST PASSED');
    console.log('The standard case capacity implementation is working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ TEST FAILED');
    console.log('The standard case capacity implementation has issues. See log file for details.');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ ERROR RUNNING TEST');
  console.error(error.message);
  
  // Write error to log file
  fs.writeFileSync(LOG_FILE_PATH, `ERROR: ${error.message}\n\n${error.stack}`);
  
  process.exit(1);
} 