/**
 * Script to check validation results for a flight upload
 */

const axios = require('axios');

// Replace with the upload ID returned from the previous test
const UPLOAD_ID = 108; // Replace with your actual upload ID
const API_URL = `http://localhost:3001/api/flights/upload/${UPLOAD_ID}/validation`;

async function checkValidationResults() {
  try {
    console.log(`Checking validation results for upload ID: ${UPLOAD_ID}`);
    
    const response = await axios.get(API_URL, {
      headers: {
        'Authorization': 'Bearer test-token', // Add auth token if needed
      }
    });

    console.log('Total validation results:', response.data.total);
    console.log('Valid flights:', response.data.validCount);
    console.log('Invalid flights:', response.data.invalidCount);
    
    if (response.data.invalidCount > 0) {
      console.log('\nSample of invalid flights:');
      response.data.results.filter(r => r.validationStatus === 'invalid').slice(0, 5).forEach(r => {
        console.log(`- Flight ${r.flightNumber}: ${r.validationErrors.join(', ')}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting validation results:');
    
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
checkValidationResults()
  .then(() => {
    console.log('\nValidation check completed');
    process.exit(0);
  })
  .catch(() => {
    console.log('\nValidation check failed');
    process.exit(1);
  }); 