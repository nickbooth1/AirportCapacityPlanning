/**
 * Tests for EntityExtractor
 */
const { EntityExtractor } = require('../../../../src/services/agent/nlp');
const { 
  createMockServices, 
  createMockContext, 
  setupEntityExtractorMock,
  generateEntityTestCases 
} = require('../../../../src/services/agent/nlp/testing/NLPTestUtilities');

describe('EntityExtractor', () => {
  let extractor;
  let mockServices;
  
  beforeEach(() => {
    // Create mock services
    mockServices = createMockServices({
      standDataService: {
        getStandByName: jest.fn().mockResolvedValue({
          id: 1,
          name: 'A1',
          terminal: 'T1',
          pier: 'A'
        }),
        getStands: jest.fn().mockImplementation((criteria) => {
          if (criteria && criteria.name === 'A1') {
            return Promise.resolve([{
              id: 1,
              name: 'A1',
              terminal: 'T1',
              pier: 'A'
            }]);
          }
          return Promise.resolve([]);
        })
      },
      airportService: {
        getAirportByIATA: jest.fn().mockImplementation((iata) => {
          if (iata === 'LHR') {
            return Promise.resolve({
              id: 1,
              iata: 'LHR',
              name: 'London Heathrow'
            });
          }
          return Promise.resolve(null);
        })
      },
      airlineService: {
        getAirlineByIATA: jest.fn().mockImplementation((iata) => {
          if (iata === 'BA') {
            return Promise.resolve({
              id: 1,
              iata: 'BA',
              name: 'British Airways'
            });
          }
          return Promise.resolve(null);
        })
      },
      referenceDataService: {
        getAircraftTypeByIATA: jest.fn().mockImplementation((iata) => {
          if (iata === '777') {
            return Promise.resolve({
              id: 1,
              iata: '777',
              name: 'Boeing 777',
              sizeCategory: 'E'
            });
          }
          return Promise.resolve(null);
        })
      }
    });
    
    // Create extractor instance
    extractor = new EntityExtractor(mockServices);
  });
  
  test('should initialize with default entity types', () => {
    expect(Object.keys(extractor.entityTypes).length).toBeGreaterThan(0);
    expect(extractor.entityTypes.stand).toBeDefined();
    expect(extractor.entityTypes.airport).toBeDefined();
    expect(extractor.entityTypes.date).toBeDefined();
  });
  
  test('should extract stand entities using rules', async () => {
    const result = await extractor.process('Tell me about stand A1');
    
    expect(result.success).toBe(true);
    expect(result.data.stand).toBe('A1');
  });
  
  test('should extract multiple entity types using rules', async () => {
    const result = await extractor.process('Is stand A1 in Terminal 1 available tomorrow?');
    
    expect(result.success).toBe(true);
    expect(result.data.stand).toBe('A1');
    expect(result.data.terminal).toBe('T1');
    expect(result.data.date).toBeDefined(); // Tomorrow should be converted to a date
  });
  
  test('should validate entities when validation services are available', async () => {
    // This query contains valid and invalid entities
    const result = await extractor.process('Compare airlines BA and ZZ');
    
    expect(result.success).toBe(true);
    expect(result.data.airline).toBe('BA'); // Only BA should be included as ZZ is invalid
    expect(mockServices.airlineService.getAirlineByIATA).toHaveBeenCalledWith('BA');
    expect(mockServices.airlineService.getAirlineByIATA).toHaveBeenCalledWith('ZZ');
  });
  
  test('should parse and transform entities', async () => {
    const result = await extractor.process('Show me data from 3pm');
    
    expect(result.success).toBe(true);
    expect(result.data.time).toBe('15:00'); // 3pm should be converted to 24h format
  });
  
  test('should use AI extraction to supplement rule-based extraction', async () => {
    // Setup mock for a complex query that benefits from AI extraction
    setupEntityExtractorMock(
      mockServices.openAIService,
      'What is the capacity impact of closing Terminal 2 North pier for maintenance next week?',
      {
        terminal: 'T2',
        pier: 'North',
        purpose: 'maintenance',
        timeframe: 'next week'
      }
    );
    
    const result = await extractor.process(
      'What is the capacity impact of closing Terminal 2 North pier for maintenance next week?',
      { intent: 'capacity.impact' }
    );
    
    expect(result.success).toBe(true);
    expect(result.data.terminal).toBe('T2');
    expect(result.data.pier).toBe('North');
    expect(result.data.purpose).toBe('maintenance');
    expect(result.data.timeframe).toBe('next week');
    expect(mockServices.openAIService.createChatCompletion).toHaveBeenCalled();
  });
  
  test('should handle empty or invalid input', async () => {
    const result = await extractor.process('');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('INVALID_INPUT');
  });
  
  test('should properly merge entities from different sources', async () => {
    // Setup AI to find entities not caught by rules
    setupEntityExtractorMock(
      mockServices.openAIService,
      'Check if stand A1 is available for a 777 tomorrow',
      {
        stand: 'A1',
        aircraftType: '777',
        available: true,
        date: 'tomorrow'
      }
    );
    
    const result = await extractor.process('Check if stand A1 is available for a 777 tomorrow');
    
    expect(result.success).toBe(true);
    expect(result.data.stand).toBe('A1');
    expect(result.data.aircraftType).toBe('777');
    expect(result.data.available).toBe(true);
    expect(result.data.date).toBeDefined();
  });
  
  test('should track and report performance metrics', async () => {
    // Process a few queries
    await extractor.process('tell me about stand A1');
    await extractor.process('is LHR busy today?');
    
    // Get metrics
    const metrics = extractor.getMetrics();
    
    expect(metrics.processed).toBe(2);
    expect(metrics.successful).toBe(2);
    expect(metrics.processingTimeMs).toBeGreaterThan(0);
    
    // Reset metrics
    extractor.resetMetrics();
    const resetMetrics = extractor.getMetrics();
    
    expect(resetMetrics.processed).toBe(0);
  });
  
  // Test against standard test cases
  test.each(generateEntityTestCases())('should extract entities from $description', async ({ input, expected }) => {
    // Setup mock
    setupEntityExtractorMock(
      mockServices.openAIService,
      input,
      expected
    );
    
    const result = await extractor.process(input);
    
    expect(result.success).toBe(true);
    
    // Check each expected entity
    for (const [key, value] of Object.entries(expected)) {
      if (value === expect.any(String)) {
        expect(result.data[key]).toBeDefined();
      } else {
        expect(result.data[key]).toEqual(value);
      }
    }
  });
});