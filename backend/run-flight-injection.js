/**
 * Run Flight Injection and Processing
 * 
 * This script injects test flights and then processes them through the allocation system.
 * 
 * Usage: node run-flight-injection.js
 */

const { main: injectFlights } = require('./inject-test-flights');
const axios = require('axios');

async function runInjectionAndProcess() {
  try {
    console.log('Starting flight injection and processing...');
    
    // Step 1: Inject flights
    console.log('Injecting test flights...');
    const injectionResult = await injectFlights();
    
    if (!injectionResult.success) {
      throw new Error('Flight injection failed');
    }
    
    console.log(`Successfully injected ${injectionResult.flightCount} flights with upload ID: ${injectionResult.uploadId}`);
    
    // Step 2: Process the flight schedule
    console.log(`Processing flight schedule for upload ${injectionResult.uploadId}...`);
    
    // Wait a moment to ensure database operations complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send request to process the flight schedule
    const processingResponse = await axios.post(
      `http://localhost:3001/api/flight-schedules/process/${injectionResult.uploadId}`,
      {}, // Empty body
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Processing response:', processingResponse.data);
    
    if (processingResponse.data.success) {
      console.log(`Successfully processed flight schedule. Schedule ID: ${processingResponse.data.scheduleId}`);
      console.log('You can now view the allocation results at:');
      console.log(`http://localhost:3000/flights/allocation-results/${processingResponse.data.scheduleId}`);
    } else {
      console.error('Flight schedule processing failed:', processingResponse.data);
    }
    
    return {
      success: true,
      uploadId: injectionResult.uploadId,
      scheduleId: processingResponse.data.scheduleId
    };
  } catch (error) {
    console.error('Error running injection and processing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Execute if this script is run directly
if (require.main === module) {
  runInjectionAndProcess()
    .then(result => {
      console.log('Script execution completed', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runInjectionAndProcess }; 