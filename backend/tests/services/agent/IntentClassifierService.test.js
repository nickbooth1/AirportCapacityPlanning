/**
 * Tests for IntentClassifierService
 */
const IntentClassifierService = require('../../../src/services/agent/IntentClassifierService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
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
  }),
  updateConfig: jest.fn()
}));

describe('IntentClassifierService', () => {
  beforeEach(() => {
    // Reset any config changes and metrics between tests
    IntentClassifierService.updateConfig({
      confidenceThreshold: 0.7,
      usePatternMatching: true,
      useLLMClassification: true,
      enableFallbackIntents: true
    });
    IntentClassifierService.resetMetrics();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('classifyIntent', () => {
    it('should handle invalid inputs', async () => {
      const result1 = await IntentClassifierService.classifyIntent('');
      const result2 = await IntentClassifierService.classifyIntent(null);
      const result3 = await IntentClassifierService.classifyIntent(123);

      expect(result1.intent).toBe('unknown');
      expect(result2.intent).toBe('unknown');
      expect(result3.intent).toBe('unknown');
      expect(result1.confidence).toBe(0);
    });

    it('should classify capacity-related queries using pattern matching', async () => {
      // Turn off LLM classification to test pattern matching
      IntentClassifierService.updateConfig({ useLLMClassification: false });
      
      const result = await IntentClassifierService.classifyIntent('Show capacity for Terminal 1');
      
      expect(result.intent).toBe('capacity_query');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.method).toBe('pattern');
    });
    
    it('should classify maintenance-related queries using pattern matching', async () => {
      // Turn off LLM classification to test pattern matching
      IntentClassifierService.updateConfig({ useLLMClassification: false });
      
      const result = await IntentClassifierService.classifyIntent('Show maintenance schedule for Stand A1');
      
      expect(result.intent).toBe('maintenance_query');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.method).toBe('pattern');
    });

    it('should use LLM classification when pattern matching fails', async () => {
      const result = await IntentClassifierService.classifyIntent('I need to understand the terminal utilization');
      
      expect(result.method).toBe('llm');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle complex queries with LLM classification', async () => {
      const result = await IntentClassifierService.classifyIntent('What would happen to our capacity if Terminal 2 were under maintenance?');
      
      expect(result.normalizedQuery).toBeDefined();
      expect(result.method).toBe('llm');
    });

    it('should track metrics correctly', async () => {
      await IntentClassifierService.classifyIntent('Show capacity for Terminal 1');
      await IntentClassifierService.classifyIntent('Maintenance schedule for Stand A1');
      
      const metrics = IntentClassifierService.getMetrics();
      
      expect(metrics.totalQueries).toBe(2);
      expect(metrics.intentDistribution.capacity_query?.count || 0).toBe(1);
      expect(metrics.intentDistribution.maintenance_query?.count || 0).toBe(1);
    });
  });

  describe('Intent pattern management', () => {
    it('should allow adding new intent patterns', async () => {
      // Add a custom intent pattern
      IntentClassifierService.addIntentPattern(
        'custom_query',
        /\bcustom (query|search|find)\b/i,
        [{ name: 'special_search', pattern: /\bspecial\b/i }]
      );
      
      // Turn off LLM classification to test pattern matching
      IntentClassifierService.updateConfig({ useLLMClassification: false });
      
      const result = await IntentClassifierService.classifyIntent('I need a custom query for this');
      
      expect(result.intent).toBe('custom_query');
      expect(result.method).toBe('pattern');
    });

    it('should detect subtypes when matching patterns', async () => {
      // Turn off LLM classification to test pattern matching
      IntentClassifierService.updateConfig({ useLLMClassification: false });
      
      const result = await IntentClassifierService.classifyIntent('Show maintenance schedule for next week');
      
      expect(result.intent).toBe('maintenance_query');
      expect(result.subType).toBe('maintenance_schedule');
    });
  });

  describe('Configuration options', () => {
    it('should respect disabled pattern matching', async () => {
      IntentClassifierService.updateConfig({ usePatternMatching: false });
      
      const result = await IntentClassifierService.classifyIntent('Show capacity for Terminal 1');
      
      expect(result.method).toBe('llm');
    });

    it('should respect disabled LLM classification', async () => {
      IntentClassifierService.updateConfig({ useLLMClassification: false });
      
      const result = await IntentClassifierService.classifyIntent('What would happen to our capacity if Terminal 2 were under maintenance?');
      
      // Should use pattern matching since LLM is disabled
      expect(result.method).not.toBe('llm');
    });

    it('should use fallback when all methods fail', async () => {
      // Mock query that won't match patterns and LLM will return unknown
      const result = await IntentClassifierService.classifyIntent('Something completely unrelated');
      
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});