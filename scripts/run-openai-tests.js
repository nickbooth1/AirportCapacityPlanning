#!/usr/bin/env node
/**
 * Script to run OpenAI integration tests with API key
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  
  try {
    if (fs.existsSync(envPath)) {
      console.log('Found .env file, loading environment variables...');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n');
      
      // Parse and set environment variables
      envVars.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove quotes if present
          value = value.replace(/^['"]|['"]$/g, '');
          
          // Set in the current process.env
          process.env[key] = value;
        }
      });
      
      return true;
    } else {
      console.log('No .env file found at', envPath);
      return false;
    }
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    return false;
  }
}

function runTests() {
  // First load environment variables from .env file
  loadEnvFile();
  
  // Set OpenAI API key environment for testing
  const env = { 
    ...process.env,
    RUN_LIVE_OPENAI_TESTS: 'true'
  };

  // Get the OpenAI API key from the environment
  const apiKey = process.env.OPENAI_API_KEY;

  console.log('Running OpenAI integration tests:');

  if (!apiKey) {
    console.log('⚠️ OPENAI_API_KEY environment variable not found. Tests will run in mock mode.');
  } else {
    console.log('✅ OPENAI_API_KEY found. Tests will use the actual OpenAI API.');
    console.log(`   API key format: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
  }

  // Run single test with JEST directly
  const testFile = path.resolve(__dirname, '../backend/tests/services/agent/OpenAIService.live.test.js');

  const testProcess = spawn('npx', ['jest', testFile, '--verbose'], { 
    env,
    stdio: 'inherit' // Pass all I/O directly to the parent process
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ OpenAI tests succeeded!');
    } else {
      console.log(`❌ OpenAI tests failed with code ${code}`);
    }
  });
}

// Run the tests
runTests();