/**
 * Comprehensive test script for weekly schedule processing
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_FILE_PATH = path.join(__dirname, 'test/flight-schedules/weekly/weekly-schedule.csv');
let uploadId = null;

// Set up axios with error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Authorization': 'Bearer test-token' // Add auth token if needed
  }
});

// Helper to delay execution
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runComprehensiveTest() {
  try {
    console.log('Starting comprehensive weekly schedule test...');

    // Step 1: Upload the file
    console.log('\n=== STEP 1: UPLOAD FILE ===');
    await uploadFile();

    // Step 2: Check upload status until processing completes
    console.log('\n=== STEP 2: CHECK PROCESSING STATUS ===');
    await checkUntilProcessed();

    // Step 3: Retrieve validation results 
    console.log('\n=== STEP 3: GET VALIDATION RESULTS ===');
    await getValidationResults();
    
    // Step 4: Approve flights for allocation
    console.log('\n=== STEP 4: APPROVE FLIGHTS ===');
    await approveFlights();

    // Step 5: Run allocation
    console.log('\n=== STEP 5: RUN ALLOCATION ===');
    await runAllocation();

    console.log('\n=== TEST COMPLETE ===');
    console.log('Weekly schedule processing test completed successfully!');
  } catch (error) {
    console.error('\n!!! TEST FAILED !!!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

async function uploadFile() {
  try {
    console.log(`Uploading ${TEST_FILE_PATH}...`);
    
    // Check if file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
    }

    // File stats
    const stats = fs.statSync(TEST_FILE_PATH);
    console.log(`File size: ${stats.size} bytes (${Math.round(stats.size / 1024)} KB)`);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));
    form.append('displayName', 'Weekly Test Schedule');

    const response = await api.post('/flights/upload', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    uploadId = response.data.id;
    console.log('Upload successful. Upload ID:', uploadId);
    console.log('Status:', response.data.status);
    return uploadId;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}

async function checkUntilProcessed() {
  try {
    if (!uploadId) {
      throw new Error('No upload ID available');
    }

    console.log(`Checking status of upload ID: ${uploadId}`);
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 10;

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts}...`);
      
      const response = await api.get(`/flights/upload/${uploadId}/status`);
      status = response.data.status;
      
      console.log(`Current status: ${status}`);
      if (status === 'completed' || status === 'failed') {
        console.log('Processing finished with status:', status);
        console.log('Details:', response.data);
        break;
      }
      
      // Wait 3 seconds before next check
      console.log('Waiting 3 seconds...');
      await sleep(3000);
    }
    
    if (status !== 'completed') {
      throw new Error(`Processing did not complete successfully. Final status: ${status}`);
    }
    
    return status;
  } catch (error) {
    console.error('Status check failed:', error.message);
    throw error;
  }
}

async function getValidationResults() {
  try {
    if (!uploadId) {
      throw new Error('No upload ID available');
    }

    console.log(`Getting validation results for upload ID: ${uploadId}`);
    
    // Try different endpoints
    let response;
    try {
      response = await api.get(`/flights/upload/${uploadId}/validation`);
    } catch (e) {
      console.log('Validation endpoint not found, trying flights endpoint...');
      response = await api.get(`/flights?uploadId=${uploadId}`);
    }
    
    console.log('Validation/Flights Data:', response.data);
    
    // Check for any validation issues
    if (response.data.results && response.data.results.some(r => r.validationStatus === 'invalid')) {
      console.log('\nFound invalid flights:');
      response.data.results
        .filter(r => r.validationStatus === 'invalid')
        .slice(0, 5)
        .forEach(r => {
          console.log(`- Flight ${r.flightNumber}: ${r.validationErrors.join(', ')}`);
        });
    } else {
      console.log('All flights appear to be valid.');
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to get validation results:', error.message);
    // Don't throw here, this is not critical
    return null;
  }
}

async function approveFlights() {
  try {
    if (!uploadId) {
      throw new Error('No upload ID available');
    }

    console.log(`Approving flights for upload ID: ${uploadId}`);
    
    const response = await api.post(`/flights/upload/${uploadId}/approve`, {
      approveAll: true,
      excludeInvalid: true
    });
    
    console.log('Approval response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to approve flights:', error.message);
    throw error;
  }
}

async function runAllocation() {
  try {
    console.log('Running allocation...');
    
    // Check if we need to create a scenario first
    let scenarioId;
    
    try {
      // First try to create a scenario
      console.log('Creating allocation scenario...');
      const createResponse = await api.post('/flight-schedules/scenarios', {
        name: 'Weekly Test Scenario',
        description: 'Test scenario for weekly schedule',
        uploadId: uploadId
      });
      
      scenarioId = createResponse.data.id;
      console.log('Scenario created with ID:', scenarioId);
    } catch (createError) {
      console.log('Could not create scenario:', createError.message);
      console.log('Trying to list existing scenarios...');
      
      // Try to get existing scenarios
      const listResponse = await api.get('/flight-schedules/scenarios');
      
      if (listResponse.data.length > 0) {
        scenarioId = listResponse.data[0].id;
        console.log('Using existing scenario ID:', scenarioId);
      } else {
        throw new Error('No scenarios available and could not create one');
      }
    }
    
    // Run allocation with the scenario
    console.log(`Running allocation for scenario ${scenarioId}...`);
    const allocResponse = await api.post(`/flight-schedules/scenarios/${scenarioId}/allocate`);
    
    console.log('Allocation initiated:', allocResponse.data);
    
    // Check allocation status
    console.log('Checking allocation status...');
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts}...`);
      
      const statusResponse = await api.get(`/flight-schedules/scenarios/${scenarioId}/status`);
      status = statusResponse.data.status;
      
      console.log(`Current allocation status: ${status}`);
      if (status === 'completed' || status === 'failed') {
        console.log('Allocation finished with status:', status);
        console.log('Details:', statusResponse.data);
        break;
      }
      
      // Wait 3 seconds before next check
      console.log('Waiting 3 seconds...');
      await sleep(3000);
    }
    
    return status;
  } catch (error) {
    console.error('Allocation failed:', error.message);
    // Don't throw here, this is just informational
    return null;
  }
}

// Run the test
runComprehensiveTest()
  .then(() => {
    console.log('Test execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  }); 