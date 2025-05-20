/**
 * Tests for QueryDisambiguationService
 */
const QueryDisambiguationService = require('../../../src/services/agent/QueryDisambiguationService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn().mockImplementation(async (prompt) => {
    // Generate different responses based on the prompt
    if (prompt.includes('intent')) {
      return {
        text: `[
          {
            "description": "You want to view available capacity data",
            "intent": "capacity_query",
            "followUpQuestion": "Would you like to see the capacity data for a specific terminal?"
          },
          {
            "description": "You want to visualize capacity on a chart",
            "intent": "capacity_visualization",
            "followUpQuestion": "Would you like me to create a visualization of capacity data?"
          },
          {
            "description": "You want to analyze capacity trends over time",
            "intent": "capacity_trend_analysis",
            "followUpQuestion": "Are you interested in seeing how capacity changes over time?"
          }
        ]`
      };
    } else if (prompt.includes('entity')) {
      return {
        text: `[
          {
            "entityType": "terminal",
            "options": [
              { "value": "Terminal 1", "description": "The main international terminal" },
              { "value": "Terminal 2", "description": "The domestic terminal" },
              { "value": "All terminals", "description": "All terminals in the airport" }
            ]
          }
        ]`
      };
    } else if (prompt.includes('relationship')) {
      return {
        text: `[
          {
            "relationshipType": "impact",
            "description": "How maintenance affects capacity",
            "clarificationQuestion": "Are you asking about the impact of maintenance on capacity?",
            "impliedIntent": "impact_analysis"
          },
          {
            "relationshipType": "comparison",
            "description": "Comparing capacity between terminals",
            "clarificationQuestion": "Do you want to compare capacity between different terminals?",
            "impliedIntent": "comparison"
          },
          {
            "relationshipType": "forecast",
            "description": "Predicting future capacity based on current data",
            "clarificationQuestion": "Are you interested in capacity forecasts?",
            "impliedIntent": "forecast"
          }
        ]`
      };
    } else {
      return {
        text: "[]"
      };
    }
  })
}));

jest.mock('../../../src/services/agent/WorkingMemoryService', () => {
  return function() {
    // Mock implementation with memory storage
    const sessionStorage = new Map();
    const sessionContextStorage = new Map();
    
    return {
      storeSessionData: jest.fn().mockImplementation(async (sessionId, key, data) => {
        sessionStorage.set(`${sessionId}:${key}`, data);
        return true;
      }),
      getSessionData: jest.fn().mockImplementation(async (sessionId, key) => {
        return sessionStorage.get(`${sessionId}:${key}`) || null;
      }),
      getSessionContext: jest.fn().mockImplementation(async (sessionId) => {
        return sessionContextStorage.get(sessionId) || null;
      }),
      updateSessionContextField: jest.fn().mockImplementation(async (sessionId, field, value) => {
        let context = sessionContextStorage.get(sessionId) || {};
        context[field] = value;
        sessionContextStorage.set(sessionId, context);
        return true;
      })
    };
  };
});

describe('QueryDisambiguationService', () => {
  beforeEach(() => {
    // Reset any config changes and metrics between tests
    QueryDisambiguationService.updateConfig({
      intentConfidenceThreshold: 0.7,
      entityConfidenceThreshold: 0.6,
      maxDisambiguationOptions: 3,
      storeDisambiguationHistory: true
    });
    QueryDisambiguationService.resetMetrics();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('checkAmbiguity', () => {
    it('should identify low confidence intent ambiguity', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6, // Below threshold
        entities: { terminal: 'Terminal 1' },
        query: 'Show capacity for Terminal 1'
      };
      
      const result = await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.ambiguities[0].type).toBe('intent');
    });

    it('should identify missing required entity ambiguity', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.8,
        entities: {}, // Missing terminal entity
        query: 'Show capacity for the terminal'
      };
      
      const result = await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.ambiguities[0].type).toBe('entity');
    });

    it('should identify relationship ambiguity', async () => {
      const parsedQuery = {
        intent: 'complex_query',
        intentConfidence: 0.8,
        entities: { terminal: 'Terminal 1', stand: 'A1' },
        query: 'What is the relationship between Terminal 1 and Stand A1?'
      };
      
      const result = await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.ambiguities[0].type).toBe('relationship');
    });

    it('should generate options for each ambiguity', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6, // Ambiguous intent
        entities: {}, // Missing terminal
        query: 'Show capacity'
      };
      
      const result = await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguities.length).toBeGreaterThan(0);
      
      // Check intent options
      const intentAmbiguity = result.ambiguities.find(a => a.type === 'intent');
      expect(intentAmbiguity).toBeDefined();
      expect(intentAmbiguity.options.length).toBeGreaterThan(0);
      
      // Check entity options - may not be present if intent is primary ambiguity
      if (result.ambiguities.find(a => a.type === 'entity')) {
        const entityAmbiguity = result.ambiguities.find(a => a.type === 'entity');
        expect(entityAmbiguity.options).toBeDefined();
      }
    });

    it('should not flag unambiguous queries', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.9, // High confidence
        entities: { terminal: 'Terminal 1' }, // Required entity present
        query: 'Show capacity for Terminal 1'
      };
      
      const result = await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      expect(result.isAmbiguous).toBe(false);
      expect(result.ambiguities).toBeUndefined();
    });

    it('should update metrics when ambiguity is detected', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6, // Below threshold
        entities: {},
        query: 'Show capacity'
      };
      
      await QueryDisambiguationService.checkAmbiguity(parsedQuery);
      
      const metrics = QueryDisambiguationService.getMetrics();
      expect(metrics.totalAmbiguousQueries).toBe(1);
      expect(metrics.intentAmbiguities).toBe(1);
    });

    it('should store disambiguation request in working memory', async () => {
      const parsedQuery = {
        intent: 'capacity_query',
        intentConfidence: 0.6,
        entities: {},
        query: 'Show capacity',
        queryId: 'test-query-123'
      };
      
      const context = {
        sessionId: 'test-session-123',
        queryId: 'test-query-123'
      };
      
      await QueryDisambiguationService.checkAmbiguity(parsedQuery, context);
      
      // Check that working memory service was called
      expect(QueryDisambiguationService.workingMemoryService.storeSessionData).toHaveBeenCalled();
      expect(QueryDisambiguationService.workingMemoryService.updateSessionContextField).toHaveBeenCalledWith(
        'test-session-123',
        'disambiguationHistory',
        expect.any(Array)
      );
    });
  });

  describe('processDisambiguation', () => {
    it('should process intent disambiguation', async () => {
      // Create disambiguation data
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'intent',
            message: 'Your query could be interpreted in multiple ways',
            options: [
              {
                description: 'View available capacity data',
                intent: 'capacity_query',
                followUpQuestion: 'Would you like to see capacity data?'
              },
              {
                description: 'Visualize capacity on a chart',
                intent: 'capacity_visualization',
                followUpQuestion: 'Would you like to see a capacity chart?'
              }
            ]
          }
        ],
        originalQuery: {
          intent: 'unknown',
          intentConfidence: 0.5,
          entities: { terminal: 'Terminal 1' },
          query: 'Show capacity for Terminal 1'
        }
      };
      
      // User response selects the first option
      const userResponse = {
        intent: {
          intent: 'capacity_query'
        }
      };
      
      const result = await QueryDisambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        { sessionId: 'test-session' }
      );
      
      expect(result.success).toBe(true);
      expect(result.clarifiedQuery.intent).toBe('capacity_query');
      expect(result.clarifiedQuery.intentConfidence).toBe(1.0); // User confirmed
      expect(result.allAmbiguitiesResolved).toBe(true);
    });

    it('should process entity disambiguation', async () => {
      // Create disambiguation data
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'entity',
            entityType: 'terminal',
            message: 'Which terminal do you want information about?',
            options: [
              {
                entityType: 'terminal',
                entityValue: 'Terminal 1',
                description: 'Terminal 1'
              },
              {
                entityType: 'terminal',
                entityValue: 'Terminal 2',
                description: 'Terminal 2'
              }
            ]
          }
        ],
        originalQuery: {
          intent: 'capacity_query',
          intentConfidence: 0.85,
          entities: {},
          query: 'Show capacity for the terminal'
        }
      };
      
      // User response selects the first option
      const userResponse = {
        entity: {
          entityType: 'terminal',
          entityValue: 'Terminal 1'
        }
      };
      
      const result = await QueryDisambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        { sessionId: 'test-session' }
      );
      
      expect(result.success).toBe(true);
      expect(result.clarifiedQuery.entities.terminal).toBe('Terminal 1');
      expect(result.allAmbiguitiesResolved).toBe(true);
    });

    it('should process relationship disambiguation', async () => {
      // Create disambiguation data
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'relationship',
            message: 'Please clarify the specific relationship you\'re interested in',
            options: [
              {
                relationshipType: 'impact',
                description: 'How maintenance affects capacity',
                clarificationQuestion: 'Are you asking about impact?',
                impliedIntent: 'impact_analysis'
              },
              {
                relationshipType: 'comparison',
                description: 'Comparing capacity between terminals',
                clarificationQuestion: 'Do you want a comparison?',
                impliedIntent: 'comparison'
              }
            ]
          }
        ],
        originalQuery: {
          intent: 'complex_query',
          intentConfidence: 0.8,
          entities: { terminal: 'Terminal 1', stand: 'A1' },
          query: 'What is the relationship between Terminal 1 and Stand A1?'
        }
      };
      
      // User response selects the first option
      const userResponse = {
        relationship: {
          relationship: 'impact',
          impliedIntent: 'impact_analysis'
        }
      };
      
      const result = await QueryDisambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        { sessionId: 'test-session' }
      );
      
      expect(result.success).toBe(true);
      expect(result.clarifiedQuery.relationship).toBe('impact');
      expect(result.clarifiedQuery.intent).toBe('impact_analysis');
      expect(result.allAmbiguitiesResolved).toBe(true);
    });

    it('should handle partial disambiguation', async () => {
      // Create disambiguation data with multiple ambiguities
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'intent',
            message: 'Your query could be interpreted in multiple ways',
            options: [
              { description: 'Option 1', intent: 'intent1' },
              { description: 'Option 2', intent: 'intent2' }
            ]
          },
          {
            type: 'entity',
            entityType: 'terminal',
            message: 'Which terminal?',
            options: [
              { entityType: 'terminal', entityValue: 'T1', description: 'Terminal 1' },
              { entityType: 'terminal', entityValue: 'T2', description: 'Terminal 2' }
            ]
          }
        ],
        originalQuery: {
          intent: 'unknown',
          entities: {},
          query: 'Show terminal data'
        }
      };
      
      // User only responds to one ambiguity
      const userResponse = {
        intent: {
          intent: 'intent1'
        }
        // No entity response
      };
      
      const result = await QueryDisambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        { sessionId: 'test-session' }
      );
      
      expect(result.success).toBe(true);
      expect(result.clarifiedQuery.intent).toBe('intent1');
      expect(result.allAmbiguitiesResolved).toBe(false);
      expect(result.needsFurtherDisambiguation).toBe(true);
      expect(result.remainingAmbiguities.length).toBe(1);
      expect(result.remainingAmbiguities[0].type).toBe('entity');
    });

    it('should store disambiguation result in working memory', async () => {
      // Create basic disambiguation data
      const disambiguationData = {
        isAmbiguous: true,
        ambiguities: [
          {
            type: 'intent',
            message: 'Ambiguous query',
            options: [
              { description: 'Option 1', intent: 'intent1' }
            ]
          }
        ],
        originalQuery: {
          intent: 'unknown',
          entities: {},
          query: 'Show data',
          queryId: 'test-query-123'
        }
      };
      
      // User response
      const userResponse = {
        intent: {
          intent: 'intent1'
        }
      };
      
      const context = {
        sessionId: 'test-session-123',
        queryId: 'test-query-123'
      };
      
      await QueryDisambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        context
      );
      
      // Check that working memory service was called
      expect(QueryDisambiguationService.workingMemoryService.storeSessionData).toHaveBeenCalled();
      expect(QueryDisambiguationService.workingMemoryService.updateSessionContextField).toHaveBeenCalled();
    });
  });

  describe('generateDisambiguationOptions', () => {
    it('should generate intent disambiguation options using LLM', async () => {
      const parsedQuery = {
        query: 'Show capacity for Terminal 1',
        intent: 'capacity_query',
        intentConfidence: 0.6
      };
      
      const options = await QueryDisambiguationService.generateDisambiguationOptions(
        parsedQuery,
        'intent',
        {}
      );
      
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].intent).toBeDefined();
      expect(options[0].description).toBeDefined();
      expect(options[0].followUpQuestion).toBeDefined();
    });

    it('should generate entity disambiguation options using LLM', async () => {
      const parsedQuery = {
        query: 'Show capacity for the terminal',
        intent: 'capacity_query',
        intentConfidence: 0.8,
        entityType: 'terminal' // This needs to be passed for entity disambiguation
      };
      
      const options = await QueryDisambiguationService.generateDisambiguationOptions(
        parsedQuery,
        'entity',
        {}
      );
      
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].entityType).toBeDefined();
      expect(options[0].options).toBeDefined();
    });

    it('should generate relationship disambiguation options using LLM', async () => {
      const parsedQuery = {
        query: 'What is the relationship between maintenance and capacity?',
        intent: 'complex_query',
        intentConfidence: 0.8,
        entities: { terminal: 'Terminal 1' }
      };
      
      const options = await QueryDisambiguationService.generateDisambiguationOptions(
        parsedQuery,
        'relationship',
        {}
      );
      
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].relationshipType).toBeDefined();
      expect(options[0].description).toBeDefined();
      expect(options[0].clarificationQuestion).toBeDefined();
      expect(options[0].impliedIntent).toBeDefined();
    });

    it('should fallback to default options if LLM fails', async () => {
      // Mock the OpenAI service to fail
      require('../../../src/services/agent/OpenAIService').processQuery.mockRejectedValueOnce(
        new Error('LLM error')
      );
      
      const parsedQuery = {
        query: 'Show capacity',
        intent: 'capacity_query',
        intentConfidence: 0.6
      };
      
      const options = await QueryDisambiguationService.generateDisambiguationOptions(
        parsedQuery,
        'intent',
        {}
      );
      
      // Should still return default options
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].intent).toBeDefined();
    });
  });

  describe('Configuration and metrics', () => {
    it('should update configuration options', () => {
      // Update configuration
      QueryDisambiguationService.updateConfig({
        intentConfidenceThreshold: 0.8,
        maxDisambiguationOptions: 2
      });
      
      // Check that configuration was updated
      expect(QueryDisambiguationService.options.intentConfidenceThreshold).toBe(0.8);
      expect(QueryDisambiguationService.options.maxDisambiguationOptions).toBe(2);
      expect(QueryDisambiguationService.options.entityConfidenceThreshold).toBe(0.6); // Unchanged
    });

    it('should track metrics correctly', async () => {
      // Process some disambiguation requests
      const parsedQuery1 = {
        intent: 'capacity_query',
        intentConfidence: 0.6,
        entities: {},
        query: 'Show capacity'
      };
      
      const parsedQuery2 = {
        intent: 'maintenance_query',
        intentConfidence: 0.8,
        entities: { terminal: 'Terminal 1' },
        query: 'Show maintenance for Terminal 1 stand'
      };
      
      await QueryDisambiguationService.checkAmbiguity(parsedQuery1);
      await QueryDisambiguationService.checkAmbiguity(parsedQuery2);
      
      // Check metrics
      const metrics = QueryDisambiguationService.getMetrics();
      expect(metrics.totalAmbiguousQueries).toBe(2);
      expect(metrics.intentAmbiguities + metrics.entityAmbiguities).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', () => {
      // Set some metrics manually
      QueryDisambiguationService.metrics.totalAmbiguousQueries = 10;
      QueryDisambiguationService.metrics.intentAmbiguities = 5;
      
      // Reset metrics
      QueryDisambiguationService.resetMetrics();
      
      // Check that metrics were reset
      const metrics = QueryDisambiguationService.getMetrics();
      expect(metrics.totalAmbiguousQueries).toBe(0);
      expect(metrics.intentAmbiguities).toBe(0);
    });
  });
});