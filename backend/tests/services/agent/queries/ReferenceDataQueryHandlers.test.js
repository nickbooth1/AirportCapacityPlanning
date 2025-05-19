/**
 * Test for Reference Data Query Handlers
 * 
 * This file contains tests for the reference data query handlers.
 */

const {
  AirportInfoQueryHandler,
  AirlineInfoQueryHandler,
  GHAInfoQueryHandler,
  AircraftTypeInfoQueryHandler
} = require('../../../../src/services/agent/queries/handlers/reference');

const {
  createMockParsedQuery,
  createMockContext,
  createMockServices,
  testQueryHandler,
  verifyResponseFormat,
  createMockAirportData,
  createMockAirlineData
} = require('../../../../src/services/agent/queries/testing/QueryTestUtilities');

describe('Reference Data Query Handlers', () => {
  // Mock data
  let mockAirports;
  let mockAirlines;
  let mockGHAs;
  let mockAircraftTypes;
  let mockServices;
  
  beforeEach(() => {
    // Create sample data
    mockAirports = createMockAirportData(5);
    mockAirlines = createMockAirlineData(5);
    
    // Mock GHAs
    mockGHAs = [
      { id: 1, code: 'SWS', name: 'Swissport', country: 'Switzerland', serviceTypes: ['RAMP', 'PASSENGER'] },
      { id: 2, code: 'DGS', name: 'Dnata Ground Services', country: 'UAE', serviceTypes: ['RAMP', 'CARGO'] },
      { id: 3, code: 'MEN', name: 'Menzies Aviation', country: 'UK', serviceTypes: ['PASSENGER', 'LOUNGE'] }
    ];
    
    // Mock aircraft types
    mockAircraftTypes = [
      { id: 1, iata: '738', icao: 'B738', name: 'Boeing 737-800', manufacturer: 'Boeing', sizeCategory: 'C' },
      { id: 2, iata: '320', icao: 'A320', name: 'Airbus A320', manufacturer: 'Airbus', sizeCategory: 'C' },
      { id: 3, iata: '77W', icao: 'B77W', name: 'Boeing 777-300ER', manufacturer: 'Boeing', sizeCategory: 'E' },
      { id: 4, iata: '388', icao: 'A388', name: 'Airbus A380-800', manufacturer: 'Airbus', sizeCategory: 'F' },
      { id: 5, iata: 'E90', icao: 'E190', name: 'Embraer E190', manufacturer: 'Embraer', sizeCategory: 'B' }
    ];
    
    // Create mock services
    mockServices = createMockServices({
      referenceDataService: {
        // Airport methods
        getAirports: jest.fn().mockResolvedValue(mockAirports),
        getAirportById: jest.fn().mockImplementation((id) => 
          Promise.resolve(mockAirports.find(a => a.id === id) || null)
        ),
        getAirportByIATA: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAirports.find(a => a.iata === code) || null)
        ),
        getAirportByICAO: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAirports.find(a => a.icao === code) || null)
        ),
        searchAirports: jest.fn().mockImplementation((criteria, limit = 10) => {
          let results = [...mockAirports];
          
          if (criteria.name) {
            results = results.filter(a => a.name.includes(criteria.name));
          }
          
          if (criteria.city) {
            results = results.filter(a => a.city.includes(criteria.city));
          }
          
          if (criteria.country) {
            results = results.filter(a => a.country.includes(criteria.country));
          }
          
          return Promise.resolve(results.slice(0, limit));
        }),
        
        // Airline methods
        getAirlines: jest.fn().mockResolvedValue(mockAirlines),
        getAirlineById: jest.fn().mockImplementation((id) => 
          Promise.resolve(mockAirlines.find(a => a.id === id) || null)
        ),
        getAirlineByIATA: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAirlines.find(a => a.iata === code) || null)
        ),
        getAirlineByICAO: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAirlines.find(a => a.icao === code) || null)
        ),
        searchAirlines: jest.fn().mockImplementation((criteria, limit = 10) => {
          let results = [...mockAirlines];
          
          if (criteria.name) {
            results = results.filter(a => a.name.includes(criteria.name));
          }
          
          if (criteria.country) {
            results = results.filter(a => a.country.includes(criteria.country));
          }
          
          return Promise.resolve(results.slice(0, limit));
        }),
        getAirlinesForRoute: jest.fn().mockImplementation((origin, destination) => {
          // Return a subset of airlines
          return Promise.resolve(mockAirlines.slice(0, 2));
        }),
        
        // GHA methods
        getGroundHandlingAgents: jest.fn().mockResolvedValue(mockGHAs),
        getGroundHandlingAgentById: jest.fn().mockImplementation((id) => 
          Promise.resolve(mockGHAs.find(g => g.id === id) || null)
        ),
        getGroundHandlingAgentByCode: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockGHAs.find(g => g.code === code) || null)
        ),
        searchGroundHandlingAgents: jest.fn().mockImplementation((criteria, limit = 10) => {
          let results = [...mockGHAs];
          
          if (criteria.name) {
            results = results.filter(g => g.name.includes(criteria.name));
          }
          
          if (criteria.country) {
            results = results.filter(g => g.country.includes(criteria.country));
          }
          
          if (criteria.serviceType) {
            results = results.filter(g => g.serviceTypes.includes(criteria.serviceType));
          }
          
          return Promise.resolve(results.slice(0, limit));
        }),
        getGroundHandlingAgentsForAirline: jest.fn().mockImplementation((airlineCode) => {
          // Return a subset of GHAs
          return Promise.resolve(mockGHAs.slice(0, 2));
        }),
        getGroundHandlingAgentsForAirport: jest.fn().mockImplementation((airportCode) => {
          // Return a subset of GHAs
          return Promise.resolve(mockGHAs.slice(0, 2));
        }),
        
        // Aircraft type methods
        getAircraftTypes: jest.fn().mockResolvedValue(mockAircraftTypes),
        getAircraftTypeById: jest.fn().mockImplementation((id) => 
          Promise.resolve(mockAircraftTypes.find(a => a.id === id) || null)
        ),
        getAircraftTypeByIATA: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAircraftTypes.find(a => a.iata === code) || null)
        ),
        getAircraftTypeByICAO: jest.fn().mockImplementation((code) => 
          Promise.resolve(mockAircraftTypes.find(a => a.icao === code) || null)
        ),
        searchAircraftTypes: jest.fn().mockImplementation((criteria, limit = 10) => {
          let results = [...mockAircraftTypes];
          
          if (criteria.name) {
            results = results.filter(a => a.name.includes(criteria.name));
          }
          
          if (criteria.manufacturer) {
            results = results.filter(a => a.manufacturer === criteria.manufacturer);
          }
          
          if (criteria.sizeCategory) {
            results = results.filter(a => a.sizeCategory === criteria.sizeCategory);
          }
          
          return Promise.resolve(results.slice(0, limit));
        }),
        getAircraftSizeCategory: jest.fn().mockImplementation((sizeCode) => {
          const categories = {
            'A': { code: 'A', name: 'Small', description: 'Small aircraft' },
            'B': { code: 'B', name: 'Medium-Small', description: 'Medium-small aircraft' },
            'C': { code: 'C', name: 'Medium', description: 'Medium aircraft' },
            'D': { code: 'D', name: 'Medium-Large', description: 'Medium-large aircraft' },
            'E': { code: 'E', name: 'Large', description: 'Large aircraft' },
            'F': { code: 'F', name: 'Super', description: 'Super large aircraft' }
          };
          
          return Promise.resolve(categories[sizeCode] || null);
        })
      }
    });
  });
  
  describe('AirportInfoQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new AirportInfoQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('airport.info');
      expect(queryTypes).toContain('airport.details');
      expect(queryTypes).toContain('airport.search');
      expect(queryTypes).toContain('airport.list');
    });
    
    test('should handle airport.details intent with IATA code', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airport.details', {
        iata: 'LHR'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.iata).toBe('LHR');
      expect(mockServices.referenceDataService.getAirportByIATA).toHaveBeenCalledWith('LHR');
    });
    
    test('should handle airport.search intent with criteria', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airport.search', {
        country: 'United Kingdom'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.searchAirports).toHaveBeenCalled();
    });
    
    test('should handle airport.list intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airport.list', {
        limit: 3
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(3);
      expect(mockServices.referenceDataService.getAirports).toHaveBeenCalled();
    });
  });
  
  describe('AirlineInfoQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new AirlineInfoQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('airline.info');
      expect(queryTypes).toContain('airline.details');
      expect(queryTypes).toContain('airline.search');
      expect(queryTypes).toContain('airline.list');
      expect(queryTypes).toContain('route.airlines');
    });
    
    test('should handle airline.details intent with IATA code', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airline.details', {
        iata: 'BA'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.iata).toBe('BA');
      expect(mockServices.referenceDataService.getAirlineByIATA).toHaveBeenCalledWith('BA');
    });
    
    test('should handle airline.search intent with criteria', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airline.search', {
        country: 'United Kingdom'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.searchAirlines).toHaveBeenCalled();
    });
    
    test('should handle route.airlines intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('route.airlines', {
        origin: 'LHR',
        destination: 'JFK'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.getAirlinesForRoute).toHaveBeenCalledWith('LHR', 'JFK', 10);
    });
  });
  
  describe('GHAInfoQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new GHAInfoQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('gha.info');
      expect(queryTypes).toContain('gha.details');
      expect(queryTypes).toContain('gha.search');
      expect(queryTypes).toContain('gha.list');
      expect(queryTypes).toContain('airline.gha');
      expect(queryTypes).toContain('airport.gha');
    });
    
    test('should handle gha.details intent with code', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('gha.details', {
        code: 'SWS'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.code).toBe('SWS');
      expect(mockServices.referenceDataService.getGroundHandlingAgentByCode).toHaveBeenCalledWith('SWS');
    });
    
    test('should handle gha.search intent with criteria', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('gha.search', {
        serviceType: 'RAMP'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.searchGroundHandlingAgents).toHaveBeenCalled();
    });
    
    test('should handle airline.gha intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('airline.gha', {
        airline: 'BA'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.getGroundHandlingAgentsForAirline).toHaveBeenCalledWith('BA', 10);
    });
  });
  
  describe('AircraftTypeInfoQueryHandler', () => {
    let handler;
    
    beforeEach(() => {
      handler = new AircraftTypeInfoQueryHandler(mockServices);
    });
    
    test('should support the expected query types', () => {
      const queryTypes = handler.getQueryTypes();
      expect(queryTypes).toContain('aircraft.info');
      expect(queryTypes).toContain('aircraft.details');
      expect(queryTypes).toContain('aircraft.search');
      expect(queryTypes).toContain('aircraft.list');
      expect(queryTypes).toContain('aircraft.size');
    });
    
    test('should handle aircraft.details intent with IATA code', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('aircraft.details', {
        iata: '738'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.data.iata).toBe('738');
      expect(mockServices.referenceDataService.getAircraftTypeByIATA).toHaveBeenCalledWith('738');
    });
    
    test('should handle aircraft.search intent with criteria', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('aircraft.search', {
        manufacturer: 'Boeing'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(mockServices.referenceDataService.searchAircraftTypes).toHaveBeenCalled();
    });
    
    test('should handle aircraft.size intent', async () => {
      // Arrange
      const parsedQuery = createMockParsedQuery('aircraft.size', {
        size: 'C'
      });
      
      // Act
      const response = await testQueryHandler(handler, parsedQuery);
      
      // Assert
      expect(verifyResponseFormat(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(mockServices.referenceDataService.getAircraftTypes).toHaveBeenCalled();
      expect(mockServices.referenceDataService.getAircraftSizeCategory).toHaveBeenCalledWith('C');
    });
  });
});