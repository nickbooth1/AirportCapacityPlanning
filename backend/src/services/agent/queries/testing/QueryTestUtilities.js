/**
 * Query Test Utilities
 * 
 * This module provides utilities for testing query handlers.
 */

/**
 * Create a mock parsed query object for testing
 * 
 * @param {string} intent - The query intent
 * @param {Object} entities - The query entities
 * @param {Object} options - Additional query options
 * @returns {Object} - A parsed query object suitable for testing
 */
function createMockParsedQuery(intent, entities = {}, options = {}) {
  return {
    intent,
    entities,
    confidence: options.confidence || 0.9,
    rawText: options.rawText || `Mock query for intent: ${intent}`,
    ...options
  };
}

/**
 * Create a mock conversation context for testing
 * 
 * @param {string} contextId - The context ID
 * @param {Object} options - Additional context options
 * @returns {Object} - A context object suitable for testing
 */
function createMockContext(contextId = 'test-context', options = {}) {
  return {
    id: contextId,
    userId: options.userId || 'test-user',
    startTime: options.startTime || new Date().toISOString(),
    lastUpdateTime: options.lastUpdateTime || new Date().toISOString(),
    messages: options.messages || [],
    entities: options.entities || {},
    ...options
  };
}

/**
 * Create mock services for testing a handler
 * 
 * @param {Object} mockServices - Mock services to override defaults
 * @returns {Object} - A services object with mocks
 */
function createMockServices(mockServices = {}) {
  // Create basic mock for each knowledge service
  const mockStandDataService = {
    getStands: jest.fn().mockResolvedValue([]),
    getStandById: jest.fn().mockResolvedValue(null),
    ...mockServices.standDataService
  };
  
  const mockMaintenanceDataService = {
    getMaintenanceRequests: jest.fn().mockResolvedValue([]),
    getMaintenanceRequestById: jest.fn().mockResolvedValue(null),
    ...mockServices.maintenanceDataService
  };
  
  const mockAirportConfigService = {
    getTerminals: jest.fn().mockResolvedValue([]),
    getPiers: jest.fn().mockResolvedValue([]),
    getOperationalSettings: jest.fn().mockResolvedValue({}),
    ...mockServices.airportConfigService
  };
  
  const mockReferenceDataService = {
    getAirports: jest.fn().mockResolvedValue([]),
    getAirlines: jest.fn().mockResolvedValue([]),
    getGroundHandlingAgents: jest.fn().mockResolvedValue([]),
    getAircraftTypes: jest.fn().mockResolvedValue([]),
    ...mockServices.referenceDataService
  };
  
  const mockCacheService = {
    getConfigItem: jest.fn().mockReturnValue(null),
    setConfigItem: jest.fn().mockReturnValue(true),
    getOperationalItem: jest.fn().mockReturnValue(null),
    setOperationalItem: jest.fn().mockReturnValue(true),
    ...mockServices.cacheService
  };
  
  const mockDataTransformer = {
    transformStandData: jest.fn(data => data),
    transformMaintenanceData: jest.fn(data => data),
    transformAirportConfigData: jest.fn(data => data),
    transformStatisticsData: jest.fn(data => data),
    ...mockServices.dataTransformer
  };
  
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    ...mockServices.logger
  };
  
  // Return the mock services
  return {
    logger: mockLogger,
    
    // Individual services
    standDataService: mockStandDataService,
    maintenanceDataService: mockMaintenanceDataService,
    airportConfigService: mockAirportConfigService,
    referenceDataService: mockReferenceDataService,
    cacheService: mockCacheService,
    dataTransformer: mockDataTransformer,
    
    // Combined knowledge services
    knowledgeServices: {
      StandDataService: mockStandDataService,
      MaintenanceDataService: mockMaintenanceDataService,
      AirportConfigDataService: mockAirportConfigService,
      ReferenceDataService: mockReferenceDataService,
      CacheService: mockCacheService,
      DataTransformerService: mockDataTransformer
    },
    
    // Any additional mocks
    ...mockServices
  };
}

/**
 * Test a query handler with a specific query
 * 
 * @param {Object} handler - The query handler to test
 * @param {Object} parsedQuery - The parsed query
 * @param {Object} context - The conversation context
 * @returns {Promise<Object>} - The handler response
 */
async function testQueryHandler(handler, parsedQuery, context = {}) {
  // Verify the handler can handle this query
  const canHandle = handler.canHandle(parsedQuery, context);
  
  if (!canHandle) {
    throw new Error(`Handler ${handler.constructor.name} cannot handle the provided query`);
  }
  
  // Process the query
  return await handler.handleQuery(parsedQuery, context);
}

/**
 * Verify a response meets the required format
 * 
 * @param {Object} response - The response to verify
 * @returns {boolean} - True if the response is valid
 */
function verifyResponseFormat(response) {
  if (!response) {
    throw new Error('Response is undefined or null');
  }
  
  if (typeof response !== 'object') {
    throw new Error(`Response must be an object, got ${typeof response}`);
  }
  
  if (response.success === undefined) {
    throw new Error('Response must have a success property');
  }
  
  if (response.success && !response.data) {
    throw new Error('Success response must have a data property');
  }
  
  if (!response.success && !response.error) {
    throw new Error('Error response must have an error property');
  }
  
  return true;
}

/**
 * Create mock stand data for testing
 * 
 * @param {number} count - Number of stands to create
 * @param {Object} options - Stand customization options
 * @returns {Array} - Array of mock stand objects
 */
function createMockStandData(count = 5, options = {}) {
  const terminals = options.terminals || ['T1', 'T2', 'T3'];
  const piers = options.piers || ['A', 'B', 'C', 'D'];
  const stands = [];
  
  for (let i = 0; i < count; i++) {
    const standNumber = (i + 1).toString().padStart(2, '0');
    const terminalIndex = i % terminals.length;
    const pierIndex = i % piers.length;
    
    stands.push({
      id: i + 1,
      name: `${terminals[terminalIndex]}${piers[pierIndex]}${standNumber}`,
      terminal: terminals[terminalIndex],
      pier: piers[pierIndex],
      type: i % 3 === 0 ? 'CONTACT' : 'REMOTE',
      maxAircraftSize: i % 4 === 0 ? 'F' : i % 3 === 0 ? 'E' : i % 2 === 0 ? 'D' : 'C',
      restrictions: [],
      coordinates: {
        lat: 51.5 + (i * 0.001),
        lng: -0.1 + (i * 0.001)
      },
      available: i % 5 !== 0, // Some stands are unavailable
      maintenanceStatus: i % 5 === 0 ? 'UNDER_MAINTENANCE' : 'OPERATIONAL',
      ...options.standOverrides
    });
  }
  
  return stands;
}

/**
 * Create mock airport data for testing
 * 
 * @param {number} count - Number of airports to create
 * @param {Object} options - Airport customization options
 * @returns {Array} - Array of mock airport objects
 */
function createMockAirportData(count = 3, options = {}) {
  const airports = [];
  const codes = options.codes || ['LHR', 'CDG', 'JFK', 'LAX', 'SIN', 'DXB', 'AMS'];
  const names = options.names || [
    'London Heathrow', 'Paris Charles de Gaulle', 'New York JFK', 
    'Los Angeles International', 'Singapore Changi', 'Dubai International', 'Amsterdam Schiphol'
  ];
  
  for (let i = 0; i < Math.min(count, codes.length); i++) {
    airports.push({
      id: i + 1,
      iata: codes[i],
      icao: `E${codes[i]}`,
      name: names[i],
      city: names[i].split(' ')[0],
      country: i % 2 === 0 ? 'United Kingdom' : i % 3 === 0 ? 'United States' : 'Other Country',
      latitude: 50 + (i * 2),
      longitude: -3 + (i * 5),
      ...options.airportOverrides
    });
  }
  
  return airports;
}

/**
 * Create mock airline data for testing
 * 
 * @param {number} count - Number of airlines to create
 * @param {Object} options - Airline customization options
 * @returns {Array} - Array of mock airline objects
 */
function createMockAirlineData(count = 5, options = {}) {
  const airlines = [];
  const codes = options.codes || ['BA', 'AF', 'LH', 'DL', 'EK', 'SQ', 'UA', 'AA'];
  const names = options.names || [
    'British Airways', 'Air France', 'Lufthansa', 'Delta Airlines',
    'Emirates', 'Singapore Airlines', 'United Airlines', 'American Airlines'
  ];
  
  for (let i = 0; i < Math.min(count, codes.length); i++) {
    airlines.push({
      id: i + 1,
      iata: codes[i],
      icao: `${codes[i]}A`,
      name: names[i],
      country: i % 2 === 0 ? 'United Kingdom' : i % 3 === 0 ? 'United States' : 'Other Country',
      active: true,
      ...options.airlineOverrides
    });
  }
  
  return airlines;
}

/**
 * Create mock maintenance request data for testing
 * 
 * @param {number} count - Number of maintenance requests to create
 * @param {Object} options - Maintenance request customization options
 * @returns {Array} - Array of mock maintenance request objects
 */
function createMockMaintenanceData(count = 3, options = {}) {
  const requests = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + i);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1 + i);
    
    requests.push({
      id: i + 1,
      type: i % 3 === 0 ? 'EMERGENCY' : i % 2 === 0 ? 'SCHEDULED' : 'REGULAR',
      status: i % 4 === 0 ? 'PENDING' : i % 3 === 0 ? 'APPROVED' : i % 2 === 0 ? 'IN_PROGRESS' : 'COMPLETED',
      standId: i + 1,
      standName: `Stand ${i + 1}`,
      description: `Maintenance request ${i + 1} description`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      impact: i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
      capacityImpact: {
        lost: i * 2,
        total: 10 + i
      },
      ...options.maintenanceOverrides
    });
  }
  
  return requests;
}

/**
 * Create mock operational settings data for testing
 * 
 * @param {Object} options - Settings customization options
 * @returns {Object} - Mock operational settings object
 */
function createMockOperationalSettings(options = {}) {
  return {
    operationalHours: {
      start: options.startHour || "06:00",
      end: options.endHour || "23:00"
    },
    peakHours: [
      { start: "07:00", end: "09:00" },
      { start: "17:00", end: "19:00" }
    ],
    minTurnaroundTime: options.minTurnaround || 45,
    defaultTurnaroundTime: options.defaultTurnaround || 60,
    timeSlots: options.timeSlots || [
      { id: 1, name: "Morning", start: "06:00", end: "12:00" },
      { id: 2, name: "Afternoon", start: "12:00", end: "18:00" },
      { id: 3, name: "Evening", start: "18:00", end: "23:00" }
    ],
    ...options.settingsOverrides
  };
}

// Export the utilities
module.exports = {
  createMockParsedQuery,
  createMockContext,
  createMockServices,
  testQueryHandler,
  verifyResponseFormat,
  createMockStandData,
  createMockAirportData,
  createMockAirlineData,
  createMockMaintenanceData,
  createMockOperationalSettings
};