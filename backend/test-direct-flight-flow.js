/**
 * Direct Flight Processing Test
 * 
 * This script tests the flight upload and processing pipeline directly
 * without going through the API layer, to diagnose the actual data handling issues.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Import the services directly
const FlightUploadService = require('./src/services/FlightUploadService');
const FlightValidationService = require('./src/services/FlightValidationService');
const FlightProcessorService = require('./src/services/FlightProcessorService');

// Path to test CSV file
const CSV_FILE_PATH = path.resolve(__dirname, '../fixed_with_snake_case_fields.csv');

/**
 * Test the complete flight upload and processing pipeline
 */
async function testDirectFlowWithCSV() {
  try {
    console.log('===== DIRECT FLOW TEST STARTED =====');
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`File not found: ${CSV_FILE_PATH}`);
    }
    
    console.log(`Using CSV file: ${CSV_FILE_PATH}`);
    
    // Read the CSV file to display its contents for debugging
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    console.log(`CSV contains ${records.length} records`);
    console.log('First record:', records[0]);
    console.log('CSV headers:', Object.keys(records[0]));
    
    // Step 1: Create the upload record
    const uploadService = new FlightUploadService();
    console.log('Creating upload record...');
    const uploadId = await uploadService.recordUpload({
      filename: path.basename(CSV_FILE_PATH),
      displayName: 'Direct Test Upload',
      filePath: CSV_FILE_PATH,
      fileSize: fs.statSync(CSV_FILE_PATH).size
    });
    
    console.log(`Created upload record with ID: ${uploadId}`);
    
    // Step 2: Create the mapped file
    const uploadsDir = path.join(__dirname, 'data/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const mappedFilePath = path.join(uploadsDir, `mapped_${uploadId}_${path.basename(CSV_FILE_PATH)}`);
    fs.copyFileSync(CSV_FILE_PATH, mappedFilePath);
    
    // Update the upload record with the mapped file path
    await uploadService.updateMappedFilePath(uploadId, mappedFilePath);
    console.log(`Copied CSV file to mapped path: ${mappedFilePath}`);
    
    // Step 3: Process the upload
    console.log('Processing upload...');
    const processingResult = await uploadService.processUpload(uploadId, mappedFilePath);
    console.log('Processing result:', processingResult);
    
    // Step 4: Validate the flights
    console.log('Validating flights...');
    const validationService = new FlightValidationService();
    const validationResult = await validationService.validateFlightData(uploadId);
    console.log('Validation result:', validationResult);
    
    // Step 5: Process the flight schedule
    console.log('Processing flight schedule...');
    const processorService = new FlightProcessorService();
    const scheduleResult = await processorService.processFlightSchedule(uploadId);
    console.log('Schedule result:', scheduleResult);
    
    console.log('===== DIRECT FLOW TEST COMPLETED =====');
    console.log('Final result:', {
      uploadId,
      scheduleId: scheduleResult.scheduleId,
      validation: scheduleResult.validation,
      allocation: scheduleResult.allocation
    });
    
    if (scheduleResult.scheduleId) {
      console.log('You can view allocation results at:');
      console.log(`http://localhost:3000/flights/allocation-results/${scheduleResult.scheduleId}`);
    }
    
    return {
      success: true,
      uploadId,
      scheduleId: scheduleResult.scheduleId
    };
  } catch (error) {
    console.error('Direct flow test failed:', error);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (require.main === module) {
  testDirectFlowWithCSV()
    .then(result => {
      console.log('Test execution completed', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed unexpectedly:', error);
      process.exit(1);
    });
}

module.exports = { testDirectFlowWithCSV }; 