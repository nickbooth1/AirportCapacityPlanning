const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testFlightData() {
  try {
    console.log('Testing flight data API...');
    
    // First get list of uploads
    console.log('Getting upload list...');
    const uploadsResponse = await axios.get(`${API_URL}/flights/upload`);
    console.log(`Found ${uploadsResponse.data.data.length} uploads`);
    
    // Get the latest completed upload
    const completedUploads = uploadsResponse.data.data.filter(upload => 
      upload.upload_status === 'completed');
    
    if (completedUploads.length === 0) {
      console.log('No completed uploads found');
      return;
    }
    
    const latestUpload = completedUploads[0];
    console.log(`Latest completed upload: ID=${latestUpload.id}, filename=${latestUpload.filename}`);
    
    // Try to get flights for this upload
    console.log(`Getting flights for upload ID ${latestUpload.id}...`);
    const flightsResponse = await axios.get(`${API_URL}/flights`, {
      params: {
        uploadId: latestUpload.id,
        page: 1,
        pageSize: 5,
        sortBy: 'scheduled_datetime',
        sortOrder: 'asc'
      }
    });
    
    console.log(`Got ${flightsResponse.data.data.length} flights (total: ${flightsResponse.data.meta.total})`);
    console.log('Sample flight data:');
    console.log(JSON.stringify(flightsResponse.data.data[0], null, 2));
    
    // Try to get statistics
    console.log(`Getting statistics for upload ID ${latestUpload.id}...`);
    const statsResponse = await axios.get(`${API_URL}/flights/stats`, {
      params: {
        uploadId: latestUpload.id
      }
    });
    
    console.log('Statistics summary:');
    console.log(`Total flights: ${statsResponse.data.total}`);
    console.log(`Flight types: ${JSON.stringify(statsResponse.data.byFlightNature)}`);
    console.log(`Status breakdown: ${JSON.stringify(statsResponse.data.byStatus)}`);
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testFlightData(); 