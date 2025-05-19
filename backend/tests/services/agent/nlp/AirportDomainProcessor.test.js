/**
 * Tests for AirportDomainProcessor
 */
const { AirportDomainProcessor } = require('../../../../src/services/agent/nlp');
const { 
  createMockServices, 
  createMockContext
} = require('../../../../src/services/agent/nlp/testing/NLPTestUtilities');

describe('AirportDomainProcessor', () => {
  let processor;
  let mockServices;
  
  beforeEach(() => {
    // Create mock services
    mockServices = createMockServices({
      standDataService: {
        getStandByName: jest.fn().mockImplementation((name) => {
          if (name === 'A1') {
            return Promise.resolve({
              id: 1,
              name: 'A1',
              terminal: 'T1',
              pier: 'A'
            });
          }
          return Promise.resolve(null);
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
      }
    });
    
    // Create processor instance
    processor = new AirportDomainProcessor(mockServices, {
      defaultAirport: 'LHR',
      contextEnabled: true
    });
  });
  
  test('should correctly identify intent categories', () => {
    expect(processor.getIntentCategory('stand.details')).toBe('asset');
    expect(processor.getIntentCategory('airport.info')).toBe('reference');
    expect(processor.getIntentCategory('maintenance.status')).toBe('maintenance');
    expect(processor.getIntentCategory('capacity.current')).toBe('operational');
    expect(processor.getIntentCategory('unknown.intent')).toBeNull();
  });
  
  test('should apply default entities', async () => {
    const parsedQuery = {
      intent: 'stand.details',
      entities: {
        stand: 'A1'
      }
    };
    
    const result = await processor.process(parsedQuery);
    
    expect(result.success).toBe(true);
    expect(result.data.entities.airport).toBe('LHR');
    expect(result.data.entities._airportFromDefault).toBe(true);
  });
  
  test('should apply context from conversation', async () => {
    const parsedQuery = {
      intent: 'stand.status',
      entities: {
        stand: 'A1'
      }
    };
    
    const context = createMockContext({
      entities: {
        terminal: 'T1'
      }
    });
    
    const result = await processor.process(parsedQuery, context);
    
    expect(result.success).toBe(true);
    expect(result.data.entities.terminal).toBe('T1');
  });
  
  test('should infer entities based on domain knowledge', async () => {
    const parsedQuery = {
      intent: 'stand.details',
      entities: {
        stand: 'A1'
      }
    };
    
    const result = await processor.process(parsedQuery);
    
    expect(result.success).toBe(true);
    expect(result.data.entities.terminal).toBe('T1');
    expect(result.data.entities.pier).toBe('A');
    expect(result.data.entities._terminalInferred).toBe(true);
    expect(result.data.entities._pierInferred).toBe(true);
    expect(mockServices.standDataService.getStandByName).toHaveBeenCalledWith('A1');
  });
  
  test('should validate against intent-entity requirements', async () => {
    // Valid query
    const validQuery = {
      intent: 'stand.details',
      entities: {
        stand: 'A1'
      }
    };
    
    const validResult = await processor.process(validQuery);
    expect(validResult.success).toBe(true);
    
    // Invalid query - missing required entity
    const invalidQuery = {
      intent: 'stand.details',
      entities: {}
    };
    
    const invalidResult = await processor.process(invalidQuery);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.metadata.error.code).toBe('VALIDATION_FAILED');
    expect(invalidResult.metadata.error.details.missingRequired).toContain('stand');
  });
  
  test('should handle special case validations', async () => {
    // Special case for stand.nearest - requires coordinates or reference point
    const validQuery = {
      intent: 'stand.nearest',
      entities: {
        latitude: 51.5,
        longitude: -0.1
      }
    };
    
    const validResult = await processor.process(validQuery);
    expect(validResult.success).toBe(true);
    
    // Alternative form with reference point
    const alternativeQuery = {
      intent: 'stand.nearest',
      entities: {
        referencePoint: 'Terminal 1'
      }
    };
    
    const alternativeResult = await processor.process(alternativeQuery);
    expect(alternativeResult.success).toBe(true);
    
    // Invalid query - missing required info
    const invalidQuery = {
      intent: 'stand.nearest',
      entities: {}
    };
    
    const invalidResult = await processor.process(invalidQuery);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.metadata.error.code).toBe('VALIDATION_FAILED');
  });
  
  test('should generate domain metadata for enhanced queries', async () => {
    const parsedQuery = {
      intent: 'stand.details',
      entities: {
        stand: 'A1',
        airport: 'LHR'
      }
    };
    
    const result = await processor.process(parsedQuery);
    
    expect(result.success).toBe(true);
    expect(result.metadata.domainMetadata.category).toBe('asset');
    expect(result.metadata.domainMetadata.locationBased).toBe(true);
    expect(result.metadata.domainMetadata.airport).toBeDefined();
    expect(result.metadata.domainMetadata.airport.iata).toBe('LHR');
    expect(result.metadata.domainMetadata.airport.name).toBe('London Heathrow');
  });
  
  test('should detect time-dependent queries', async () => {
    // Time-dependent query with date entity
    const timeQuery = {
      intent: 'stand.status',
      entities: {
        stand: 'A1',
        date: '2023-05-15'
      }
    };
    
    const timeResult = await processor.process(timeQuery);
    expect(timeResult.success).toBe(true);
    expect(timeResult.metadata.domainMetadata.timeDependent).toBe(true);
    
    // Time-dependent query by intent
    const capacityQuery = {
      intent: 'capacity.current',
      entities: {
        airport: 'LHR'
      }
    };
    
    const capacityResult = await processor.process(capacityQuery);
    expect(capacityResult.success).toBe(true);
    expect(capacityResult.metadata.domainMetadata.timeDependent).toBe(true);
    
    // Non-time-dependent query
    const referenceQuery = {
      intent: 'aircraft.info',
      entities: {
        aircraftType: '777'
      }
    };
    
    const referenceResult = await processor.process(referenceQuery);
    expect(referenceResult.success).toBe(true);
    expect(referenceResult.metadata.domainMetadata.timeDependent).toBe(false);
  });
  
  test('should handle errors gracefully', async () => {
    // Invalid query with missing intent
    const invalidQuery = {
      entities: {
        stand: 'A1'
      }
    };
    
    const result = await processor.process(invalidQuery);
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('INVALID_QUERY');
  });
  
  test('should track and report performance metrics', async () => {
    // Process a few queries
    await processor.process({
      intent: 'stand.details',
      entities: { stand: 'A1' }
    });
    
    await processor.process({
      intent: 'airport.info',
      entities: { airport: 'LHR' }
    });
    
    // Get metrics
    const metrics = processor.getMetrics();
    
    expect(metrics.processed).toBe(2);
    expect(metrics.successful).toBe(2);
    expect(metrics.processingTimeMs).toBeGreaterThan(0);
    
    // Reset metrics
    processor.resetMetrics();
    const resetMetrics = processor.getMetrics();
    
    expect(resetMetrics.processed).toBe(0);
  });
});