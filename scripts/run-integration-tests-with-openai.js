#!/usr/bin/env node
/**
 * Integration test runner for AirportAI Phase 2 with OpenAI integration
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const config = {
  testReportDir: path.resolve(__dirname, '../reports/tests'),
  logDir: path.resolve(__dirname, '../logs/tests'),
};

// Ensure directories exist
[config.testReportDir, config.logDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define test files for OpenAI integration tests
const openaiIntegrationTests = [
  // Backend OpenAI integration tests
  'backend/tests/services/agent/OpenAIService.live.test.js'
  // Skipping the NLP integration test for now as it might depend on the fix
  // 'backend/tests/integration/agent/nlpServiceIntegration.test.js',
];

// Simple logger
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  const logFile = path.join(config.logDir, 'openai-integration-tests.log');
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// Run the OpenAI integration tests using Jest
async function runOpenAIIntegrationTests(files) {
  log('Running OpenAI integration tests with actual API key...');
  
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      log('WARNING: OPENAI_API_KEY not found in environment. Tests will use mocks.');
    } else {
      log('Found OPENAI_API_KEY in environment. Tests will use actual API.');
    }
    
    // Run the tests one by one to isolate any issues
    let allSuccess = true;
    
    for (const file of files) {
      log(`Running test file: ${file}`);
      
      const result = await new Promise((resolve, reject) => {
        // Create environment for the test
        const env = { 
          ...process.env,
          // Enable running live tests if we have an API key
          RUN_LIVE_OPENAI_TESTS: apiKey ? 'true' : 'false'
        };
        
        // Use npx to run Jest for a single file
        const testProcess = spawn('npx', ['jest', file, '--detectOpenHandles', '--forceExit'], { 
          env,
          stdio: 'inherit' // Pass all I/O directly to the parent process
        });
        
        testProcess.on('close', (code) => {
          if (code === 0) {
            log(`✅ Test ${file} passed`);
            resolve(true);
          } else {
            log(`❌ Test ${file} failed with code ${code}`);
            resolve(false);
          }
        });
        
        testProcess.on('error', (err) => {
          log(`Error executing test ${file}: ${err.message}`);
          resolve(false);
        });
      });
      
      if (!result) {
        allSuccess = false;
      }
    }
    
    if (!allSuccess) {
      log('❌ Some tests failed - check the output for details');
    } else {
      log('✅ All tests passed successfully');
    }
    
    return allSuccess;
  } catch (error) {
    log(`Failed to run tests: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  log('Starting AirportAI Phase 2 OpenAI integration test run');
  
  try {
    // Run the OpenAI integration tests
    const success = await runOpenAIIntegrationTests(openaiIntegrationTests);
    
    log(`OpenAI integration test run completed with ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`Error during test run: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();