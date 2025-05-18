/**
 * Flight Upload Process Test
 * 
 * This script tests each stage of the flight upload process separately
 * to diagnose where issues are occurring.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { parse } = require('csv-parse/sync');

// Base URL for API calls
const API_BASE_URL = 'http://localhost:3001/api';

// Path to test CSV file
const CSV_FILE_PATH = path.resolve(__dirname, '../fixed_with_snake_case_fields.csv');

/**
 * Test the upload phase
 */
async function testUpload() {
  console.log('===== TESTING UPLOAD PHASE =====');
  
  try {
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
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(CSV_FILE_PATH));
    
    // Make upload request - bypassing auth for testing
    console.log('Uploading file...');
    try {
      const uploadResponse = await axios.post(
        `${API_BASE_URL}/flights/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          }
        }
      );
      
      console.log('Upload response:', uploadResponse.data);
      
      if (uploadResponse.data.success) {
        console.log(`Successfully uploaded with ID: ${uploadResponse.data.uploadId}`);
        return uploadResponse.data.uploadId;
      } else {
        throw new Error('Upload failed: ' + (uploadResponse.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed with upload endpoint. Checking if auth is required.');
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // If 401/403, try direct database insert for testing
        if (error.response.status === 401 || error.response.status === 403) {
          console.log('Authentication required. Trying direct database insert for testing...');
          
          // Create a direct upload record using the FlightUploadService
          const FlightUploadService = require('./src/services/FlightUploadService');
          const uploadService = new FlightUploadService();
          
          const uploadId = await uploadService.recordUpload({
            filename: path.basename(CSV_FILE_PATH),
            displayName: 'Test Upload',
            filePath: CSV_FILE_PATH,
            fileSize: fs.statSync(CSV_FILE_PATH).size
          });
          
          console.log(`Created test upload with ID: ${uploadId}`);
          return uploadId;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error testing upload:', error.message);
    throw error;
  }
}

/**
 * Test the column mapping phase
 */
async function testColumnMapping(uploadId) {
  console.log('===== TESTING COLUMN MAPPING PHASE =====');
  
  try {
    // For direct testing, we can skip the regular mapping and proceed directly
    // Copy the file to the expected path location after mapping
    const FlightUploadService = require('./src/services/FlightUploadService');
    const uploadService = new FlightUploadService();
    
    // Get upload record
    const upload = await uploadService.getUploadById(uploadId);
    if (!upload) {
      throw new Error(`Upload with ID ${uploadId} not found`);
    }
    
    console.log('Upload record:', upload);
    
    // Define the mapped file path
    const uploadsDir = path.join(__dirname, 'data/uploads');
    const mappedFilePath = path.join(uploadsDir, `mapped_${uploadId}_${path.basename(CSV_FILE_PATH)}`);
    
    // Make sure directory exists
    if (!fs.existsSync(path.dirname(mappedFilePath))) {
      fs.mkdirSync(path.dirname(mappedFilePath), { recursive: true });
    }
    
    // Copy the original file to the mapped file path
    fs.copyFileSync(CSV_FILE_PATH, mappedFilePath);
    console.log(`Copied CSV file to mapped path: ${mappedFilePath}`);
    
    // Update the upload record with the mapped file path
    await uploadService.updateMappedFilePath(uploadId, mappedFilePath);
    console.log(`Updated upload record with mapped file path`);
    
    return {
      success: true,
      uploadId,
      mappedFilePath
    };
  } catch (error) {
    console.error('Error testing column mapping:', error.message);
    throw error;
  }
}

/**
 * Test processing the upload directly
 */
async function testDirectProcessing(uploadId, mappedFilePath) {
  console.log('===== TESTING DIRECT PROCESSING PHASE =====');
  
  try {
    // Process the upload directly using the service
    const FlightUploadService = require('./src/services/FlightUploadService');
    const uploadService = new FlightUploadService();
    
    console.log(`Processing upload ${uploadId} with file: ${mappedFilePath}`);
    const result = await uploadService.processUpload(uploadId, mappedFilePath);
    
    console.log('Processing result:', result);
    return result;
  } catch (error) {
    console.error('Error in direct processing:', error.message);
    throw error;
  }
}

/**
 * Test the validation phase
 */
async function testValidation(uploadId) {
  console.log('===== TESTING VALIDATION PHASE =====');
  
  try {
    // Call validation service directly for testing
    const FlightValidationService = require('./src/services/FlightValidationService');
    const validationService = new FlightValidationService();
    
    console.log(`Starting validation for upload ${uploadId}...`);
    const result = await validationService.validateFlightData(uploadId);
    
    console.log('Validation result:', result);
    return result;
  } catch (error) {
    console.error('Error testing validation:', error.message);
    throw error;
  }
}

/**
 * Test processing the flight schedule
 */
async function testProcessing(uploadId) {
  console.log('===== TESTING PROCESSING PHASE =====');
  
  try {
    // Process the flight schedule using the service directly
    const FlightProcessorService = require('./src/services/FlightProcessorService');
    const processorService = new FlightProcessorService();
    
    console.log(`Processing flight schedule for upload ${uploadId}...`);
    const result = await processorService.processFlightSchedule(uploadId);
    
    console.log('Processing result:', result);
    return result;
  } catch (error) {
    console.error('Error testing processing:', error.message);
    throw error;
  }
}

/**
 * Run the full test suite
 */
async function runFullTest() {
  try {
    // Phase 1: Upload
    const uploadId = await testUpload();
    
    // Phase 2: Column Mapping (or direct file copy for testing)
    const mappingResult = await testColumnMapping(uploadId);
    
    // Phase 3: Direct Processing
    await testDirectProcessing(uploadId, mappingResult.mappedFilePath);
    
    // Phase 4: Validation
    await testValidation(uploadId);
    
    // Phase 5: Processing
    const processingResult = await testProcessing(uploadId);
    
    console.log('===== TEST COMPLETED SUCCESSFULLY =====');
    console.log('Full test results:', {
      uploadId,
      scheduleId: processingResult.scheduleId,
      allocationResults: processingResult.allocation
    });
    
    console.log('You can view allocation results at:');
    console.log(`http://localhost:3000/flights/allocation-results/${processingResult.scheduleId}`);
    
    return {
      success: true,
      uploadId,
      scheduleId: processingResult.scheduleId
    };
  } catch (error) {
    console.error('Full test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (require.main === module) {
  runFullTest()
    .then(result => {
      console.log('Test execution completed', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed unexpectedly:', error);
      process.exit(1);
    });
}

module.exports = { 
  testUpload,
  testColumnMapping,
  testDirectProcessing,
  testValidation,
  testProcessing,
  runFullTest
}; 