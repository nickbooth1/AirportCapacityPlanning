/**
 * Tests for NLP Pipeline Integration
 */
const { createNLPPipeline } = require('../../../../src/services/agent/nlp');
const { 
  createMockServices, 
  createMockContext,
  setupIntentClassifierMock,
  setupEntityExtractorMock
} = require('../../../../src/services/agent/nlp/testing/NLPTestUtilities');

describe('NLP Pipeline', () => {
  let pipeline;
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
    
    // Setup mocks for AI responses
    setupIntentClassifierMock(
      mockServices.openAIService,
      'Tell me about stand A1',
      'stand.details',
      0.95
    );
    
    setupEntityExtractorMock(
      mockServices.openAIService,
      'Tell me about stand A1',
      { stand: 'A1' }
    );
    
    // Create NLP pipeline
    pipeline = createNLPPipeline(mockServices, {
      defaultAirport: 'LHR',
      confidenceThreshold: 0.7
    });
  });
  
  test('should create a pipeline with all components', () => {
    expect(pipeline.intentClassifier).toBeDefined();
    expect(pipeline.entityExtractor).toBeDefined();
    expect(pipeline.queryParser).toBeDefined();
    expect(pipeline.domainProcessor).toBeDefined();
    expect(typeof pipeline.processQuery).toBe('function');
    expect(typeof pipeline.getMetrics).toBe('function');
    expect(typeof pipeline.resetMetrics).toBe('function');
  });
  
  test('should process a query through the full pipeline', async () => {
    const result = await pipeline.processQuery('Tell me about stand A1');
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('stand.details');
    expect(result.data.entities.stand).toBe('A1');
    expect(result.data.entities.airport).toBe('LHR'); // Default airport
    expect(result.data.entities.terminal).toBe('T1'); // Inferred
    expect(result.data.entities.pier).toBe('A');      // Inferred
    
    expect(result.metadata.domainMetadata.category).toBe('asset');
    expect(result.metadata.domainMetadata.locationBased).toBe(true);
    expect(result.metadata.domainMetadata.airport).toBeDefined();
  });
  
  test('should use conversation context for query processing', async () => {
    const context = createMockContext({
      conversationId: 'test-convo-123',
      entities: {
        terminal: 'T2' // Should override inferred terminal
      }
    });
    
    const result = await pipeline.processQuery('Tell me about stand A1', context);
    
    expect(result.success).toBe(true);
    expect(result.data.entities.terminal).toBe('T2'); // From context, not inferred
    expect(result.data.conversationId).toBe('test-convo-123');
  });
  
  test('should return error for invalid queries', async () => {
    // Setup mock for ambiguous query with low confidence
    setupIntentClassifierMock(
      mockServices.openAIService,
      'something very unclear',
      'unknown',
      0.3
    );
    
    const result = await pipeline.processQuery('something very unclear');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('LOW_CONFIDENCE');
  });
  
  test('should return error when required entities are missing', async () => {
    // Setup mock for a query with recognized intent but missing entities
    setupIntentClassifierMock(
      mockServices.openAIService,
      'Tell me about the stand',
      'stand.details',
      0.9
    );
    
    setupEntityExtractorMock(
      mockServices.openAIService,
      'Tell me about the stand',
      {} // No stand entity extracted
    );
    
    const result = await pipeline.processQuery('Tell me about the stand');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('VALIDATION_FAILED');
    expect(result.metadata.error.details.missingRequired).toContain('stand');
  });
  
  test('should handle complex queries with combined knowledge', async () => {
    // Setup mock for a complex query
    setupIntentClassifierMock(
      mockServices.openAIService,
      'Can a Boeing 777 use stand A1 at Terminal 1 tomorrow?',
      'aircraft.stands',
      0.85
    );
    
    setupEntityExtractorMock(
      mockServices.openAIService,
      'Can a Boeing 777 use stand A1 at Terminal 1 tomorrow?',
      {
        aircraftType: '777',
        stand: 'A1',
        terminal: 'T1',
        date: 'tomorrow'
      }
    );
    
    const result = await pipeline.processQuery('Can a Boeing 777 use stand A1 at Terminal 1 tomorrow?');
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('aircraft.stands');
    expect(result.data.entities.aircraftType).toBe('777');
    expect(result.data.entities.stand).toBe('A1');
    expect(result.data.entities.terminal).toBe('T1');
    expect(result.data.entities.date).toBeDefined();
    expect(result.metadata.domainMetadata.timeDependent).toBe(true);
  });
  
  test('should provide metrics across all pipeline components', () => {
    const metrics = pipeline.getMetrics();
    
    expect(metrics.intentClassifier).toBeDefined();
    expect(metrics.entityExtractor).toBeDefined();
    expect(metrics.queryParser).toBeDefined();
    expect(metrics.domainProcessor).toBeDefined();
    
    pipeline.resetMetrics();
    
    const resetMetrics = pipeline.getMetrics();
    expect(resetMetrics.intentClassifier.processed).toBe(0);
    expect(resetMetrics.entityExtractor.processed).toBe(0);
  });
});