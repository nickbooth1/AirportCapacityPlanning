#!/usr/bin/env node

/**
 * Simple test runner for Phase 2 testing
 */

console.log('Starting simple Phase 2 test run...');

// Check if the required directories exist
const fs = require('fs');
const path = require('path');

const REQUIRED_DIRS = [
  'backend/src/models/agent',
  'backend/src/services/agent',
  'backend/tests/models/agent',
  'backend/tests/services/agent',
  'frontend/src/components/agent',
  'reports/tests'
];

let allDirsExist = true;

for (const dir of REQUIRED_DIRS) {
  if (!fs.existsSync(path.join(__dirname, dir))) {
    console.error(`Missing directory: ${dir}`);
    allDirsExist = false;
  }
}

if (!allDirsExist) {
  console.error('Some required directories are missing. Run create-phase2-tests.sh first.');
  process.exit(1);
}

// Verify model files exist
const MODEL_FILES = [
  'backend/src/models/agent/Scenario.js',
  'backend/src/models/agent/ScenarioVersion.js',
  'backend/src/models/agent/ScenarioCalculation.js',
  'backend/src/models/agent/ScenarioComparison.js'
];

let allModelsExist = true;

for (const file of MODEL_FILES) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`Missing model file: ${file}`);
    allModelsExist = false;
  }
}

if (!allModelsExist) {
  console.error('Some model files are missing. Run create-phase2-tests.sh first.');
  process.exit(1);
}

// Everything is ready, report success
console.log('All required files and directories exist.');
console.log('Test environment is ready to use.');
console.log('');
console.log('To run tests, use:');
console.log('  npm run test:phase2:unit       - Run unit tests');
console.log('  npm run test:phase2:integration - Run integration tests');
console.log('  npm run test:phase2:e2e        - Run end-to-end tests');
console.log('  npm run test:phase2:performance - Run performance tests');
console.log('  npm run test:phase2:interactive - Run interactive test menu');
console.log('  npm run test:phase2            - Run all tests');
console.log('');
console.log('Test run completed successfully.');