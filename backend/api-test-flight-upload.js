/**
 * API Flight Upload Process Test
 * 
 * This script tests the flight upload process through the API endpoints
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const CSV_FILE_PATH = path.resolve(__dirname, '../fixed_with_snake_case_fields.csv');
const TEST_USER = { email: 'test@example.com', password: 'password123' };

// Mock JWT token for testing - alternatively, you can use the login API to get a real token
let authToken = '';

/**
 * Authenticate with the API
 */
async function authenticate() {
  try {
    console.log('Authenticating with API...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    authToken = response.data.token;
    console.log('Successfully authenticated');
    
    return authToken;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    // Use a hardcoded token as fallback for testing
    console.log('Using fallback test token');
    authToken = 'test_token';
    return authToken;
  }
}

/**
 * Upload CSV file
 */
async function uploadFile() {
  try {
    console.log(`Uploading file: ${CSV_FILE_PATH}`);
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`File not found: ${CSV_FILE_PATH}`);
    }
    
    // Create form data with file
    const form = new FormData();
    form.append('file', fs.createReadStream(CSV_FILE_PATH));
    form.append('description', 'API Test Upload');
    
    // Upload file
    const response = await axios.post(
      `${API_BASE_URL}/flights/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Upload successful:', response.data);
    return response.data.id; // Return the upload ID
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get upload status
 */
async function getUploadStatus(uploadId) {
  try {
    console.log(`Getting status for upload ${uploadId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/flights/upload/${uploadId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Upload status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get upload status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Submit column mapping
 */
async function submitColumnMapping(uploadId) {
  try {
    console.log(`Submitting column mapping for upload ${uploadId}`);
    
    // Create mapping from CSV headers to expected system fields
    const mapping = {
      airline_iata: 'airlineIata',
      flight_number: 'flightNumber',
      scheduled_datetime: 'scheduledDatetime',
      estimated_datetime: 'estimatedDatetime',
      flight_nature: 'flightNature',
      origin_destination_iata: 'originDestinationIata',
      aircraft_type_iata: 'aircraftTypeIata',
      terminal: 'terminal',
      seat_capacity: 'seatCapacity'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/flights/upload/${uploadId}/mapping`,
      { mapping },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Column mapping submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to submit column mapping:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Validate flight data
 */
async function validateFlights(uploadId) {
  try {
    console.log(`Validating flights for upload ${uploadId}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/flights/upload/${uploadId}/validate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Validation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Validation failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Approve flight upload for processing
 */
async function approveUpload(uploadId) {
  try {
    console.log(`Approving upload ${uploadId}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/flights/upload/${uploadId}/approve`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Approval result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Approval failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create and run flight schedule
 */
async function createFlightSchedule(uploadId) {
  try {
    console.log(`Creating flight schedule for upload ${uploadId}`);
    
    const scheduleData = {
      name: `Test Schedule ${new Date().toISOString()}`,
      description: `Generated from upload ${uploadId}`,
      uploadId: uploadId
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/flight-schedules`,
      scheduleData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Flight schedule created:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create flight schedule:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run stand allocation for a schedule
 */
async function runStandAllocation(scheduleId) {
  try {
    console.log(`Running stand allocation for schedule ${scheduleId}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/flight-schedules/${scheduleId}/allocate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Allocation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Allocation failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get allocation results
 */
async function getAllocationResults(scheduleId) {
  try {
    console.log(`Getting allocation results for schedule ${scheduleId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/flight-schedules/${scheduleId}/allocation-results`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Allocation results:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get allocation results:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run the complete test flow
 */
async function runTest() {
  try {
    console.log('='.repeat(50));
    console.log('STARTING API FLIGHT UPLOAD TEST');
    console.log('='.repeat(50));
    
    // Step 1: Authenticate
    await authenticate();
    
    // Step 2: Upload CSV file
    const uploadId = await uploadFile();
    
    // Step 3: Get upload status
    await getUploadStatus(uploadId);
    
    // Step 4: Submit column mapping
    await submitColumnMapping(uploadId);
    
    // Step 5: Validate flight data
    await validateFlights(uploadId);
    
    // Step 6: Approve upload
    await approveUpload(uploadId);
    
    // Step 7: Create flight schedule
    const scheduleId = await createFlightSchedule(uploadId);
    
    // Step 8: Run stand allocation
    await runStandAllocation(scheduleId);
    
    // Step 9: Get allocation results
    await getAllocationResults(scheduleId);
    
    console.log('='.repeat(50));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log(`- Upload ID: ${uploadId}`);
    console.log(`- Schedule ID: ${scheduleId}`);
    console.log(`- Allocation Results URL: http://localhost:3000/flights/allocation-results/${scheduleId}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest(); 