const axios = require('axios');
const knex = require('knex');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const FRONTEND_PORTS = [3000, 3001, 3002, 3003, 3004];
const BACKEND_PORTS = [3001, 3002, 3003, 3004, 3005]; 
const FRONTEND_URL_BASE = 'http://localhost';
const BACKEND_URL_BASE = 'http://localhost';
const BACKEND_API_PATH = '/api';

// Database configuration
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'airport_capacity_planner',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  pool: { min: 0, max: 5 },
  acquireConnectionTimeout: 10000
};

// Function to find an available service by checking multiple ports
async function findAvailableService(basePath, ports, path = '', timeoutMs = 1000) {
  for (const port of ports) {
    const url = `${basePath}:${port}${path}`;
    try {
      await axios.get(url, { timeout: timeoutMs });
      console.log(`Service found at: ${url}`);
      return url;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log(`No service at port ${port}`);
      } else {
        // If we got a response with an error code, the service is running
        console.log(`Service found at: ${url} (returned status ${error.response?.status || 'unknown'})`);
        return url;
      }
    }
  }
  return null;
}

async function testE2EConnectivity() {
  console.log('Running end-to-end connectivity test...');
  let db = null;
  let hasErrors = false;
  
  try {
    // Step 1: Test database connectivity
    console.log('\n1. Testing database connection...');
    try {
      db = knex(dbConfig);
      const result = await db.raw('SELECT 1+1 AS result');
      console.log('✅ Database connection successful');
    } catch (dbError) {
      hasErrors = true;
      console.error('❌ Database connection failed:', dbError.message);
      console.log('\nTroubleshooting tips:');
      console.log('- Make sure PostgreSQL is running: pg_isready');
      console.log('- Verify database exists: createdb airport_capacity_planner');
      console.log('- Check database credentials');
    }
    
    // Step 2: Discover backend URL by checking multiple ports
    console.log('\n2. Discovering backend API...');
    const backendUrl = await findAvailableService(BACKEND_URL_BASE, BACKEND_PORTS, BACKEND_API_PATH + '/health');
    
    if (backendUrl) {
      try {
        // Test by querying the terminals endpoint
        const terminalsEndpoint = backendUrl.replace('/health', '/terminals');
        const backendResponse = await axios.get(terminalsEndpoint, { timeout: 3000 });
        console.log('✅ Backend API connection successful');
        console.log(`   Received ${backendResponse.data?.length || 0} terminals from API`);
      } catch (apiError) {
        hasErrors = true;
        console.error('❌ Backend API connection failed:', apiError.message);
        console.log('\nTroubleshooting tips:');
        console.log('- Make sure the backend server is running: npm run start:backend');
        console.log('- Check the backend logs for errors');
        console.log('- Verify that the API endpoint exists and is working properly');
      }
    } else {
      hasErrors = true;
      console.error('❌ Backend API not found on any expected port');
      console.log('\nTroubleshooting tips:');
      console.log('- Start the backend server: npm run start:backend');
      console.log('- Check for port conflicts');
      console.log('- Verify the backend API is configured correctly');
    }
    
    // Step 3: Discover frontend URL by checking multiple ports
    console.log('\n3. Discovering frontend...');
    const frontendUrl = await findAvailableService(FRONTEND_URL_BASE, FRONTEND_PORTS);
    
    if (frontendUrl) {
      console.log('✅ Frontend available at', frontendUrl);
    } else {
      // Not marking as error, just a warning
      console.log('⚠️ Frontend not reachable on any expected port');
      console.log('\nTroubleshooting tips:');
      console.log('- Start the frontend server: npm run start:frontend');
      console.log('- Check for port conflicts');
    }
    
    console.log('\nConnectivity test summary:');
    if (hasErrors) {
      console.log('⚠️ Some tests failed. See error messages above for troubleshooting.');
      return false;
    } else {
      console.log('✅ All core connectivity tests passed!');
      return true;
    }
  } catch (error) {
    console.error('\n❌ Unexpected error in test:', error.message);
    return false;
  } finally {
    // Clean up
    if (db) {
      await db.destroy();
    }
  }
}

// Run the test
testE2EConnectivity()
  .then(success => {
    console.log('\nTest completed' + (success ? ' successfully' : ' with errors'));
    process.exit(success ? 0 : 1);
  }); 