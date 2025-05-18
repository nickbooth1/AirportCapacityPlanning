const db = require('./src/utils/db');

// Mock implementations for services
jest.mock('./src/services/agent/NLPService');
jest.mock('./src/services/agent/VectorSearchService');

// Mock the service
jest.mock('./src/services/agent/AggregatedCapacityImpactService');

// Mock implementations for database services
jest.mock('./src/services/standCapacityService', () => ({
  checkStandsAvailability: jest.fn(async () => ({ allAvailable: true, unavailableStands: [] })),
  getStandUtilization: jest.fn(async () => ({ utilization: 0.75, peakHours: ['10:00-11:00'] }))
}));

jest.mock('./src/services/maintenanceRequestService', () => ({
  updateMaintenanceSchedule: jest.fn(async () => ({ success: true })),
  getMaintenanceRequests: jest.fn(async () => []),
  createMaintenanceRequest: jest.fn(async () => ({ id: 'maint-123', status: 'pending' }))
}));

jest.mock('./src/services/FlightDataService', () => ({
  updateFlightStandAllocation: jest.fn(async () => ({ success: true })),
  getFlights: jest.fn(async () => []),
  saveFlightSchedule: jest.fn(async () => ({ id: 'schedule-123' }))
}));

// Mock authentication middleware for testing
jest.mock('./src/middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', username: 'test-user' };
  next();
});

// Clear test data before all tests
beforeAll(async () => {
  try {
    // Check if database exists and is accessible before attempting operations
    try {
      // Try a simple query to check connection
      await db.raw('SELECT 1');
      
      // If connection works, proceed with test setup
      // Use raw SQL for PostgreSQL to disable and re-enable triggers properly
      await db.raw('SET session_replication_role = replica;');
      
      // Clear test tables in reverse order of dependencies
      await db('stand_aircraft_constraints').del();
      await db('stands').del();
      await db('aircraft_types').del();
      await db('piers').del();
      await db('terminals').del();
      
      // Re-enable triggers
      await db.raw('SET session_replication_role = DEFAULT;');
      
      console.log('Test database cleared successfully');
    } catch (connectionError) {
      console.log('Database connection skipped for unit tests - mocks will be used instead');
    }
  } catch (error) {
    console.error('Error in test setup:', error);
  }
});

// Close the database connection after all tests
afterAll(async () => {
  try {
    await db.destroy();
  } catch (error) {
    // Ignore errors during connection close
  }
}); 