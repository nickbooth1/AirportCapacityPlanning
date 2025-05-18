const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3001/api';
const TEST_FILE_PATH = path.join(__dirname, 'test/flight-schedules/weekly/weekly-schedule.csv');
// No authentication needed in development mode

// Timer function to wait between steps
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function testUploadProcess() {
  let token;
  let uploadId;
  let scenarioId;
  let scheduleId;
  
  try {
    console.log('======= UPLOAD PROCESS TEST =======');
    
    // No authentication needed in development mode
    console.log('\n1. Authentication: Development mode - bypassed');
    // Mock token not needed as authentication is bypassed
    token = "development-mode";
    
    // Step 2: Upload the file
    console.log('\n2. Uploading test file...');
    try {
      // Check if file exists
      if (!fs.existsSync(TEST_FILE_PATH)) {
        console.error(`❌ Test file not found at: ${TEST_FILE_PATH}`);
        return;
      }
      
      const form = new FormData();
      form.append('file', fs.createReadStream(TEST_FILE_PATH));
      
      const uploadResponse = await axios.post(
        `${API_URL}/flights/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      uploadId = uploadResponse.data.id;
      console.log(`✅ File uploaded successfully. Upload ID: ${uploadId}`);
    } catch (error) {
      console.error('❌ File upload failed:', error.response?.data || error.message);
      return;
    }
    
    // Step 3: Check upload status
    console.log('\n3. Checking upload status...');
    try {
      await wait(2000); // Wait for processing
      
      const statusResponse = await axios.get(
        `${API_URL}/flights/upload/${uploadId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log(`✅ Upload status: ${statusResponse.data.status}`);
      console.log(`Flights processed: ${statusResponse.data.processedCount}`);
    } catch (error) {
      console.error('❌ Status check failed:', error.response?.data || error.message);
    }
    
    // Step 4: Get validation results
    console.log('\n4. Getting validation results...');
    try {
      const validationResponse = await axios.get(
        `${API_URL}/flights/upload/${uploadId}/validation`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const { validCount, newCount, invalidCount } = validationResponse.data;
      console.log(`✅ Validation complete:`);
      console.log(`   Valid flights: ${validCount}`);
      console.log(`   New flights: ${newCount}`);
      console.log(`   Invalid flights: ${invalidCount}`);
    } catch (error) {
      console.error('❌ Validation check failed:', error.response?.data || error.message);
    }
    
    // Step 5: Approve flights
    console.log('\n5. Approving flights...');
    try {
      const approveResponse = await axios.post(
        `${API_URL}/flights/upload/${uploadId}/approve`,
        { approveAll: true }, // Set to approve all flights
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log(`✅ Flights approved: ${approveResponse.data.message}`);
    } catch (error) {
      console.error('❌ Flight approval failed:', error.response?.data || error.message);
      console.error('Response:', error.response?.data);
      return;
    }
    
    // Step 6: Create scenario
    console.log('\n6. Creating scenario...');
    try {
      const scenarioResponse = await axios.post(
        `${API_URL}/flight-schedules/scenarios`,
        {
          name: 'Weekly Test Scenario',
          description: 'Test scenario for weekly schedule',
          uploadId: uploadId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      scenarioId = scenarioResponse.data.id;
      console.log(`✅ Scenario created with ID: ${scenarioId}`);
    } catch (error) {
      console.error('❌ Scenario creation failed:', error.response?.data || error.message);
      console.error('Response:', error.response?.data);
      return;
    }
    
    // Step 7: Start allocation
    console.log('\n7. Starting allocation...');
    try {
      const allocateResponse = await axios.post(
        `${API_URL}/flight-schedules/scenarios/${scenarioId}/allocate`,
        {
          allocationSettings: {
            preferredStandAssignmentWeight: 5,
            aircraftSizeCompatibilityWeight: 3,
            minimizeStandChangesWeight: 4
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log(`✅ Allocation started: ${allocateResponse.data.message}`);
      console.log('   Status:', allocateResponse.data.status);
    } catch (error) {
      console.error('❌ Starting allocation failed:', error.response?.data || error.message);
      return;
    }
    
    // Step 8: Check scenario status periodically
    console.log('\n8. Checking scenario status...');
    let completed = false;
    let attempts = 0;
    
    while (!completed && attempts < 10) {
      await wait(5000); // Wait 5 seconds between status checks
      attempts++;
      
      try {
        const statusResponse = await axios.get(
          `${API_URL}/flight-schedules/scenarios/${scenarioId}/status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        const status = statusResponse.data.data.status;
        console.log(`   Attempt ${attempts}: Status is ${status}`);
        
        if (status === 'completed') {
          completed = true;
          scheduleId = statusResponse.data.data.schedule_id;
          
          if (statusResponse.data.data.stats) {
            console.log(`✅ Allocation complete!`);
            console.log(`   Flights allocated: ${statusResponse.data.data.stats.allocatedCount}`);
            console.log(`   Flights unallocated: ${statusResponse.data.data.stats.unallocatedCount}`);
            console.log(`   Allocation rate: ${statusResponse.data.data.stats.allocationRate}%`);
          }
        } else if (status === 'failed') {
          console.error(`❌ Allocation failed: ${statusResponse.data.data.error_message}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Status check attempt ${attempts} failed:`, error.response?.data || error.message);
      }
    }
    
    if (!completed) {
      console.log('⚠️ Allocation did not complete within the timeout period');
    }
    
    // Step 9: Get flight schedule details if completed
    if (completed && scheduleId) {
      console.log('\n9. Getting flight schedule details...');
      try {
        const scheduleResponse = await axios.get(
          `${API_URL}/flight-schedules/${scheduleId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log(`✅ Flight schedule retrieved:`);
        console.log(`   Schedule ID: ${scheduleResponse.data.id}`);
        console.log(`   Flight count: ${scheduleResponse.data.flightCount}`);
        console.log(`   Date range: ${scheduleResponse.data.startDate} to ${scheduleResponse.data.endDate}`);
      } catch (error) {
        console.error('❌ Schedule details check failed:', error.response?.data || error.message);
      }
    }
    
    console.log('\n======= TEST COMPLETE =======');
  } catch (error) {
    console.error('Unhandled error during test:', error);
  }
}

// Run the test
testUploadProcess(); 