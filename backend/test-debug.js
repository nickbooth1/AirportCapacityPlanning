const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3001/api';
const TEST_FILE_PATH = path.join(__dirname, 'test/flight-schedules/weekly/weekly-schedule.csv');

async function testUpload() {
  console.log('Testing file upload...');
  
  // Check if file exists
  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.error(`Test file not found at: ${TEST_FILE_PATH}`);
    return;
  }
  
  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_FILE_PATH));
  
  try {
    const uploadResponse = await axios.post(
      `${API_URL}/flights/upload`,
      form,
      {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('Upload response:', JSON.stringify(uploadResponse.data, null, 2));
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
  }
}

testUpload(); 