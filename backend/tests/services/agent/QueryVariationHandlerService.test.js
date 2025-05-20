/**
 * Tests for QueryVariationHandlerService
 */
const QueryVariationHandlerService = require('../../../src/services/agent/QueryVariationHandlerService');

describe('QueryVariationHandlerService', () => {
  // Reset any config changes between tests
  beforeEach(() => {
    QueryVariationHandlerService.updateConfig({
      enableSynonymReplacement: true,
      enablePhrasingNormalization: true,
      enableColloquialTranslation: true,
      enableAbbreviationExpansion: true
    });
  });

  describe('processQuery', () => {
    it('should handle invalid inputs', () => {
      const result1 = QueryVariationHandlerService.processQuery('');
      const result2 = QueryVariationHandlerService.processQuery(null);
      const result3 = QueryVariationHandlerService.processQuery(123);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    it('should handle basic preprocessing', () => {
      const result = QueryVariationHandlerService.processQuery('  What is the capacity?  ');
      
      expect(result.success).toBe(true);
      expect(result.originalQuery).toBe('  What is the capacity?  ');
      expect(result.normalizedQuery).not.toEqual(result.originalQuery);
      expect(result.wasTransformed).toBe(true);
    });

    it('should replace synonyms correctly', () => {
      const result = QueryVariationHandlerService.processQuery('What is the gate usage today?');
      
      expect(result.success).toBe(true);
      expect(result.normalizedQuery).toContain('stand');
      expect(result.normalizedQuery).toContain('utilization');
      expect(result.normalizedQuery).toContain('current day');
      expect(result.wasTransformed).toBe(true);
    });

    it('should expand abbreviations correctly', () => {
      const result = QueryVariationHandlerService.processQuery('Show T1 dep capacity for int flights');
      
      expect(result.success).toBe(true);
      expect(result.normalizedQuery).toContain('Terminal 1');
      expect(result.normalizedQuery).toContain('departure');
      expect(result.normalizedQuery).toContain('international');
      expect(result.wasTransformed).toBe(true);
    });

    it('should normalize question phrasings', () => {
      const result1 = QueryVariationHandlerService.processQuery('What is the capacity for Terminal 1?');
      const result2 = QueryVariationHandlerService.processQuery('How many stands are available?');
      const result3 = QueryVariationHandlerService.processQuery('Can you show me maintenance impact?');
      
      expect(result1.normalizedQuery).toContain('show capacity for Terminal 1');
      expect(result2.normalizedQuery).toContain('count stands');
      expect(result3.normalizedQuery).toContain('show me maintenance impact');
    });

    it('should translate colloquial expressions', () => {
      const result = QueryVariationHandlerService.processQuery('What\'s up with Terminal 2 capacity?');
      
      expect(result.success).toBe(true);
      expect(result.normalizedQuery).toContain('status of');
      expect(result.normalizedQuery).not.toContain('what\'s up with');
      expect(result.wasTransformed).toBe(true);
    });

    it('should track processing steps correctly', () => {
      const result = QueryVariationHandlerService.processQuery('What\'s the current gate usage at T1?');
      
      expect(result.processingSteps.length).toBeGreaterThan(0);
      expect(result.processingSteps.find(step => step.step === 'synonym_replacement')).toBeTruthy();
      expect(result.processingSteps.find(step => step.step === 'abbreviation_expansion')).toBeTruthy();
      expect(result.processingSteps.find(step => step.step === 'phrasing_normalization')).toBeTruthy();
    });

    it('should calculate confidence correctly', () => {
      const result1 = QueryVariationHandlerService.processQuery('Show capacity');
      const result2 = QueryVariationHandlerService.processQuery('What\'s up with T1 gates?');
      
      // Simple query with no transformations should have high confidence
      expect(result1.confidence).toBeGreaterThanOrEqual(0.9);
      
      // Complex query with multiple transformations should have lower confidence
      expect(result2.confidence).toBeLessThan(1);
    });
  });

  describe('Configuration options', () => {
    it('should respect disabled synonym replacement', () => {
      QueryVariationHandlerService.updateConfig({ enableSynonymReplacement: false });
      
      const result = QueryVariationHandlerService.processQuery('What is the gate usage?');
      
      expect(result.normalizedQuery).toContain('gate');
      expect(result.normalizedQuery).not.toContain('stand');
    });

    it('should respect disabled phrasing normalization', () => {
      QueryVariationHandlerService.updateConfig({ enablePhrasingNormalization: false });
      
      const result = QueryVariationHandlerService.processQuery('What is the capacity?');
      
      expect(result.normalizedQuery).toContain('What is the capacity');
      expect(result.normalizedQuery).not.toContain('show capacity');
    });

    it('should respect disabled colloquial translation', () => {
      QueryVariationHandlerService.updateConfig({ enableColloquialTranslation: false });
      
      const result = QueryVariationHandlerService.processQuery('What\'s up with Terminal 1?');
      
      expect(result.normalizedQuery).toContain('What\'s up with');
      expect(result.normalizedQuery).not.toContain('status of');
    });

    it('should respect disabled abbreviation expansion', () => {
      QueryVariationHandlerService.updateConfig({ enableAbbreviationExpansion: false });
      
      const result = QueryVariationHandlerService.processQuery('Show T1 capacity');
      
      expect(result.normalizedQuery).toContain('T1');
      expect(result.normalizedQuery).not.toContain('Terminal 1');
    });
  });

  describe('Dictionary management', () => {
    it('should allow adding new synonyms', () => {
      QueryVariationHandlerService.addSynonym('airplane', 'aircraft');
      
      const result = QueryVariationHandlerService.processQuery('Show airplane capacity');
      
      expect(result.normalizedQuery).toContain('aircraft');
      expect(result.normalizedQuery).not.toContain('airplane');
    });

    it('should allow adding new abbreviations', () => {
      QueryVariationHandlerService.addAbbreviation('LTN', 'London Luton');
      
      const result = QueryVariationHandlerService.processQuery('Show LTN capacity');
      
      expect(result.normalizedQuery).toContain('London Luton');
      expect(result.normalizedQuery).not.toContain('LTN');
    });

    it('should allow adding new phrasing patterns', () => {
      QueryVariationHandlerService.addPhrasingPattern(/^tell me about (.+)$/i, 'describe $1');
      
      const result = QueryVariationHandlerService.processQuery('Tell me about Terminal 1');
      
      expect(result.normalizedQuery).toContain('describe Terminal 1');
    });

    it('should allow adding new colloquial mappings', () => {
      QueryVariationHandlerService.addColloquialMapping('how are things looking at', 'status of');
      
      const result = QueryVariationHandlerService.processQuery('How are things looking at Terminal 2?');
      
      expect(result.normalizedQuery).toContain('status of Terminal 2');
    });
  });
});