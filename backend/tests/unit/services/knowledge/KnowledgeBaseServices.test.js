/**
 * Knowledge Base Services Tests
 * 
 * Unit tests for the knowledge base integration services
 */

const {
  StandDataService,
  MaintenanceDataService,
  AirportConfigDataService,
  CacheService,
  DataTransformerService
} = require('../../../../src/services/knowledge');

// Mock the database models
jest.mock('../../../../src/models/Stand', () => {
  return {
    query: jest.fn().mockReturnThis(),
    withGraphFetched: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    then: jest.fn()
  };
});

jest.mock('../../../../src/models/MaintenanceRequest', () => {
  return {
    query: jest.fn().mockReturnThis(),
    withGraphFetched: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    joinRelated: jest.fn().mockReturnThis(),
    then: jest.fn(),
    clone: jest.fn().mockReturnThis()
  };
});

jest.mock('../../../../src/models/Terminal', () => {
  return {
    query: jest.fn().mockReturnThis(),
    withGraphFetched: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    then: jest.fn()
  };
});

jest.mock('../../../../src/models/Pier', () => {
  return {
    query: jest.fn().mockReturnThis(),
    withGraphFetched: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    then: jest.fn()
  };
});

jest.mock('../../../../src/models/OperationalSettings', () => {
  return {
    query: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    getSettings: jest.fn().mockResolvedValue({
      id: 1,
      default_gap_minutes: 15,
      operating_start_time: '06:00:00',
      operating_end_time: '23:00:00',
      slot_duration_minutes: 10,
      slot_block_size: 6
    })
  };
});

// Tests for StandDataService
describe('StandDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('getStands should call Stand query methods with correct parameters', async () => {
    // Mock the query response
    const mockStands = [
      { id: 1, name: 'Stand A1', code: 'A1', pier_id: 1 },
      { id: 2, name: 'Stand A2', code: 'A2', pier_id: 1 }
    ];
    
    const queryPromise = Promise.resolve(mockStands);
    const Stand = require('../../../../src/models/Stand');
    Stand.query().then.mockImplementation(callback => callback(mockStands));
    
    // Call the service method with filters
    const filters = {
      standType: 'contact',
      isActive: true,
      pierId: 1
    };
    
    try {
      await StandDataService.getStands(filters);
      
      // Verify that the Stand.query methods were called with correct parameters
      expect(Stand.query).toHaveBeenCalled();
      expect(Stand.withGraphFetched).toHaveBeenCalledWith('pier.terminal');
      expect(Stand.where).toHaveBeenCalledWith('stand_type', 'contact');
      expect(Stand.where).toHaveBeenCalledWith('is_active', true);
      expect(Stand.where).toHaveBeenCalledWith('pier_id', 1);
    } catch (error) {
      fail(`Test should not throw an error: ${error.message}`);
    }
  });
  
  // Additional tests for StandDataService methods
});

// Tests for MaintenanceDataService
describe('MaintenanceDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('getMaintenanceRequests should call MaintenanceRequest query methods with correct parameters', async () => {
    // Mock the query response
    const mockRequests = [
      { id: 'req1', title: 'Maintenance 1', stand_id: 1 },
      { id: 'req2', title: 'Maintenance 2', stand_id: 2 }
    ];
    
    const mockCount = { count: '2' };
    
    const MaintenanceRequest = require('../../../../src/models/MaintenanceRequest');
    
    // Mock the implementation of the Promise chain
    MaintenanceRequest.query().clone().count().first.mockResolvedValue(mockCount);
    
    const queryPromise = Promise.resolve(mockRequests);
    MaintenanceRequest.query().orderBy().limit().offset().then.mockImplementation(callback => callback(mockRequests));
    
    // Call the service method with filters
    const filters = {
      standId: 1,
      statusId: 2,
      priority: 'High'
    };
    
    try {
      await MaintenanceDataService.getMaintenanceRequests(filters, 10, 0);
      
      // Verify that the MaintenanceRequest.query methods were called with correct parameters
      expect(MaintenanceRequest.query).toHaveBeenCalled();
      expect(MaintenanceRequest.withGraphFetched).toHaveBeenCalledWith('[stand.pier.terminal, status, approvals]');
      expect(MaintenanceRequest.where).toHaveBeenCalledWith('stand_id', 1);
      expect(MaintenanceRequest.where).toHaveBeenCalledWith('status_id', 2);
      expect(MaintenanceRequest.where).toHaveBeenCalledWith('priority', 'High');
      expect(MaintenanceRequest.orderBy).toHaveBeenCalledWith('start_datetime', 'desc');
      expect(MaintenanceRequest.limit).toHaveBeenCalledWith(10);
      expect(MaintenanceRequest.offset).toHaveBeenCalledWith(0);
      expect(MaintenanceRequest.clone).toHaveBeenCalled();
      expect(MaintenanceRequest.count).toHaveBeenCalledWith('* as count');
    } catch (error) {
      fail(`Test should not throw an error: ${error.message}`);
    }
  });
  
  // Additional tests for MaintenanceDataService methods
});

// Tests for AirportConfigDataService
describe('AirportConfigDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('getOperationalSettings should return settings from the model', async () => {
    // Mock settings
    const mockSettings = {
      id: 1,
      default_gap_minutes: 15,
      operating_start_time: '06:00:00',
      operating_end_time: '23:00:00',
      slot_duration_minutes: 10,
      slot_block_size: 6
    };
    
    const OperationalSettings = require('../../../../src/models/OperationalSettings');
    OperationalSettings.getSettings.mockResolvedValue(mockSettings);
    
    // Call the service method
    const settings = await AirportConfigDataService.getOperationalSettings();
    
    // Verify the result
    expect(settings).toEqual(mockSettings);
    expect(OperationalSettings.getSettings).toHaveBeenCalled();
  });
  
  // Additional tests for AirportConfigDataService methods
});

// Tests for CacheService
describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('getConfigItem and setConfigItem should work correctly', () => {
    // Set a cache item
    CacheService.setConfigItem('test-key', 'test-value');
    
    // Get the cache item
    const value = CacheService.getConfigItem('test-key');
    
    // Verify the result
    expect(value).toBe('test-value');
  });
  
  test('getStatistics should return cache statistics', () => {
    // Get initial statistics
    const stats = CacheService.getStatistics();
    
    // Verify the structure
    expect(stats).toHaveProperty('config');
    expect(stats).toHaveProperty('operational');
    expect(stats).toHaveProperty('stats');
    
    expect(stats.config).toHaveProperty('hits');
    expect(stats.config).toHaveProperty('misses');
    expect(stats.config).toHaveProperty('hitRate');
  });
  
  // Additional tests for CacheService methods
});

// Tests for DataTransformerService
describe('DataTransformerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('transformStandData should format stand data correctly', () => {
    // Mock stand data
    const mockStand = {
      id: 1,
      code: 'A1',
      name: 'Stand A1',
      stand_type: 'contact',
      is_active: true,
      has_jetbridge: true,
      max_wingspan_meters: 36,
      max_length_meters: 42,
      max_aircraft_size_code: 'C',
      description: 'Terminal 1 contact stand',
      latitude: 51.5,
      longitude: -0.1,
      pier: {
        id: 1,
        name: 'Pier A',
        code: 'A',
        terminal: {
          id: 1,
          name: 'Terminal 1',
          code: 'T1'
        }
      }
    };
    
    // Transform to simple format
    const simpleResult = DataTransformerService.transformStandData(mockStand, 'simple');
    
    // Verify simple format
    expect(simpleResult).toEqual({
      id: 1,
      code: 'A1',
      name: 'Stand A1',
      type: 'contact',
      isActive: true,
      location: 'Terminal 1 / Pier A',
      hasJetbridge: true
    });
    
    // Transform to detailed format
    const detailedResult = DataTransformerService.transformStandData(mockStand, 'detailed');
    
    // Verify detailed format
    expect(detailedResult).toHaveProperty('id', 1);
    expect(detailedResult).toHaveProperty('code', 'A1');
    expect(detailedResult).toHaveProperty('pier');
    expect(detailedResult.pier).toHaveProperty('terminal');
    expect(detailedResult.pier.terminal).toHaveProperty('name', 'Terminal 1');
  });
  
  // Additional tests for DataTransformerService methods
});

// Integration tests between services
describe('Knowledge Base Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('DataTransformerService can format MaintenanceDataService results', async () => {
    // Mock MaintenanceDataService.getMaintenanceRequestById result
    const mockRequest = {
      id: 'req1',
      title: 'Scheduled Maintenance',
      description: 'Regular maintenance for stand A1',
      stand_id: 1,
      stand: {
        id: 1,
        code: 'A1',
        name: 'Stand A1',
        pier: {
          id: 1,
          name: 'Pier A',
          terminal: {
            id: 1,
            name: 'Terminal 1'
          }
        }
      },
      status: {
        id: 2,
        name: 'Approved'
      },
      start_datetime: '2025-06-01T08:00:00.000Z',
      end_datetime: '2025-06-03T16:00:00.000Z',
      requestor_name: 'John Doe',
      requestor_email: 'john.doe@airport.com',
      requestor_department: 'Maintenance',
      priority: 'Medium'
    };
    
    // Mock the service method
    jest.spyOn(MaintenanceDataService, 'getMaintenanceRequestById').mockResolvedValue(mockRequest);
    
    // Get mock data through service
    const maintenanceData = await MaintenanceDataService.getMaintenanceRequestById('req1');
    
    // Transform the data
    const transformedData = DataTransformerService.transformMaintenanceData(maintenanceData, 'detailed');
    
    // Verify the result
    expect(transformedData).toHaveProperty('id', 'req1');
    expect(transformedData).toHaveProperty('title', 'Scheduled Maintenance');
    expect(transformedData).toHaveProperty('stand');
    expect(transformedData.stand).toHaveProperty('code', 'A1');
    expect(transformedData).toHaveProperty('status');
    expect(transformedData.status).toHaveProperty('name', 'Approved');
    expect(transformedData).toHaveProperty('duration');
    expect(transformedData).toHaveProperty('requestor');
  });
  
  test('CacheService can cache data from StandDataService', async () => {
    // Mock stand data
    const mockStands = [
      { id: 1, name: 'Stand A1', code: 'A1' },
      { id: 2, name: 'Stand A2', code: 'A2' }
    ];
    
    // Mock the service method
    jest.spyOn(StandDataService, 'getStands').mockResolvedValue(mockStands);
    
    // Simulate caching data from service
    const cacheKey = 'stands:all';
    const stands = await StandDataService.getStands();
    CacheService.setOperationalItem(cacheKey, stands);
    
    // Retrieve data from cache
    const cachedStands = CacheService.getOperationalItem(cacheKey);
    
    // Verify the result
    expect(cachedStands).toEqual(mockStands);
    
    // Check cache statistics
    const stats = CacheService.getStatistics();
    expect(stats.operational.hits).toBe(1);
  });
});