/**
 * Tests for EnhancedAgentQueryProcessor
 */
const EnhancedAgentQueryProcessor = require('../../../src/services/agent/EnhancedAgentQueryProcessor');

// Mock dependencies
jest.mock('../../../src/services/agent/QueryVariationHandlerService', () => ({
  processQuery: jest.fn().mockImplementation((query) => {
    // Simple mock implementation
    return {
      success: true,
      originalQuery: query,
      normalizedQuery: query.toLowerCase().trim(),
      processingSteps: [],
      wasTransformed: true,
      confidence: 0.95
    };
  }),
  getMetrics: jest.fn().mockReturnValue({}),
  resetMetrics: jest.fn()
}));

jest.mock('../../../src/services/agent/IntentClassifierService', () => ({
  classifyIntent: jest.fn().mockImplementation(async (query) => {
    // Simple mock implementation based on keywords
    if (query.includes('capacity')) {
      return { intent: 'capacity_query', confidence: 0.9, subType: null };
    } else if (query.includes('maintenance')) {
      return { intent: 'maintenance_query', confidence: 0.88, subType: null };
    } else if (query.includes('complex') || query.includes('compare') || query.includes('why')) {
      return { intent: 'complex_query', confidence: 0.85, subType: null };
    } else {
      return { intent: 'unknown', confidence: 0.3, subType: null };
    }
  }),
  getAvailableIntents: jest.fn().mockReturnValue(['capacity_query', 'maintenance_query', 'complex_query', 'unknown']),
  getMetrics: jest.fn().mockReturnValue({}),
  resetMetrics: jest.fn()
}));

jest.mock('../../../src/services/agent/QueryParserService', () => ({
  parseQuery: jest.fn().mockImplementation(async (query, context) => {
    // Simple mock implementation
    const entities = {};
    const parameters = {};
    
    if (query.includes('terminal')) {
      entities.terminal = 'Terminal 1';
      parameters.terminal = 'Terminal 1';
    }
    
    if (query.includes('stand')) {
      entities.stand = 'Stand A1';
      parameters.stand = 'Stand A1';
    }
    
    if (query.includes('tomorrow')) {
      entities.time_period = 'tomorrow';
      parameters.time_period = 'tomorrow';
    }
    
    return {
      success: true,
      query,
      normalizedQuery: query,
      intent: context.intent || 'unknown',
      intentConfidence: context.intentConfidence || 0.5,
      entities,
      parameters,
      incomplete: false
    };
  }),
  getAvailableEntityTypes: jest.fn().mockReturnValue(['terminal', 'stand', 'time_period']),
  getMetrics: jest.fn().mockReturnValue({}),
  resetMetrics: jest.fn()
}));

jest.mock('../../../src/services/agent/MultiStepReasoningService', () => ({
  executeQuery: jest.fn().mockImplementation(async (query) => {
    // Simple mock implementation
    if (query.includes('error')) {
      return {
        success: false,
        error: 'Reasoning error'
      };
    }
    
    return {
      success: true,
      answer: `Answer to query: ${query}`,
      confidence: 0.85,
      reasoning: [{
        stepNumber: 1,
        description: 'Analyzed query context',
        explanation: 'Extracted key components from the query'
      }, {
        stepNumber: 2,
        description: 'Performed calculation',
        explanation: 'Calculated relevant metrics'
      }]
    };
  }),
  getMetrics: jest.fn().mockReturnValue({}),
  resetMetrics: jest.fn()
}));

jest.mock('../../../src/services/agent/WorkingMemoryService', () => {
  return function() {
    // Mock implementation with memory storage
    const sessionStorage = new Map();
    const queryStorage = new Map();
    const entityStorage = new Map();
    
    return {
      getSessionContext: jest.fn().mockImplementation(async (sessionId) => {
        return sessionStorage.get(sessionId) || null;
      }),
      storeSessionContext: jest.fn().mockImplementation(async (sessionId, context) => {
        sessionStorage.set(sessionId, context);
        return true;
      }),
      storeQueryResult: jest.fn().mockImplementation(async (sessionId, queryId, result) => {
        const key = `${sessionId}:${queryId}`;
        queryStorage.set(key, result);
        return true;
      }),
      storeEntityMentions: jest.fn().mockImplementation(async (sessionId, queryId, entities) => {
        const key = `${sessionId}:${queryId}:entities`;
        entityStorage.set(key, entities);
        return true;
      })
    };
  };
});

// Mock query handler
class MockQueryHandler {
  constructor(handleSuccess = true) {
    this.handleSuccess = handleSuccess;
  }
  
  async processQuery(parsedQuery, context) {
    if (!this.handleSuccess) {
      return {
        success: false,
        error: {
          message: 'Handler error',
          code: 'HANDLER_ERROR'
        }
      };
    }
    
    return {
      success: true,
      data: {
        text: `Response for ${parsedQuery.intent}`,
        entities: parsedQuery.entities
      }
    };
  }
}

describe('EnhancedAgentQueryProcessor', () => {
  let processor;
  let successHandler;
  let failHandler;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create handlers
    successHandler = new MockQueryHandler(true);
    failHandler = new MockQueryHandler(false);
    
    // Create processor instance
    processor = new EnhancedAgentQueryProcessor({}, {
      useWorkingMemory: true,
      useMultiStepReasoning: true,
      storeQueryHistory: true
    });
    
    // Register handlers
    processor.registerQueryHandler(successHandler, ['capacity_query', 'maintenance_query']);
    processor.registerQueryHandler(successHandler, ['*']); // Fallback handler
  });

  describe('processQuery', () => {
    it('should handle basic queries successfully', async () => {
      const result = await processor.processQuery('Show capacity for Terminal 1');
      
      expect(result.success).toBe(true);
      expect(result.parsedQuery.intent).toBe('capacity_query');
      expect(result.response).toBeDefined();
    });

    it('should process complex queries with multi-step reasoning', async () => {
      const result = await processor.processQuery('Why is the capacity lower during peak hours?');
      
      expect(result.success).toBe(true);
      expect(result.handlerUsed).toBe('MultiStepReasoningService');
      expect(result.reasoningSteps).toBeDefined();
    });

    it('should handle errors during reasoning', async () => {
      const result = await processor.processQuery('Why is there an error in the calculation?');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('REASONING_ERROR');
    });

    it('should handle intent with no handlers', async () => {
      // Clear registered handlers
      processor.queryHandlerRegistry = {};
      
      const result = await processor.processQuery('Show capacity for Terminal 1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NO_HANDLER_FOUND');
    });

    it('should handle handler errors', async () => {
      // Register fail handler
      processor.queryHandlerRegistry = {
        'capacity_query': [failHandler]
      };
      
      const result = await processor.processQuery('Show capacity for Terminal 1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Handler error');
    });

    it('should store query information in working memory', async () => {
      const sessionId = 'test-session';
      
      const result = await processor.processQuery('Show capacity for Terminal 1', {
        sessionId
      });
      
      expect(result.success).toBe(true);
      
      // Check that the workingMemoryService methods were called
      expect(processor.workingMemoryService.storeQueryResult).toHaveBeenCalled();
      expect(processor.workingMemoryService.storeSessionContext).toHaveBeenCalled();
    });
  });

  describe('metrics and configuration', () => {
    it('should track metrics correctly', async () => {
      // Process some queries
      await processor.processQuery('Show capacity for Terminal 1');
      await processor.processQuery('Show maintenance schedule for Stand A1');
      await processor.processQuery('Why is the capacity lower during peak hours?');
      
      // Get metrics
      const metrics = processor.getMetrics();
      
      expect(metrics.processor.processed).toBe(3);
      expect(metrics.processor.successful).toBe(3);
      expect(metrics.processor.complexQueries).toBe(1);
      expect(metrics.processor.simpleQueries).toBe(2);
    });

    it('should reset metrics correctly', () => {
      // Set some metrics
      processor.metrics.processed = 10;
      processor.metrics.successful = 8;
      
      // Reset metrics
      processor.resetMetrics();
      
      // Check that metrics were reset
      expect(processor.metrics.processed).toBe(0);
      expect(processor.metrics.successful).toBe(0);
      
      // Check that component metrics were reset
      expect(processor.queryVariationHandler.resetMetrics).toHaveBeenCalled();
      expect(processor.intentClassifier.resetMetrics).toHaveBeenCalled();
      expect(processor.queryParser.resetMetrics).toHaveBeenCalled();
      expect(processor.multiStepReasoningService.resetMetrics).toHaveBeenCalled();
    });

    it('should update configuration options', () => {
      // Update configuration
      processor.updateConfig({
        useMultiStepReasoning: false,
        storeQueryHistory: false
      });
      
      // Check that configuration was updated
      expect(processor.options.useMultiStepReasoning).toBe(false);
      expect(processor.options.storeQueryHistory).toBe(false);
      expect(processor.options.useWorkingMemory).toBe(true); // Unchanged
    });
  });

  describe('handler registration', () => {
    it('should register handlers correctly', () => {
      const newHandler = new MockQueryHandler();
      
      // Register handler for new intent
      processor.registerQueryHandler(newHandler, ['new_intent']);
      
      // Check that handler was registered
      expect(processor.queryHandlerRegistry['new_intent']).toBeDefined();
      expect(processor.queryHandlerRegistry['new_intent'].length).toBe(1);
      expect(processor.queryHandlerRegistry['new_intent'][0]).toBe(newHandler);
    });

    it('should retrieve registered handlers correctly', () => {
      const handlers = processor.getRegisteredHandlers();
      
      expect(handlers).toBeDefined();
      expect(handlers['capacity_query']).toBeDefined();
      expect(handlers['maintenance_query']).toBeDefined();
      expect(handlers['*']).toBeDefined();
    });

    it('should retrieve available intents and entity types', () => {
      const intents = processor.getAvailableIntents();
      const entityTypes = processor.getAvailableEntityTypes();
      
      expect(intents).toBeDefined();
      expect(intents.length).toBeGreaterThan(0);
      expect(entityTypes).toBeDefined();
      expect(entityTypes.length).toBeGreaterThan(0);
    });
  });
});