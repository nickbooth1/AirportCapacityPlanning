/**
 * Tests for QueryParserService
 */
const QueryParserService = require('../../../src/services/agent/QueryParserService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  extractEntities: jest.fn().mockImplementation(async (query, options) => {
    // Simple mock implementation based on query content
    const entities = {};
    
    if (query.includes('tomorrow')) {
      entities.time_period = { value: 'tomorrow', confidence: 0.9 };
    }
    
    if (query.includes('hourly')) {
      entities.capacity_metric = { value: 'hourly capacity', confidence: 0.85 };
    }
    
    if (query.includes('terminal') && !query.match(/terminal\s+\d+/i)) {
      entities.terminal = { value: 'Terminal 1', confidence: 0.7 };
    }
    
    if (query.includes('stand') && !query.match(/stand\s+[A-Z]\d+/i)) {
      entities.stand = { value: 'Stand A1', confidence: 0.75 };
    }
    
    return { 
      entities,
      confidence: 0.8
    };
  })
}));

jest.mock('../../../src/services/agent/IntentClassifierService', () => ({
  classifyIntent: jest.fn().mockImplementation(async (query) => {
    // Simple mock implementation based on keywords
    if (query.includes('capacity')) {
      return { intent: 'capacity_query', confidence: 0.9, subType: null };
    } else if (query.includes('maintenance')) {
      return { intent: 'maintenance_query', confidence: 0.88, subType: null };
    } else if (query.includes('terminal') || query.includes('stand')) {
      return { intent: 'infrastructure_query', confidence: 0.85, subType: null };
    } else if (query.includes('help')) {
      return { intent: 'help_request', confidence: 0.95, subType: null };
    } else {
      return { intent: 'unknown', confidence: 0.3, subType: null };
    }
  })
}));

jest.mock('../../../src/services/agent/QueryVariationHandlerService', () => ({
  processQuery: jest.fn().mockImplementation((query) => {
    // Simple mock implementation that just returns the query
    return {
      success: true,
      originalQuery: query,
      normalizedQuery: query.toLowerCase().trim(),
      processingSteps: [],
      wasTransformed: true,
      confidence: 0.95
    };
  })
}));

describe('QueryParserService', () => {
  beforeEach(() => {
    // Reset any config changes between tests
    QueryParserService.updateConfig({
      entityConfidenceThreshold: 0.6,
      useContextualParsing: true,
      enableEntityNormalization: true
    });
    QueryParserService.resetMetrics();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('parseQuery', () => {
    it('should handle invalid inputs', async () => {
      const result1 = await QueryParserService.parseQuery('');
      const result2 = await QueryParserService.parseQuery(null);
      const result3 = await QueryParserService.parseQuery(123);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    it('should parse capacity queries with pattern-matched entities', async () => {
      const result = await QueryParserService.parseQuery('Show capacity for Terminal 1');
      
      expect(result.success).toBe(true);
      expect(result.intent).toBe('capacity_query');
      expect(result.entities.terminal).toBe('Terminal 1');
      expect(result.parameters.terminal).toBe('Terminal 1');
    });

    it('should parse maintenance queries with pattern-matched entities', async () => {
      const result = await QueryParserService.parseQuery('Show maintenance schedule for Stand A1');
      
      expect(result.success).toBe(true);
      expect(result.intent).toBe('maintenance_query');
      expect(result.entities.stand).toBe('Stand A1');
      expect(result.parameters.stand).toBe('Stand A1');
    });

    it('should extract time periods correctly', async () => {
      const result = await QueryParserService.parseQuery('Show capacity for tomorrow');
      
      expect(result.success).toBe(true);
      expect(result.entities.time_period).toBeTruthy();
      expect(result.parameters.time_period).toBeTruthy();
    });

    it('should normalize entities when enabled', async () => {
      const result = await QueryParserService.parseQuery('Show capacity for Gate A1');
      
      expect(result.success).toBe(true);
      expect(result.entities.stand).toContain('Stand');
      expect(result.entities.stand).not.toContain('Gate');
    });

    it('should handle queries with multiple entities', async () => {
      const result = await QueryParserService.parseQuery('Show hourly capacity for Terminal 2 tomorrow');
      
      expect(result.success).toBe(true);
      expect(result.entities.terminal).toBeTruthy();
      expect(result.entities.time_period).toBeTruthy();
      expect(result.entities.capacity_metric).toBeTruthy();
    });

    it('should handle contextual parsing when enabled', async () => {
      const context = {
        session: {
          lastTerminal: 'Terminal 3',
          lastStand: 'Stand B2'
        }
      };
      
      const result = await QueryParserService.parseQuery('Show hourly capacity', context);
      
      expect(result.success).toBe(true);
      expect(result.entities.terminal).toBe('Terminal 3');
      expect(result._contextual).toBeTruthy();
    });

    it('should track entities in metrics', async () => {
      await QueryParserService.parseQuery('Show capacity for Terminal 1');
      await QueryParserService.parseQuery('Show maintenance for Stand A1');
      
      const metrics = QueryParserService.getMetrics();
      
      expect(metrics.totalQueries).toBe(2);
      expect(metrics.totalEntities).toBeGreaterThan(0);
      expect(metrics.patternMatchedEntities).toBeGreaterThan(0);
    });
  });

  describe('Entity definition management', () => {
    it('should allow adding new entity definitions', async () => {
      // Add a new entity definition
      QueryParserService.addEntityDefinition(
        'airline_alliance',
        'airline_alliance',
        [/\b(Star Alliance|OneWorld|SkyTeam)\b/i],
        (value) => value.toUpperCase()
      );
      
      const result = await QueryParserService.parseQuery('Show capacity for Star Alliance airlines');
      
      expect(result.entities.airline_alliance).toBeTruthy();
      expect(result.entities.airline_alliance).toBe('STAR ALLIANCE');
    });

    it('should allow updating parameter schemas', async () => {
      // Update parameter schema for an intent
      QueryParserService.updateParameterSchema('capacity_query', [
        { name: 'terminal', type: 'terminal', required: true },
        { name: 'time_period', type: 'time_period', required: false }
      ]);
      
      const result = await QueryParserService.parseQuery('Show capacity for tomorrow');
      
      // The terminal is now required but missing
      expect(result.incomplete).toBe(true);
      expect(result.missingParameters).toContain('terminal');
    });
  });

  describe('Configuration options', () => {
    it('should respect disabled entity normalization', async () => {
      QueryParserService.updateConfig({ enableEntityNormalization: false });
      
      const result = await QueryParserService.parseQuery('Show capacity for Gate A1');
      
      expect(result.entities.stand).toContain('Gate');
      expect(result.entities.stand).not.toContain('Stand');
    });

    it('should respect disabled contextual parsing', async () => {
      QueryParserService.updateConfig({ useContextualParsing: false });
      
      const context = {
        session: {
          lastTerminal: 'Terminal 3'
        }
      };
      
      const result = await QueryParserService.parseQuery('Show hourly capacity', context);
      
      expect(result.entities.terminal).toBeUndefined();
    });

    it('should respect entity confidence threshold', async () => {
      // Set a very high confidence threshold
      QueryParserService.updateConfig({ entityConfidenceThreshold: 0.95 });
      
      const result = await QueryParserService.parseQuery('Show hourly capacity for tomorrow');
      
      // The time_period entity should be filtered out due to confidence below threshold
      expect(result.entities.time_period).toBeUndefined();
    });
  });
});