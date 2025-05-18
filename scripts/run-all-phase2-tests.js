#!/usr/bin/env node
/**
 * Master test runner for AirportAI Phase 2
 * Runs all test types: unit, integration, e2e, and performance
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const config = {
  logDir: path.resolve(__dirname, '../logs/tests'),
};

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// Simple logger
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  const logFile = path.join(config.logDir, 'master-test-run.log');
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// Run a script and return a promise
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    log(`Running script: ${scriptPath}`);
    
    const process = spawn('node', [scriptPath], { 
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (code === 0) {
        log(`Script ${scriptPath} completed successfully in ${duration.toFixed(2)} seconds`);
        resolve({ success: true, duration });
      } else {
        log(`Script ${scriptPath} failed with exit code ${code} in ${duration.toFixed(2)} seconds`);
        resolve({ success: false, code, duration });
      }
    });
    
    process.on('error', (error) => {
      log(`Script execution error: ${error.message}`);
      reject(error);
    });
  });
}

// Check database connection
async function checkDatabase() {
  log('Checking database connection...');
  
  try {
    // Directly require the database module to test the connection
    // This will use the actual database configuration from .env or defaults
    const dbCheckScript = `
      try {
        const db = require('./backend/src/utils/db');
        db.testConnection()
          .then(() => {
            console.log('Database connection successful');
            process.exit(0);
          })
          .catch(err => {
            console.error('Database connection failed:', err.message);
            process.exit(1);
          });
      } catch (err) {
        console.error('Error loading database module:', err.message);
        process.exit(1);
      }
    `;
    
    return new Promise((resolve, reject) => {
      const process = spawn('node', ['-e', dbCheckScript]);
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          log('✅ Database connection verified successfully');
          resolve(true);
        } else {
          log(`❌ Database connection failed: ${output}`);
          resolve(false);
        }
      });
    });
  } catch (error) {
    log(`❌ Error checking database: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  log(`Starting AirportAI Phase 2 complete test run - ${timestamp}`);
  
  const startTime = Date.now();
  const results = {};
  
  try {
    // Verify database connection first
    log('=== Verifying Database Connection ===');
    const dbConnected = await checkDatabase();
    
    if (!dbConnected) {
      log('⚠️ Warning: Database connection failed. Some tests may not work correctly.');
      log('Tests will continue but may use mocks where database is needed.');
      // Don't exit - allow user to decide if they want to continue with mocks or fix DB
    } else {
      log('Database connection verified - tests will use actual database');
    }
    
    // Run all test types in sequence
    log('=== Running Unit Tests ===');
    results.unit = await runScript(path.join(__dirname, 'simple-test-runner.js'));
    
    log('=== Running Integration Tests ===');
    results.integration = await runScript(path.join(__dirname, 'run-integration-tests.js'));
    
    log('=== Running E2E Tests ===');
    results.e2e = await runScript(path.join(__dirname, 'run-e2e-tests.js'));
    
    log('=== Running Performance Tests ===');
    results.performance = await runScript(path.join(__dirname, 'run-performance-tests.js'));
    
    // Calculate total duration
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    // Generate summary
    const allPassed = Object.values(results).every(result => result.success);
    
    log('=== Test Run Summary ===');
    log(`Total Duration: ${totalDuration.toFixed(2)} seconds`);
    log(`Overall Status: ${allPassed ? 'SUCCESS' : 'FAILURE'}`);
    
    // Log individual test results
    Object.entries(results).forEach(([type, result]) => {
      log(`${type.toUpperCase()}: ${result.success ? 'PASSED' : 'FAILED'} in ${result.duration.toFixed(2)} seconds`);
    });
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    log(`Error during test run: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();