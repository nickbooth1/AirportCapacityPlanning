/**
 * Tests for QueryParser
 */
const { QueryParser, IntentClassifier, EntityExtractor } = require('../../../../src/services/agent/nlp');
const { 
  createMockServices, 
  createMockContext,
  setupIntentClassifierMock,
  setupEntityExtractorMock
} = require('../../../../src/services/agent/nlp/testing/NLPTestUtilities');

describe('QueryParser', () => {
  let parser;
  let mockServices;
  let mockIntentClassifier;
  let mockEntityExtractor;
  
  beforeEach(() => {
    // Create mock services
    mockServices = createMockServices();
    
    // Create mock components with spies
    mockIntentClassifier = {
      process: jest.fn().mockResolvedValue({
        success: true,
        data: {
          intent: 'stand.details',
          confidence: 0.9,
          method: 'rules'
        }
      }),
      getMetrics: jest.fn().mockReturnValue({ processed: 1 }),
      resetMetrics: jest.fn()
    };
    
    mockEntityExtractor = {
      process: jest.fn().mockResolvedValue({
        success: true,
        data: {
          stand: 'A1'
        }
      }),
      getMetrics: jest.fn().mockReturnValue({ processed: 1 }),
      resetMetrics: jest.fn()
    };
    
    // Create parser instance with mock components
    parser = new QueryParser(mockServices, {
      intentClassifier: mockIntentClassifier,
      entityExtractor: mockEntityExtractor,
      minConfidenceThreshold: 0.6,
      cacheEnabled: true
    });
  });
  
  test('should integrate intent classification and entity extraction', async () => {
    const result = await parser.process('Tell me about stand A1');
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('stand.details');
    expect(result.data.confidence).toBe(0.9);
    expect(result.data.entities.stand).toBe('A1');
    expect(mockIntentClassifier.process).toHaveBeenCalled();
    expect(mockEntityExtractor.process).toHaveBeenCalled();
  });
  
  test('should return error when intent classification fails', async () => {
    // Override the mock to simulate failure
    mockIntentClassifier.process.mockResolvedValueOnce({
      success: false,
      metadata: {
        error: {
          code: 'CLASSIFICATION_FAILED',
          message: 'Failed to classify intent'
        }
      }
    });
    
    const result = await parser.process('An unclear query');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('INTENT_CLASSIFICATION_FAILED');
    expect(mockEntityExtractor.process).not.toHaveBeenCalled(); // Should not proceed to entity extraction
  });
  
  test('should return error when intent confidence is too low', async () => {
    // Override the mock to simulate low confidence
    mockIntentClassifier.process.mockResolvedValueOnce({
      success: true,
      data: {
        intent: 'unknown',
        confidence: 0.4,
        method: 'ai'
      }
    });
    
    const result = await parser.process('A very ambiguous query');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('LOW_CONFIDENCE');
    expect(mockEntityExtractor.process).not.toHaveBeenCalled(); // Should not proceed to entity extraction
  });
  
  test('should return error when entity extraction fails', async () => {
    // Override the mock to simulate failure
    mockEntityExtractor.process.mockResolvedValueOnce({
      success: false,
      metadata: {
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Failed to extract entities'
        }
      }
    });
    
    const result = await parser.process('Tell me about stand A1');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('ENTITY_EXTRACTION_FAILED');
  });
  
  test('should use conversation context for processing', async () => {
    const context = createMockContext({
      conversationId: 'test-convo-123'
    });
    
    const result = await parser.process('Tell me about stand A1', context);
    
    expect(result.success).toBe(true);
    expect(result.data.conversationId).toBe('test-convo-123');
    expect(mockIntentClassifier.process).toHaveBeenCalledWith(
      'Tell me about stand A1',
      context
    );
    expect(mockEntityExtractor.process).toHaveBeenCalledWith(
      'Tell me about stand A1',
      expect.objectContaining({ 
        conversationId: 'test-convo-123',
        intent: 'stand.details'
      })
    );
  });
  
  test('should cache parsed queries and retrieve from cache', async () => {
    // Process a query
    const firstResult = await parser.process('Tell me about stand A1');
    expect(firstResult.success).toBe(true);
    
    // Reset the mocks to verify they're not called a second time
    mockIntentClassifier.process.mockClear();
    mockEntityExtractor.process.mockClear();
    
    // Process the same query again
    const secondResult = await parser.process('Tell me about stand A1');
    
    expect(secondResult.success).toBe(true);
    expect(secondResult.data).toEqual(firstResult.data);
    expect(mockIntentClassifier.process).not.toHaveBeenCalled(); // Should not be called a second time
    expect(mockEntityExtractor.process).not.toHaveBeenCalled(); // Should not be called a second time
  });
  
  test('should handle empty or invalid input', async () => {
    const result = await parser.process('');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('INVALID_INPUT');
    expect(mockIntentClassifier.process).not.toHaveBeenCalled();
    expect(mockEntityExtractor.process).not.toHaveBeenCalled();
  });
  
  test('should clear cache when requested', async () => {
    // Process a query
    await parser.process('Tell me about stand A1');
    
    // Clear cache
    parser.clearCache();
    
    // Process the same query again
    await parser.process('Tell me about stand A1');
    
    // Both should have been called twice
    expect(mockIntentClassifier.process).toHaveBeenCalledTimes(2);
    expect(mockEntityExtractor.process).toHaveBeenCalledTimes(2);
  });
  
  test('should track and report combined metrics', async () => {
    // Process a query
    await parser.process('Tell me about stand A1');
    
    // Get metrics
    const metrics = parser.getMetrics();
    
    expect(metrics.parser).toBeDefined();
    expect(metrics.intentClassifier).toBeDefined();
    expect(metrics.entityExtractor).toBeDefined();
    expect(metrics.cacheSize).toBe(1);
    
    // Reset metrics
    parser.resetMetrics();
    
    expect(mockIntentClassifier.resetMetrics).toHaveBeenCalled();
    expect(mockEntityExtractor.resetMetrics).toHaveBeenCalled();
  });
  
  test('should work with real sub-components', async () => {
    // Create a parser with real components but mock services
    const realParser = new QueryParser(mockServices, {
      minConfidenceThreshold: 0.6
    });
    
    // Setup mocks for the real components
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
    
    const result = await realParser.process('Tell me about stand A1');
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('stand.details');
    expect(result.data.entities.stand).toBe('A1');
    
    // Verify that the real instances were used
    expect(realParser.intentClassifier instanceof IntentClassifier).toBe(true);
    expect(realParser.entityExtractor instanceof EntityExtractor).toBe(true);
  });
});