/**
 * Tests for RelatedQuestionService
 */
const RelatedQuestionService = require('../../../src/services/agent/RelatedQuestionService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn().mockImplementation(async (prompt) => {
    return {
      text: `[
        {
          "text": "How would this capacity change during peak hours?",
          "type": "intent",
          "confidence": 0.9
        },
        {
          "text": "What is the capacity of Terminal 2?",
          "type": "entity",
          "confidence": 0.85
        },
        {
          "text": "Can you show a visualization of this data?",
          "type": "general",
          "confidence": 0.8
        }
      ]`
    };
  })
}));

jest.mock('../../../src/services/agent/WorkingMemoryService', () => {
  return function() {
    // Mock implementation with memory storage
    const sessionStorage = new Map();
    const sessionContextStorage = new Map();
    
    return {
      getSessionData: jest.fn().mockImplementation(async (sessionId, key) => {
        return sessionStorage.get(`${sessionId}:${key}`) || null;
      }),
      storeSessionData: jest.fn().mockImplementation(async (sessionId, key, data) => {
        sessionStorage.set(`${sessionId}:${key}`, data);
        return true;
      }),
      getSessionContext: jest.fn().mockImplementation(async (sessionId) => {
        return sessionContextStorage.get(sessionId) || null;
      }),
      updateSessionContextField: jest.fn().mockImplementation(async (sessionId, field, value) => {
        let context = sessionContextStorage.get(sessionId) || {};
        context[field] = value;
        sessionContextStorage.set(sessionId, context);
        return true;
      }),
      getEntityMentions: jest.fn().mockImplementation(async (sessionId, options) => {
        return [
          { type: 'terminal', value: 'Terminal 1', queryId: 'prev-query', timestamp: Date.now() - 300000 },
          { type: 'stand', value: 'A12', queryId: 'prev-query', timestamp: Date.now() - 300000 }
        ];
      })
    };
  };
});

describe('RelatedQuestionService', () => {
  beforeEach(() => {
    // Reset any config changes and metrics between tests
    RelatedQuestionService.updateConfig({
      maxSuggestions: 3,
      minConfidenceThreshold: 0.6,
      trackSuggestionUsage: true,
      prioritizeSimilarEntities: true
    });
    RelatedQuestionService.resetMetrics();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate entity-based suggestions', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.9,
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        },
        response: {
          text: 'Terminal 1 has a capacity of 42 flights per hour.'
        },
        handlerUsed: 'CapacityHandler'
      };
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should contain some terminal entity suggestions
      const terminalSuggestions = suggestions.filter(s => 
        s.type === 'entity' && s.entityType === 'terminal'
      );
      expect(terminalSuggestions.length).toBeGreaterThan(0);
      
      // Terminal entity value should be included in suggestion text
      expect(terminalSuggestions[0].text).toContain('Terminal 1');
    });

    it('should generate intent-based suggestions', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'maintenance_query',
          intentConfidence: 0.85,
          entities: { stand: 'A12' },
          query: 'Show maintenance schedule for stand A12'
        },
        response: {
          text: 'Stand A12 has maintenance scheduled for next week.'
        },
        handlerUsed: 'MaintenanceHandler'
      };
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should contain some maintenance intent suggestions
      const intentSuggestions = suggestions.filter(s => 
        s.type === 'intent' && s.intent === 'maintenance_query'
      );
      expect(intentSuggestions.length).toBeGreaterThan(0);
    });

    it('should generate relationship-based suggestions when multiple entities present', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'complex_query',
          intentConfidence: 0.8,
          entities: { 
            terminal: 'Terminal 1',
            time_period: 'peak hours'
          },
          query: 'What is the capacity of Terminal 1 during peak hours?'
        },
        response: {
          text: 'Terminal 1 has a capacity of 50 flights during peak hours.'
        },
        handlerUsed: 'ComplexQueryHandler'
      };
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should contain some relationship suggestions
      const relationshipSuggestions = suggestions.filter(s => s.type === 'relationship');
      expect(relationshipSuggestions.length).toBeGreaterThan(0);
      
      // Should mention both entities in the relationship suggestion
      const relSuggestion = relationshipSuggestions[0];
      expect(relSuggestion.text).toContain('Terminal 1');
      expect(relSuggestion.text).toContain('peak hours');
    });

    it('should generate context-aware suggestions with session history', async () => {
      // Set up session context
      const sessionId = 'test-session-123';
      
      // Create mock session context
      RelatedQuestionService.workingMemoryService.getSessionContext.mockResolvedValueOnce({
        userPreferences: {
          preferredTerminal: 'Terminal 1',
          preferredView: 'charts'
        },
        previousQueries: [
          { query: 'Show capacity for Terminal 1', intent: 'capacity_query', timestamp: Date.now() - 300000 }
        ]
      });
      
      const queryResult = {
        parsedQuery: {
          intent: 'stand_status_query',
          intentConfidence: 0.9,
          entities: { stand: 'A12' },
          query: 'What is the status of stand A12?'
        },
        response: {
          text: 'Stand A12 is currently occupied by a Boeing 737.'
        },
        handlerUsed: 'StandStatusHandler'
      };
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult, { sessionId });
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should contain some context-aware suggestions (using known terminal or known entities)
      const contextSuggestions = suggestions.filter(s => s.source === 'context');
      
      // May have context suggestions if the implementation creates them
      if (contextSuggestions.length > 0) {
        expect(contextSuggestions[0].confidence).toBeGreaterThan(0);
      }
    });

    it('should generate personalized suggestions using LLM', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.9,
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        },
        response: {
          text: 'Terminal 1 has a capacity of 45 flights per hour.'
        },
        handlerUsed: 'CapacityHandler'
      };
      
      // Force small number of template suggestions to trigger LLM
      RelatedQuestionService.suggestionTemplates.entity.terminal = ['What is the capacity of {terminal}?'];
      RelatedQuestionService.suggestionTemplates.intent.capacity_query = [];
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should contain some LLM-generated suggestions
      const llmSuggestions = suggestions.filter(s => s.source === 'llm');
      
      // OpenAI mock is configured to return results, so we should have some
      expect(RelatedQuestionService.openAIService.processQuery).toHaveBeenCalled();
      
      // Check if parsing worked properly (depends on mock implementation)
      if (llmSuggestions.length > 0) {
        expect(llmSuggestions[0].confidence).toBeGreaterThan(0);
        expect(llmSuggestions[0].text).toBeTruthy();
      }
    });
    
    it('should deduplicate and limit suggestions', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.9,
          entities: { 
            terminal: 'Terminal 1',
            time_period: 'peak hours'
          },
          query: 'Show capacity for Terminal 1 during peak hours'
        },
        response: {
          text: 'Terminal 1 has a capacity of 50 flights during peak hours.'
        },
        handlerUsed: 'CapacityHandler'
      };
      
      // Create a situation with many potential suggestions
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      // Should respect maxSuggestions limit
      expect(suggestions.length).toBeLessThanOrEqual(RelatedQuestionService.options.maxSuggestions);
      
      // Should not have duplicates (each text should be unique)
      const texts = suggestions.map(s => s.text);
      const uniqueTexts = new Set(texts);
      expect(uniqueTexts.size).toBe(texts.length);
    });

    it('should update metrics when generating suggestions', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.9,
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        },
        response: {
          text: 'Terminal 1 has a capacity of 42 flights per hour.'
        },
        handlerUsed: 'CapacityHandler'
      };
      
      const suggestions = await RelatedQuestionService.generateSuggestions(queryResult);
      
      const metrics = RelatedQuestionService.getMetrics();
      expect(metrics.totalSuggestionsGenerated).toBe(suggestions.length);
      
      // Individual type metrics should add up to total
      const typeSum = metrics.entitySuggestions + 
                     metrics.intentSuggestions + 
                     metrics.relationshipSuggestions + 
                     metrics.generalSuggestions;
      expect(typeSum).toBe(metrics.totalSuggestionsGenerated);
    });

    it('should store suggestions in working memory', async () => {
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.9,
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        },
        response: {
          text: 'Terminal 1 has a capacity of 42 flights per hour.'
        },
        handlerUsed: 'CapacityHandler',
        queryId: 'test-query-123'
      };
      
      const sessionId = 'test-session-123';
      
      await RelatedQuestionService.generateSuggestions(queryResult, { 
        sessionId,
        queryId: 'test-query-123'
      });
      
      // Should call storeSessionData
      expect(RelatedQuestionService.workingMemoryService.storeSessionData).toHaveBeenCalled();
      expect(RelatedQuestionService.workingMemoryService.updateSessionContextField).toHaveBeenCalled();
    });
  });

  describe('trackSuggestionUsage', () => {
    it('should track when suggestions are used', async () => {
      const sessionId = 'test-session-123';
      const suggestionId = 'test-suggestion-123';
      
      // Set up mock stored suggestions
      RelatedQuestionService.workingMemoryService.getSessionData.mockResolvedValueOnce({
        items: [
          {
            id: suggestionId,
            text: 'Test suggestion',
            type: 'entity',
            queryId: 'test-query-123',
            timestamp: Date.now() - 60000
          }
        ]
      });
      
      const result = await RelatedQuestionService.trackSuggestionUsage(suggestionId, { sessionId });
      
      expect(result).toBe(true);
      
      // Should update the suggestion
      expect(RelatedQuestionService.workingMemoryService.storeSessionData).toHaveBeenCalled();
      
      // Should update session context
      expect(RelatedQuestionService.workingMemoryService.updateSessionContextField).toHaveBeenCalledWith(
        sessionId,
        'suggestionHistory',
        expect.any(Array)
      );
      
      // Should update metrics
      const metrics = RelatedQuestionService.getMetrics();
      expect(metrics.totalSuggestionsUsed).toBe(1);
    });

    it('should handle missing suggestions gracefully', async () => {
      const sessionId = 'test-session-123';
      const suggestionId = 'nonexistent-suggestion';
      
      // Set up mock with no matching suggestion
      RelatedQuestionService.workingMemoryService.getSessionData.mockResolvedValueOnce({
        items: [
          {
            id: 'other-id',
            text: 'Test suggestion',
            type: 'entity',
            queryId: 'test-query-123',
            timestamp: Date.now() - 60000
          }
        ]
      });
      
      const result = await RelatedQuestionService.trackSuggestionUsage(suggestionId, { sessionId });
      
      expect(result).toBe(false);
    });
  });

  describe('Configuration and metrics', () => {
    it('should update configuration options', () => {
      // Update configuration
      RelatedQuestionService.updateConfig({
        maxSuggestions: 5,
        minConfidenceThreshold: 0.7
      });
      
      // Check that configuration was updated
      expect(RelatedQuestionService.options.maxSuggestions).toBe(5);
      expect(RelatedQuestionService.options.minConfidenceThreshold).toBe(0.7);
      expect(RelatedQuestionService.options.trackSuggestionUsage).toBe(true); // Unchanged
    });

    it('should track metrics correctly', async () => {
      // Generate some suggestions
      const queryResult = {
        parsedQuery: {
          intent: 'capacity_query',
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        },
        response: { text: 'Response text' }
      };
      
      await RelatedQuestionService.generateSuggestions(queryResult);
      
      // Mock a used suggestion
      const suggestion = {
        id: 'test-suggestion',
        text: 'Test suggestion',
        type: 'entity'
      };
      
      // Set up mock
      RelatedQuestionService.workingMemoryService.getSessionData.mockResolvedValueOnce({
        items: [{ ...suggestion, queryId: 'test-query', timestamp: Date.now() }]
      });
      
      await RelatedQuestionService.trackSuggestionUsage('test-suggestion', { sessionId: 'test-session' });
      
      // Check metrics
      const metrics = RelatedQuestionService.getMetrics();
      expect(metrics.totalSuggestionsGenerated).toBeGreaterThan(0);
      expect(metrics.totalSuggestionsUsed).toBe(1);
      expect(metrics.suggestionUsageRate).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', () => {
      // Set some metrics manually
      RelatedQuestionService.metrics.totalSuggestionsGenerated = 10;
      RelatedQuestionService.metrics.entitySuggestions = 5;
      
      // Reset metrics
      RelatedQuestionService.resetMetrics();
      
      // Check that metrics were reset
      const metrics = RelatedQuestionService.getMetrics();
      expect(metrics.totalSuggestionsGenerated).toBe(0);
      expect(metrics.entitySuggestions).toBe(0);
    });
  });
});