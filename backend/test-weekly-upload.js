/**
 * Test script to upload weekly test file and diagnose issues
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001/api/flights/upload';
const TEST_FILE_PATH = path.join(__dirname, 'test/flight-schedules/weekly/weekly-schedule.csv');

async function testWeeklyFileUpload() {
  try {
    console.log('Starting weekly test file upload test...');
    console.log(`Using file: ${TEST_FILE_PATH}`);

    // Check if file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
    }

    // Read file stats
    const stats = fs.statSync(TEST_FILE_PATH);
    console.log(`File size: ${stats.size} bytes (${Math.round(stats.size / 1024)} KB)`);

    // Read file content for analysis
    const fileContent = fs.readFileSync(TEST_FILE_PATH, 'utf8');
    const lines = fileContent.split('\n');
    console.log(`File has ${lines.length} lines`);
    
    // Count comment lines
    const commentLines = lines.filter(line => line.trim().startsWith('#')).length;
    console.log(`File has ${commentLines} comment lines`);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));
    form.append('displayName', 'Weekly Test Schedule');

    console.log('Uploading file to API...');
    
    // Set timeout to 2 minutes to prevent premature timeout
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer test-token', // Add auth token if needed
      },
      timeout: 120000, // 2 minute timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Upload response:', response.data);
    console.log('SUCCESS: File uploaded successfully!');
    return response.data;
  } catch (error) {
    console.error('ERROR: File upload failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    throw error;
  }
}

// Run the test
testWeeklyFileUpload()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('Test failed');
    process.exit(1);
  }); 