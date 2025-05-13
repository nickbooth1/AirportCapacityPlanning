/**
 * Test script to verify API URL construction
 * 
 * Run with: node test-upload.js
 */

// Import the API base URL from config.js
const { API_BASE_URL } = require('./config');

// Simulate URL construction for uploads
function testUrlConstruction() {
  // Test ID
  const testId = 123;
  
  // Base endpoint
  const uploadEndpoint = '/api/flights/upload';
  
  // Different endpoint cases
  const statusEndpoint = `/api/flights/upload/${testId}/status`;
  const validateEndpoint = `/api/flights/upload/${testId}/validate`;
  
  // Test if API_BASE_URL ends with "/api"
  const hasApiSuffix = API_BASE_URL.endsWith('/api');
  
  // Construct URLs according to our fix logic
  const uploadUrl = hasApiSuffix
    ? `${API_BASE_URL}${uploadEndpoint.substring(4)}`
    : `${API_BASE_URL}${uploadEndpoint}`;
    
  const statusUrl = hasApiSuffix
    ? `${API_BASE_URL}${statusEndpoint.substring(4)}`
    : `${API_BASE_URL}${statusEndpoint}`;
    
  const validateUrl = hasApiSuffix
    ? `${API_BASE_URL}${validateEndpoint.substring(4)}`
    : `${API_BASE_URL}${validateEndpoint}`;
    
  // Log results
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Has API suffix:', hasApiSuffix);
  console.log('\nConstructed URLs:');
  console.log('Upload URL:', uploadUrl);
  console.log('Status URL:', statusUrl);
  console.log('Validate URL:', validateUrl);
  
  // Check for double /api/api/ in any URL
  const hasDoubleApi = [uploadUrl, statusUrl, validateUrl].some(url => url.includes('/api/api/'));
  console.log('\nHas double API prefix:', hasDoubleApi);
}

// Run the test
testUrlConstruction(); 