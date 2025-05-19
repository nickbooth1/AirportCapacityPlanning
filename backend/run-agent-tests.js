/**
 * Script to run AgentController tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Define test types
const testTypes = {
  unit: 'unit/agent/AgentController.updated.test.js',
  minimal: 'unit/agent/minimal.test.js',
  rejection: 'unit/agent/rejectAction.test.js',
  action: 'unit/agent/getActionStatus.test.js',
  integration: 'integration/agent/AgentController.test.js',
  e2e: 'e2e/agent/AgentController.e2e.test.js',
  all: 'unit/agent/AgentController.updated.test.js'
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const watch = args.includes('--watch');
const verbose = args.includes('--verbose');

// Validate test type
if (!Object.keys(testTypes).includes(testType)) {
  console.error(`Invalid test type: ${testType}`);
  console.error(`Available types: ${Object.keys(testTypes).join(', ')}`);
  process.exit(1);
}

try {
  console.log(`Running ${testType} tests for AgentController...`);
  
  // Build the Jest command
  let cmd = `npx jest `;
  
  // Add test pattern
  if (testType === 'all') {
    cmd += `--config jest.agent.config.js`;
  } else {
    cmd += `tests/${testTypes[testType]}`;
  }
  
  // Add options
  if (watch) {
    cmd += ' --watch';
  }
  
  if (verbose) {
    cmd += ' --verbose';
  }
  
  // Run the command
  console.log(`Executing: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
  
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Tests failed to run:');
  process.exit(1);
}