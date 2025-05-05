const axios = require('axios');

async function testFlightScheduleSelect() {
  try {
    console.log('Testing schedule selection in the frontend...');
    
    // First get list of uploads (schedules)
    console.log('Getting upload list...');
    const uploadsResponse = await axios.get('http://localhost:3001/api/flights/upload');
    console.log(`Found ${uploadsResponse.data.data.length} uploads`);
    
    // Get the completed uploads
    const completedUploads = uploadsResponse.data.data.filter(upload => 
      upload.upload_status === 'completed');
    
    if (completedUploads.length === 0) {
      console.log('No completed uploads found');
      return;
    }
    
    console.log('Completed uploads:');
    completedUploads.forEach(upload => {
      console.log(`- ID: ${upload.id}, Filename: ${upload.filename}, Records: ${upload.total_records}`);
    });
    
    // Test fetching flights from the first completed upload
    const firstUpload = completedUploads[0];
    console.log(`\nTesting fetch for Upload ID: ${firstUpload.id}`);
    
    // Test the flights endpoint with this upload ID
    console.log('Fetching flights...');
    const flightsResponse = await axios.get('http://localhost:3001/api/flights', {
      params: {
        uploadId: firstUpload.id,
        page: 1,
        pageSize: 5,
        sortBy: 'scheduled_datetime',
        sortOrder: 'asc',
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString()
      }
    });
    
    console.log(`Got ${flightsResponse.data.data.length} flights (total: ${flightsResponse.data.meta.total})`);
    
    // Test fetching stats
    console.log('Fetching statistics...');
    const statsResponse = await axios.get('http://localhost:3001/api/flights/stats', {
      params: {
        uploadId: firstUpload.id,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString()
      }
    });
    
    console.log('Statistics:');
    console.log(`- Total Flights: ${statsResponse.data.total}`);
    console.log(`- Flight Types: ${statsResponse.data.byFlightNature.map(type => 
      `${type.type === 'A' ? 'Arrivals' : 'Departures'}: ${type.count}`).join(', ')}`);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testFlightScheduleSelect(); 