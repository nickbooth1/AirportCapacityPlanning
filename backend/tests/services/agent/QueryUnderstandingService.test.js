/**
 * Tests for QueryUnderstandingService
 * 
 * This tests the integration of all query understanding components:
 * - QueryVariationHandlerService
 * - QueryDisambiguationService
 * - RelatedQuestionService
 * - QueryFeedbackService
 */

const QueryUnderstandingService = require('../../../src/services/agent/QueryUnderstandingService');

// Mock dependencies
jest.mock('../../../src/services/agent/QueryVariationHandlerService', () => ({
  processQuery: jest.fn((query) => ({
    success: true,
    originalQuery: query,
    normalizedQuery: query.includes('whats') ? query.replace('whats', 'what is') : query,
    wasTransformed: query.includes('whats'),
    confidence: 0.9,
    processingSteps: [{
      step: 'colloquial_translation',
      before: query,
      after: query.includes('whats') ? query.replace('whats', 'what is') : query
    }]
  })),
  updateConfig: jest.fn(),
  getMetrics: jest.fn(() => ({ transformations: 10 }))
}));

jest.mock('../../../src/services/agent/QueryDisambiguationService', () => ({
  checkAmbiguity: jest.fn(async (parsedQuery) => {
    // Simulate ambiguity for low confidence or missing required entities
    const isAmbiguous = (
      (parsedQuery.intentConfidence && parsedQuery.intentConfidence < 0.7) ||
      (parsedQuery.intent === 'capacity_query' && (!parsedQuery.entities || !parsedQuery.entities.terminal))
    );
    
    return {
      isAmbiguous,
      ambiguities: isAmbiguous ? [{
        type: parsedQuery.intentConfidence < 0.7 ? 'intent' : 'entity',
        message: 'Ambiguous query',
        options: []
      }] : []
    };
  }),
  processDisambiguation: jest.fn(async (disambiguationData, userResponse) => {
    // Process disambiguation response
    const clarifiedQuery = { ...disambiguationData.originalQuery };
    
    if (userResponse.intent) {
      clarifiedQuery.intent = userResponse.intent.intent;
      clarifiedQuery.intentConfidence = 1.0;
    }
    
    if (userResponse.entity) {
      clarifiedQuery.entities = {
        ...clarifiedQuery.entities,
        [userResponse.entity.entityType]: userResponse.entity.entityValue
      };
    }
    
    return {
      success: true,
      clarifiedQuery,
      allAmbiguitiesResolved: true
    };
  }),
  updateConfig: jest.fn(),
  getMetrics: jest.fn(() => ({ 
    totalAmbiguousQueries: 5,
    successfulDisambiguations: 4 
  }))
}));

jest.mock('../../../src/services/agent/RelatedQuestionService', () => ({
  generateSuggestions: jest.fn(async (queryResult) => {
    // Generate some mock suggestions
    return [
      {
        id: 'suggestion-1',
        type: 'entity',
        text: 'What about Terminal 2?',
        confidence: 0.8,
        source: 'template'
      },
      {
        id: 'suggestion-2',
        type: 'intent',
        text: 'How does this affect capacity?',
        confidence: 0.7,
        source: 'template'
      }
    ];
  }),
  trackSuggestionUsage: jest.fn(async () => true),
  updateConfig: jest.fn(),
  getMetrics: jest.fn(() => ({
    totalSuggestionsGenerated: 20,
    totalSuggestionsUsed: 8
  }))
}));

jest.mock('../../../src/services/agent/QueryFeedbackService', () => ({
  submitFeedback: jest.fn(async (feedbackData) => {
    if (!feedbackData || !feedbackData.queryId || !feedbackData.rating) {
      return { success: false, error: 'Missing required fields' };
    }
    return {
      success: true,
      feedbackId: `feedback-${Date.now()}`,
      message: 'Feedback submitted successfully'
    };
  }),
  applyFeedbackLearning: jest.fn(async () => ({
    success: true,
    results: {
      variations: { applied: 2 },
      intents: { applied: 1 },
      entities: { applied: 1 }
    }
  })),
  updateConfig: jest.fn(),
  getMetrics: jest.fn(() => ({
    totalFeedback: 15,
    positiveFeedback: 10,
    negativeFeedback: 5
  }))
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('QueryUnderstandingService', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('processQuery', () => {
    it('should process query through all pipeline components', async () => {
      const query = 'Whats the capacity of Terminal 1?';
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.8,
        entities: { terminal: 'Terminal 1' }
      };
      const context = { sessionId: 'test-session' };
      
      const result = await QueryUnderstandingService.processQuery(query, parsedQuery, context);
      
      // Should have normalized the query
      expect(result.originalQuery).toBe(query);
      expect(result.normalizedQuery).toBe('What is the capacity of Terminal 1?');
      expect(result.wasProcessed).toBe(true);
      
      // Should have checked for ambiguity
      expect(QueryUnderstandingService.disambiguationService.checkAmbiguity).toHaveBeenCalledWith(
        parsedQuery,
        context
      );
      
      // Should not be ambiguous
      expect(result.ambiguous).toBe(false);
      
      // Should have generated suggestions
      expect(QueryUnderstandingService.relatedQuestionService.generateSuggestions).toHaveBeenCalled();
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Should have recorded processing steps
      expect(result.processingSteps.length).toBeGreaterThan(0);
    });
    
    it('should detect ambiguous queries', async () => {
      const query = 'Show capacity';
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6, // Low confidence
        entities: {}  // Missing required entity
      };
      const context = { sessionId: 'test-session' };
      
      const result = await QueryUnderstandingService.processQuery(query, parsedQuery, context);
      
      // Should detect ambiguity
      expect(result.ambiguous).toBe(true);
      expect(result.requiresDisambiguation).toBe(true);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      
      // Should not generate suggestions for ambiguous queries
      expect(result.suggestions).toEqual([]);
    });
    
    it('should respect disabled features', async () => {
      // Disable all features
      QueryUnderstandingService.updateConfig({
        enableVariationHandling: false,
        enableDisambiguation: false,
        enableRelatedQuestions: false,
        enableFeedbackProcessing: false
      });
      
      const query = 'Whats the capacity?';
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6
      };
      
      const result = await QueryUnderstandingService.processQuery(query, parsedQuery);
      
      // Should not process query variations
      expect(result.normalizedQuery).toBe(query);
      expect(result.wasProcessed).toBe(false);
      
      // Should not check for ambiguity
      expect(QueryUnderstandingService.disambiguationService.checkAmbiguity).not.toHaveBeenCalled();
      
      // Should not generate suggestions
      expect(QueryUnderstandingService.relatedQuestionService.generateSuggestions).not.toHaveBeenCalled();
      expect(result.suggestions).toEqual([]);
      
      // Re-enable features for other tests
      QueryUnderstandingService.updateConfig({
        enableVariationHandling: true,
        enableDisambiguation: true,
        enableRelatedQuestions: true,
        enableFeedbackProcessing: true
      });
    });
    
    it('should handle errors gracefully', async () => {
      // Make variation handler throw an error
      QueryUnderstandingService.variationHandler.processQuery.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      const query = 'Test query';
      const result = await QueryUnderstandingService.processQuery(query);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
      expect(result.originalQuery).toBe(query);
    });
  });
  
  describe('processDisambiguation', () => {
    it('should process disambiguation responses', async () => {
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'intent',
            message: 'Ambiguous intent',
            options: [
              { intent: 'capacity_query', description: 'View capacity' },
              { intent: 'maintenance_query', description: 'View maintenance' }
            ]
          }
        ],
        originalQuery: {
          intent: 'unknown',
          intentConfidence: 0.5,
          entities: { terminal: 'Terminal 1' }
        }
      };
      
      const userResponse = {
        intent: {
          intent: 'capacity_query'
        }
      };
      
      const context = { sessionId: 'test-session' };
      
      const result = await QueryUnderstandingService.processDisambiguation(
        disambiguationData,
        userResponse,
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.clarifiedQuery.intent).toBe('capacity_query');
      expect(result.clarifiedQuery.intentConfidence).toBe(1.0);
      expect(result.allAmbiguitiesResolved).toBe(true);
    });
    
    it('should not process disambiguation when disabled', async () => {
      // Disable disambiguation
      QueryUnderstandingService.updateConfig({
        enableDisambiguation: false
      });
      
      const result = await QueryUnderstandingService.processDisambiguation({}, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Disambiguation is not enabled');
      
      // Re-enable for other tests
      QueryUnderstandingService.updateConfig({
        enableDisambiguation: true
      });
    });
  });
  
  describe('trackSuggestionUsage', () => {
    it('should track when suggestions are used', async () => {
      const suggestionId = 'suggestion-1';
      const context = { sessionId: 'test-session' };
      
      const result = await QueryUnderstandingService.trackSuggestionUsage(suggestionId, context);
      
      expect(result).toBe(true);
      expect(QueryUnderstandingService.relatedQuestionService.trackSuggestionUsage)
        .toHaveBeenCalledWith(suggestionId, context);
    });
    
    it('should not track suggestions when disabled', async () => {
      // Disable related questions
      QueryUnderstandingService.updateConfig({
        enableRelatedQuestions: false
      });
      
      const result = await QueryUnderstandingService.trackSuggestionUsage('suggestion-1', {});
      
      expect(result).toBe(false);
      
      // Re-enable for other tests
      QueryUnderstandingService.updateConfig({
        enableRelatedQuestions: true
      });
    });
  });
  
  describe('submitFeedback', () => {
    it('should submit feedback about query understanding', async () => {
      const feedbackData = {
        queryId: 'test-query',
        query: 'What is the capacity?',
        rating: 4,
        comments: 'Great answer'
      };
      
      const context = { sessionId: 'test-session' };
      
      const result = await QueryUnderstandingService.submitFeedback(feedbackData, context);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('feedbackId');
      expect(QueryUnderstandingService.feedbackService.submitFeedback)
        .toHaveBeenCalledWith(feedbackData, context);
    });
    
    it('should not submit feedback when disabled', async () => {
      // Disable feedback
      QueryUnderstandingService.updateConfig({
        enableFeedbackProcessing: false
      });
      
      const result = await QueryUnderstandingService.submitFeedback({ queryId: 'test', rating: 5 }, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Feedback processing is not enabled');
      
      // Re-enable for other tests
      QueryUnderstandingService.updateConfig({
        enableFeedbackProcessing: true
      });
    });
  });
  
  describe('applyFeedbackLearning', () => {
    it('should apply feedback learning', async () => {
      const sessionId = 'test-session';
      
      const result = await QueryUnderstandingService.applyFeedbackLearning(sessionId);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('variations');
      expect(result.results).toHaveProperty('intents');
      expect(result.results).toHaveProperty('entities');
      expect(QueryUnderstandingService.feedbackService.applyFeedbackLearning)
        .toHaveBeenCalledWith(sessionId);
    });
    
    it('should not apply feedback learning when disabled', async () => {
      // Disable feedback
      QueryUnderstandingService.updateConfig({
        enableFeedbackProcessing: false
      });
      
      const result = await QueryUnderstandingService.applyFeedbackLearning('test-session');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Feedback processing is not enabled');
      
      // Re-enable for other tests
      QueryUnderstandingService.updateConfig({
        enableFeedbackProcessing: true
      });
    });
  });
  
  describe('getMetrics', () => {
    it('should combine metrics from all services', () => {
      const metrics = QueryUnderstandingService.getMetrics();
      
      expect(metrics).toHaveProperty('variationHandler');
      expect(metrics).toHaveProperty('disambiguation');
      expect(metrics).toHaveProperty('relatedQuestions');
      expect(metrics).toHaveProperty('feedback');
      
      expect(metrics.variationHandler).toHaveProperty('transformations');
      expect(metrics.disambiguation).toHaveProperty('totalAmbiguousQueries');
      expect(metrics.relatedQuestions).toHaveProperty('totalSuggestionsGenerated');
      expect(metrics.feedback).toHaveProperty('totalFeedback');
    });
  });
  
  describe('updateConfig', () => {
    it('should update all service configurations', () => {
      const configUpdate = {
        enableVariationHandling: true,
        enableDisambiguation: false,
        variationHandling: {
          enableColloquialTranslation: true
        },
        disambiguation: {
          intentConfidenceThreshold: 0.8
        },
        relatedQuestions: {
          maxSuggestions: 5
        },
        feedback: {
          learningEnabled: true
        }
      };
      
      QueryUnderstandingService.updateConfig(configUpdate);
      
      // Main options should be updated
      expect(QueryUnderstandingService.options.enableVariationHandling).toBe(true);
      expect(QueryUnderstandingService.options.enableDisambiguation).toBe(false);
      
      // Service-specific options should be forwarded
      expect(QueryUnderstandingService.variationHandler.updateConfig)
        .toHaveBeenCalledWith({ enableColloquialTranslation: true });
        
      expect(QueryUnderstandingService.disambiguationService.updateConfig)
        .toHaveBeenCalledWith({ intentConfidenceThreshold: 0.8 });
        
      expect(QueryUnderstandingService.relatedQuestionService.updateConfig)
        .toHaveBeenCalledWith({ maxSuggestions: 5 });
        
      expect(QueryUnderstandingService.feedbackService.updateConfig)
        .toHaveBeenCalledWith({ learningEnabled: true });
    });
    
    it('should handle null or undefined configuration', () => {
      // Should not throw an error
      expect(() => QueryUnderstandingService.updateConfig(null)).not.toThrow();
      expect(() => QueryUnderstandingService.updateConfig(undefined)).not.toThrow();
    });
  });
});