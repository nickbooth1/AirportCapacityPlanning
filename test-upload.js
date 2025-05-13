const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to the sample CSV file
const sampleFilePath = path.join(__dirname, 'sample_flight_schedule.csv');

// Check if file exists
if (!fs.existsSync(sampleFilePath)) {
  console.error('Sample CSV file not found:', sampleFilePath);
  process.exit(1);
}

// Read the file content
const fileContent = fs.readFileSync(sampleFilePath);
console.log(`File size: ${fileContent.length} bytes`);

// Create form data using native Node.js capabilities
const FormData = require('form-data');
const form = new FormData();
form.append('file', fs.createReadStream(sampleFilePath));
form.append('displayName', 'Test Flight Schedule');

// Configuration for detailed logging
axios.interceptors.request.use(request => {
  console.log('Request headers:', request.headers);
  return request;
});

// Send the request
console.log('Uploading file to backend API...');
axios.post('http://localhost:3001/api/flights/upload', form, {
  headers: {
    ...form.getHeaders(),
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity
})
.then(response => {
  console.log('Upload successful!');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
})
.catch(error => {
  console.error('Upload failed!');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Headers:', error.response.headers);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.error('No response received:', error.request);
  } else {
    console.error('Error:', error.message);
  }
  console.error('Error details:', error.toJSON());
}); 