/**
 * Test for Stand Query Handlers
 * 
 * This file contains tests for the stand-related query handlers.
 */
const {
  StandDetailQueryHandler,
  StandLocationQueryHandler,
  StandCapabilityQueryHandler
} = require('../../../../src/services/agent/queries/handlers/asset');

const {
  createMockParsedQuery,
  createMockContext,
  createMockServices,
  testQueryHandler,
  verifyResponseFormat,
  createMockStandData
} = require('../../../../src/services/agent/queries/testing/QueryTestUtilities');

describe('Stand Query Handlers', () => {
  // Common setup for tests
  let mockServices;
  let mockStands;

  beforeEach(() => {
    // Create sample stand data
    mockStands = createMockStandData(10);
    
    // Create mock services with pre-configured data
    mockServices = createMockServices({
      standDataService: {
        getStands: jest.fn().mockResolvedValue(mockStands),
        getStandById: jest.fn().mockImplementation((id) => {
          const stand = mockStands.find(s => s.id === id);
          return Promise.resolve(stand || null);
        }),
        getStandsWithMaintenanceStatus: jest.fn().mockResolvedValue(mockStands),
        getStandStatistics: jest.fn().mockResolvedValue({ 
          total: mockStands.length,
          available: mockStands.filter(s => s.available).length
        }),
        getStandTypeDistribution: jest.fn().mockResolvedValue({
          CONTACT: mockStands.filter(s => s.type === 'CONTACT').length,
          REMOTE: mockStands.filter(s => s.type === 'REMOTE').length
        }),
        getNearestStands: jest.fn().mockImplementation((location, limit) => {
          // Add a mock distance property to stands
          return Promise.resolve(
            mockStands.slice(0, limit).map((stand, i) => ({
              ...stand,
              distance: i * 50 // Mock distance in meters
            }))
          );
        }),
        getStandsWithAvailability: jest.fn().mockImplementation((criteria) => {
          let filtered = [...mockStands];
          
          if (criteria.available !== undefined) {
            filtered = filtered.filter(s => s.available === criteria.available);
          }
          
          if (criteria.terminal) {
            filtered = filtered.filter(s => s.terminal === criteria.terminal);
          }
          
          if (criteria.pier) {
            filtered = filtered.filter(s => s.pier === criteria.pier);
          }
          
          return Promise.resolve(filtered);
        }),
        getStandCapabilities: jest.fn().mockImplementation((standId) => {
          const stand = mockStands.find(s => s.id === standId);
          if (!stand) return Promise.resolve(null);
          
          return Promise.resolve({
            maxAircraftSize: stand.maxAircraftSize,
            restrictions: [],
            equipment: [
              { type: 'FIXED_BRIDGE', name: 'Passenger Bridge', status: 'OPERATIONAL' },
              { type: 'POWER_SUPPLY', name: '400Hz Power', status: 'OPERATIONAL' }
            ],
            features: ['De-icing', 'Water supply']
          });
        }),
        getCompatibleAircraftTypes: jest.fn().mockImplementation((standId) => {
          const stand = mockStands.find(s => s.id === standId);
          if (!stand) return Promise.resolve([]);
          
          // Sample aircraft data based on stand size
          const aircraftTypes = [];
          
          if (['E', 'F'].includes(stand.maxAircraftSize)) {
            aircraftTypes.push(
              { iata: '388', icao: 'A388', name: 'Airbus A380', sizeCategory: 'F' },
              { iata: '77W', icao: 'B77W', name: 'Boeing 777-300ER', sizeCategory: 'E' }
            );
          }
          
          if (['C', 'D', 'E', 'F'].includes(stand.maxAircraftSize)) {
            aircraftTypes.push(
              { iata: '320', icao: 'A320', name: 'Airbus A320', sizeCategory: 'C' },
              { iata: '738', icao: 'B738', name: 'Boeing 737-800', sizeCategory: 'C' }
            );
          }
          
          if (['A', 'B', 'C', 'D', 'E', 'F'].includes(stand.maxAircraftSize)) {
            aircraftTypes.push(
              { iata: 'E90', icao: 'E190', name: 'Embraer E190', sizeCategory: 'B' },
              { iata: 'DH8', icao: 'DH8D', name: 'Bombardier Q400', sizeCategory: 'A' }
            );
          }
          
          return Promise.resolve(aircraftTypes);
        })
      },
      referenceDataService: {
        getAircraftTypes: jest.fn().mockResolvedValue([
          { iata: '320', icao: 'A320', name: 'Airbus A320', sizeCategory: 'C' },
          { iata: '388', icao: 'A388', name: 'Airbus A380', sizeCategory: 'F' },
          { iata: '738', icao: 'B738', name: 'Boeing 737-800', sizeCategory: 'C' },
          { iata: '77W', icao: 'B77W', name: 'Boeing 777-300ER', sizeCategory: 'E' },
          { iata: 'E90', icao: 'E190', name: 'Embraer E190', sizeCategory: 'B' },
          { iata: 'DH8', icao: 'DH8D', name: 'Bombardier Q400', sizeCategory: 'A' }
        ])
      }
    });
  });

  describe('StandDetailQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new StandDetailQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('stand.details');
      expect(queryTypes).toContain('stand.info');
      expect(queryTypes).toContain('stand.status');
      expect(queryTypes).toContain('stand.find');
    });
    
    test('should handle stand.details intent with ID', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.details', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(response.data.name).toBeTruthy();
      expect(mockServices.standDataService.getStandById).toHaveBeenCalledWith(1);
    });
    
    test('should handle stand.details intent with name', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.details', {
        stand: 'T1A01'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(mockServices.standDataService.getStands).toHaveBeenCalledWith({ name: 'T1A01' });
    });
    
    test('should handle stand.status intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.status', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(response.data.status).toBeTruthy();
      expect(response.data.available).toBeDefined();
      expect(mockServices.standDataService.getStandsWithMaintenanceStatus).toHaveBeenCalled();
    });
    
    test('should handle stand.find intent with criteria', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.find', {
        terminal: 'T1',
        available: true
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.standDataService.getStandsWithAvailability).toHaveBeenCalled();
    });
    
    test('should handle stand.info intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.info', {});
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.totalStands).toBe(mockStands.length);
      expect(response.data.standTypes).toBeDefined();
      expect(mockServices.standDataService.getStandStatistics).toHaveBeenCalled();
      expect(mockServices.standDataService.getStandTypeDistribution).toHaveBeenCalled();
    });
    
    test('should return error for stand.details with missing stand', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.details', {});
      
      // Act
      const response = await handler.handleQuery(parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('MISSING_ENTITY');
    });
    
    test('should return error for stand.details with non-existent stand', async () => {
      // Arrange
      mockServices.standDataService.getStandById.mockResolvedValue(null);
      mockServices.standDataService.getStands.mockResolvedValue([]);
      
      const parsedQuery = createMockParsedQuery('stand.details', {
        stand: 999
      });
      
      // Act
      const response = await handler.handleQuery(parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });
  });

  describe('StandLocationQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new StandLocationQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('stand.location');
      expect(queryTypes).toContain('stand.nearest');
      expect(queryTypes).toContain('terminal.stands');
      expect(queryTypes).toContain('pier.stands');
    });
    
    test('should handle stand.location intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.location', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(response.data.terminal).toBeTruthy();
      expect(response.data.pier).toBeTruthy();
      expect(response.data.coordinates).toBeDefined();
      expect(mockServices.standDataService.getStandById).toHaveBeenCalledWith(1);
    });
    
    test('should handle stand.nearest intent with coordinates', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.nearest', {
        latitude: 51.5,
        longitude: -0.1,
        limit: 3
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(3);
      expect(response.data[0].distance).toBeDefined();
      expect(mockServices.standDataService.getNearestStands).toHaveBeenCalled();
    });
    
    test('should handle terminal.stands intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('terminal.stands', {
        terminal: 'T1'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.standDataService.getStands).toHaveBeenCalledWith({ terminal: 'T1' });
    });
    
    test('should handle pier.stands intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('pier.stands', {
        pier: 'A'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.standDataService.getStands).toHaveBeenCalledWith({ pier: 'A' });
    });
    
    test('should return error for stand.nearest with missing coordinates', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.nearest', {});
      
      // Act
      const response = await handler.handleQuery(parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('MISSING_ENTITY');
    });
  });

  describe('StandCapabilityQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new StandCapabilityQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('stand.capability');
      expect(queryTypes).toContain('stand.aircraft');
      expect(queryTypes).toContain('aircraft.stands');
      expect(queryTypes).toContain('stand.equipment');
    });
    
    test('should handle stand.capability intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.capability', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(response.data.maxAircraftSize).toBeTruthy();
      expect(response.data.supportedAircraftTypes).toBeDefined();
      expect(Array.isArray(response.data.supportedAircraftTypes)).toBe(true);
      expect(mockServices.standDataService.getStandById).toHaveBeenCalledWith(1);
      expect(mockServices.standDataService.getStandCapabilities).toHaveBeenCalledWith(1);
    });
    
    test('should handle stand.aircraft intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.aircraft', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.standId).toBe(1);
      expect(Array.isArray(response.data.compatibleAircraft)).toBe(true);
      expect(response.data.compatibleAircraft.length).toBeGreaterThan(0);
      expect(mockServices.standDataService.getStandById).toHaveBeenCalledWith(1);
      expect(mockServices.standDataService.getCompatibleAircraftTypes).toHaveBeenCalledWith(1);
    });
    
    test('should handle aircraft.stands intent with aircraft type', async () => {
      // Arrange - Mock getStandsForAircraftType method
      mockServices.standDataService.getStandsForAircraftType = jest.fn().mockResolvedValue(
        mockStands.filter(stand => stand.maxAircraftSize === 'C' || stand.maxAircraftSize === 'D')
      );
      
      const parsedQuery = createMockParsedQuery('aircraft.stands', {
        aircraftType: '320'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.aircraftType).toBe('320');
      expect(Array.isArray(response.data.compatibleStands)).toBe(true);
      expect(response.data.compatibleStands.length).toBeGreaterThan(0);
      expect(mockServices.referenceDataService.getAircraftTypes).toHaveBeenCalled();
      expect(mockServices.standDataService.getStandsForAircraftType).toHaveBeenCalled();
    });
    
    test('should handle stand.equipment intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('stand.equipment', {
        stand: 1
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(Array.isArray(response.data.equipment)).toBe(true);
      expect(response.data.hasFixedBridges).toBeDefined();
      expect(response.data.hasPowerSupply).toBeDefined();
      expect(mockServices.standDataService.getStandById).toHaveBeenCalledWith(1);
      expect(mockServices.standDataService.getStandCapabilities).toHaveBeenCalledWith(1);
    });
    
    test('should return error for aircraft.stands with missing aircraft type', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('aircraft.stands', {});
      
      // Act
      const response = await handler.handleQuery(parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('MISSING_ENTITY');
    });
  });
});