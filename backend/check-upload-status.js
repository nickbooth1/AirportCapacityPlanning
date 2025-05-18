/**
 * Script to check the status of a flight upload
 */

const axios = require('axios');

// Replace with the upload ID returned from the previous test
const UPLOAD_ID = 108; // Replace with your actual upload ID
const API_URL = `http://localhost:3001/api/flights/upload/${UPLOAD_ID}/status`;

async function checkUploadStatus() {
  try {
    console.log(`Checking status of upload ID: ${UPLOAD_ID}`);
    
    const response = await axios.get(API_URL, {
      headers: {
        'Authorization': 'Bearer test-token', // Add auth token if needed
      }
    });

    console.log('Upload status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting upload status:');
    
    if (error.response) {
      console.error('Response error data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else {
      console.error('Error message:', error.message);
    }
    
    throw error;
  }
}

// Run the check
checkUploadStatus()
  .then(() => {
    console.log('Status check completed');
    process.exit(0);
  })
  .catch(() => {
    console.log('Status check failed');
    process.exit(1);
  }); 