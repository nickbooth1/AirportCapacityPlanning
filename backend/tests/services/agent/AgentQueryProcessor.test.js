/**
 * Tests for AgentQueryProcessor
 */
const AgentQueryProcessor = require('../../../src/services/agent/AgentQueryProcessor');
const { createMockServices, createMockContext } = require('../../../src/services/agent/nlp/testing/NLPTestUtilities');
const { QueryHandlerBase } = require('../../../src/services/agent/queries');

// Create a mock query handler for testing
class MockQueryHandler extends QueryHandlerBase {
  getQueryTypes() {
    return ['test.query', 'stand.details'];
  }
  
  canHandle(parsedQuery) {
    return this.getQueryTypes().includes(parsedQuery.intent);
  }
  
  async handleQuery(parsedQuery) {
    if (parsedQuery.intent === 'test.query') {
      return this.createSuccessResponse({ message: 'Test query handled', entities: parsedQuery.entities });
    }
    
    if (parsedQuery.intent === 'stand.details') {
      const standId = parsedQuery.entities.stand;
      if (!standId) {
        return this.createErrorResponse('Stand ID is required');
      }
      return this.createSuccessResponse({ stand: { id: standId, name: `Stand ${standId}` } });
    }
    
    return this.createErrorResponse('Unsupported query');
  }
}

describe('AgentQueryProcessor', () => {
  let processor;
  let mockServices;
  let mockNlpPipeline;
  let mockQueryRegistry;
  
  beforeEach(() => {
    // Create mock services
    mockServices = createMockServices();
    
    // Create mock NLP pipeline
    mockNlpPipeline = {
      processQuery: jest.fn().mockResolvedValue({
        success: true,
        data: {
          intent: 'test.query',
          confidence: 0.9,
          entities: { param: 'value' },
          rawText: 'Test query'
        }
      }),
      getMetrics: jest.fn().mockReturnValue({ processed: 1 }),
      resetMetrics: jest.fn(),
      queryParser: {
        getAvailableIntents: jest.fn().mockReturnValue(['test.query', 'stand.details'])
      }
    };
    
    // Create mock query registry with a real handler
    const mockHandler = new MockQueryHandler(mockServices);
    mockQueryRegistry = {
      handlers: [mockHandler],
      findHandlers: jest.fn().mockReturnValue([mockHandler]),
      processQuery: jest.fn().mockImplementation(async (parsedQuery) => {
        return await mockHandler.handleQuery(parsedQuery);
      })
    };
    
    // Create processor with mocks
    processor = new AgentQueryProcessor(mockServices, {
      nlpPipeline: mockNlpPipeline
    });
    
    // Replace the registry with our mock
    processor.queryRegistry = mockQueryRegistry;
  });
  
  test('should process a query through the pipeline and handler', async () => {
    const result = await processor.processQuery('Test query');
    
    expect(result.success).toBe(true);
    expect(result.response.message).toBe('Test query handled');
    expect(result.response.entities.param).toBe('value');
    expect(result.handlerUsed).toBe('MockQueryHandler');
    expect(mockNlpPipeline.processQuery).toHaveBeenCalledWith('Test query', {});
    expect(mockQueryRegistry.findHandlers).toHaveBeenCalled();
    expect(mockQueryRegistry.processQuery).toHaveBeenCalled();
  });
  
  test('should handle NLP processing failures', async () => {
    // Override NLP pipeline to return an error
    mockNlpPipeline.processQuery.mockResolvedValueOnce({
      success: false,
      metadata: {
        error: {
          message: 'Failed to classify intent',
          code: 'CLASSIFICATION_FAILED'
        }
      }
    });
    
    const result = await processor.processQuery('Ambiguous query');
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('CLASSIFICATION_FAILED');
    expect(mockQueryRegistry.findHandlers).not.toHaveBeenCalled();
    expect(mockQueryRegistry.processQuery).not.toHaveBeenCalled();
  });
  
  test('should handle cases where no handler is found', async () => {
    // Override NLP pipeline to return an unsupported intent
    mockNlpPipeline.processQuery.mockResolvedValueOnce({
      success: true,
      data: {
        intent: 'unsupported.intent',
        confidence: 0.9,
        entities: {},
        rawText: 'Unsupported query'
      }
    });
    
    // Override registry to return no handlers
    mockQueryRegistry.findHandlers.mockReturnValueOnce([]);
    
    const result = await processor.processQuery('Unsupported query');
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NO_HANDLER_FOUND');
    expect(mockQueryRegistry.processQuery).not.toHaveBeenCalled();
  });
  
  test('should handle handler processing errors', async () => {
    // Override NLP pipeline to return a query that will fail in the handler
    mockNlpPipeline.processQuery.mockResolvedValueOnce({
      success: true,
      data: {
        intent: 'stand.details',
        confidence: 0.9,
        entities: {}, // Missing required 'stand' entity
        rawText: 'Tell me about the stand'
      }
    });
    
    const result = await processor.processQuery('Tell me about the stand');
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Handler error');
  });
  
  test('should track and report metrics', async () => {
    // Process a few queries
    await processor.processQuery('Test query 1');
    await processor.processQuery('Test query 2');
    
    // Get metrics
    const metrics = processor.getMetrics();
    
    expect(metrics.processor.processed).toBe(2);
    expect(metrics.processor.successful).toBe(2);
    expect(metrics.processor.processingTimeMs).toBeGreaterThan(0);
    expect(metrics.nlp).toBeDefined();
    expect(metrics.queryHandlers.totalHandlers).toBe(1);
    
    // Reset metrics
    processor.resetMetrics();
    const resetMetrics = processor.getMetrics();
    
    expect(resetMetrics.processor.processed).toBe(0);
    expect(mockNlpPipeline.resetMetrics).toHaveBeenCalled();
  });
  
  test('should provide introspection methods', () => {
    // Get available intents
    const intents = processor.getAvailableIntents();
    expect(intents).toContain('test.query');
    expect(intents).toContain('stand.details');
    
    // Get registered handlers
    const handlers = processor.getRegisteredHandlers();
    expect(handlers.length).toBe(1);
    expect(handlers[0].name).toBe('MockQueryHandler');
    expect(handlers[0].queryTypes).toContain('test.query');
  });
  
  test('should use conversation context when processing queries', async () => {
    const context = createMockContext({
      conversationId: 'test-convo-123',
      lastIntent: 'previous.intent'
    });
    
    const result = await processor.processQuery('Test query', context);
    
    expect(result.success).toBe(true);
    expect(mockNlpPipeline.processQuery).toHaveBeenCalledWith('Test query', context);
    expect(result.context.conversationId).toBe('test-convo-123');
    expect(result.context.lastIntent).toBe('test.query'); // Should be updated
  });
  
  test('should handle unexpected errors gracefully', async () => {
    // Make the registry's processQuery throw an error
    mockQueryRegistry.processQuery.mockImplementationOnce(() => {
      throw new Error('Unexpected internal error');
    });
    
    const result = await processor.processQuery('Test query');
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('PROCESSING_ERROR');
    expect(result.error.message).toContain('Unexpected error');
  });
});