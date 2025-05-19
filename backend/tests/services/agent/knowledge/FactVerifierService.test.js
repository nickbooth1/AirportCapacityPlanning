/**
 * Tests for FactVerifierService
 */

const FactVerifierService = require('../../../../src/services/agent/knowledge/FactVerifierService');

// Mock the OpenAI service
jest.mock('../../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn()
}));

// Mock the OpenAIService
const mockOpenAIService = require('../../../../src/services/agent/OpenAIService');

// Mock the logger
jest.mock('../../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('FactVerifierService', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset OpenAI mock to default behavior
    mockOpenAIService.processQuery.mockReset();
    
    // Initialize service
    service = new FactVerifierService({
      openAIService: mockOpenAIService
    }, {
      defaultConfidenceThreshold: 0.7,
      strictMode: false
    });
  });
  
  describe('verifyResponse', () => {
    it('should verify a response against knowledge items', async () => {
      // Mock the extractFactualStatements method
      jest.spyOn(service, 'extractFactualStatements').mockResolvedValue([
        { text: 'Stand A1 is active', lineNumber: 1, type: 'property', specificity: 4 },
        { text: 'Terminal T1 has 10 stands', lineNumber: 2, type: 'numerical', specificity: 3 }
      ]);
      
      // Mock verification results
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            status: 'SUPPORTED',
            confidence: 0.95,
            sources: [1],
            explanation: 'Directly stated in knowledge item 1',
            suggestedCorrection: ''
          },
          {
            status: 'PARTIALLY SUPPORTED',
            confidence: 0.6,
            sources: [2],
            explanation: 'Knowledge mentions Terminal T1 but not the number of stands',
            suggestedCorrection: 'Terminal T1 has multiple stands'
          }
        ]),
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });
      
      // No need to mock correction since the mock will be reused with its result
      
      // Test data
      const responseText = 'Stand A1 is active. Terminal T1 has 10 stands.';
      const knowledgeItems = [
        { type: 'stand', data: { id: 'A1', status: 'active' }, source: 'db' },
        { type: 'terminal', data: { id: 'T1', name: 'Terminal 1' }, source: 'db' }
      ];
      
      // Call the method
      const result = await service.verifyResponse(responseText, knowledgeItems);
      
      // Verify results
      expect(result).toHaveProperty('verified');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('statements');
      expect(result).toHaveProperty('correctedResponse');
      
      // Check statements were processed
      expect(result.statements.length).toBe(2);
      expect(result.statements[0]).toHaveProperty('accurate', true);
      expect(result.statements[1]).toHaveProperty('partiallyAccurate', true);
      
      // Should have called OpenAI for verification
      expect(mockOpenAIService.processQuery).toHaveBeenCalled();
    });
    
    it('should return early if no statements to verify', async () => {
      // Mock empty statements
      jest.spyOn(service, 'extractFactualStatements').mockResolvedValue([]);
      
      const result = await service.verifyResponse('No factual statements here.', []);
      
      // Should return verified result without calling OpenAI
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.statements).toEqual([]);
      expect(mockOpenAIService.processQuery).not.toHaveBeenCalled();
    });
    
    it('should handle verification errors gracefully', async () => {
      // Mock error in verification
      jest.spyOn(service, 'extractFactualStatements').mockResolvedValue([
        { text: 'Test statement', lineNumber: 1 }
      ]);
      
      mockOpenAIService.processQuery.mockRejectedValueOnce(new Error('API error'));
      
      const responseText = 'Test statement';
      const result = await service.verifyResponse(responseText, []);
      
      // Should return error result but not throw
      expect(result).toHaveProperty('verified', false);
      expect(result).toHaveProperty('error');
      expect(result.correctedResponse).toBe(responseText); // Returns original
    });
    
    it('should generate corrected response when needed', async () => {
      // Mock statements
      jest.spyOn(service, 'extractFactualStatements').mockResolvedValue([
        { text: 'Stand A1 is inactive', lineNumber: 1 }
      ]);
      
      // Mock verification showing contradiction
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            status: 'CONTRADICTED',
            confidence: 0.1,
            sources: [1],
            explanation: 'Knowledge states stand A1 is active',
            suggestedCorrection: 'Stand A1 is active'
          }
        ])
      });
      
      // Mock correction
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: 'Stand A1 is active.',
        usage: {}
      });
      
      // Test data
      const responseText = 'Stand A1 is inactive.';
      const knowledgeItems = [
        { type: 'stand', data: { id: 'A1', status: 'active' }, source: 'db' }
      ];
      
      // Call the method
      const result = await service.verifyResponse(responseText, knowledgeItems);
      
      // Verify correction happened
      expect(result.correctedResponse).toBe('Stand A1 is active.');
      expect(result.verified).toBe(false);
      expect(result.statements[0].contradicted).toBe(true);
      
      // Should have called OpenAI twice (verify + correct)
      expect(mockOpenAIService.processQuery).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('extractFactualStatements', () => {
    it('should extract factual statements from text', async () => {
      // Mock OpenAI response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          { text: 'Stand A1 is active', lineNumber: 1, type: 'property', specificity: 4 },
          { text: 'Terminal T1 has 10 stands', lineNumber: 2, type: 'numerical', specificity: 3 }
        ]),
        usage: {}
      });
      
      const text = 'Stand A1 is active.\nTerminal T1 has 10 stands.';
      const statements = await service.extractFactualStatements(text);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toHaveProperty('text', 'Stand A1 is active');
      expect(statements[1]).toHaveProperty('text', 'Terminal T1 has 10 stands');
      expect(statements[1]).toHaveProperty('specificity', 3);
    });
    
    it('should handle parse errors in statement extraction', async () => {
      // Mock invalid response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: 'Not valid JSON',
        usage: {}
      });
      
      const text = 'Stand A1 is active.';
      const statements = await service.extractFactualStatements(text);
      
      // Should return fallback with whole text as one statement
      expect(statements).toHaveLength(1);
      expect(statements[0]).toHaveProperty('text', text);
    });
  });
  
  describe('verifyClaim', () => {
    it('should verify a specific claim against knowledge', async () => {
      // Mock verification result
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify({
          status: 'SUPPORTED',
          confidence: 0.95,
          sources: [1],
          explanation: 'Directly stated in knowledge item 1',
          evidence: ['Stand A1 status: active']
        }),
        usage: {}
      });
      
      const claim = 'Stand A1 is active';
      const knowledgeItems = [
        { type: 'stand', data: { id: 'A1', status: 'active' }, source: 'db' }
      ];
      
      const result = await service.verifyClaim(claim, knowledgeItems);
      
      expect(result).toHaveProperty('claim', claim);
      expect(result).toHaveProperty('accurate', true);
      expect(result).toHaveProperty('confidence', 0.95);
      expect(result).toHaveProperty('sourceReferences');
      expect(result).toHaveProperty('explanation');
    });
    
    it('should handle unsupported claims', async () => {
      // Mock verification of unsupported claim
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify({
          status: 'UNSUPPORTED',
          confidence: 0.2,
          sources: [],
          explanation: 'No knowledge items mention this claim',
        }),
        usage: {}
      });
      
      const claim = 'Stand Z9 is under maintenance';
      const result = await service.verifyClaim(claim, []);
      
      expect(result).toHaveProperty('accurate', false);
      expect(result).toHaveProperty('status', 'UNSUPPORTED');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
  
  describe('compareResponses', () => {
    it('should compare two responses for factual consistency', async () => {
      // Mock comparison result
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify({
          consistencyScore: 0.7,
          comparisonPoints: [
            {
              point: 'Stand A1 status',
              agreement: false,
              moreAccurate: 'Response 1',
              confidence: 0.9,
              evidence: {
                response1: 'Stand A1 is active',
                response2: 'Stand A1 is inactive'
              }
            }
          ],
          summary: 'The responses disagree about the status of Stand A1'
        }),
        usage: {}
      });
      
      const response1 = 'Stand A1 is active';
      const response2 = 'Stand A1 is inactive';
      const knowledgeItems = [
        { type: 'stand', data: { id: 'A1', status: 'active' }, source: 'db' }
      ];
      
      const result = await service.compareResponses(response1, response2, knowledgeItems);
      
      expect(result).toHaveProperty('consistencyScore', 0.7);
      expect(result).toHaveProperty('comparisonPoints');
      expect(result.comparisonPoints).toHaveLength(1);
      expect(result).toHaveProperty('summary');
    });
    
    it('should handle comparison without knowledge items', async () => {
      // Mock comparison result
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify({
          consistencyScore: 0.5,
          comparisonPoints: [],
          summary: 'Consistency assessment without knowledge context'
        }),
        usage: {}
      });
      
      const response1 = 'Terminal T1 is busy';
      const response2 = 'Terminal T1 has high traffic';
      
      // Call without knowledge items
      const result = await service.compareResponses(response1, response2);
      
      expect(result).toHaveProperty('consistencyScore');
      expect(result).toHaveProperty('summary');
      
      // Should have called with different prompt
      expect(mockOpenAIService.processQuery).toHaveBeenCalledWith(
        expect.stringContaining('Response 1'),
        expect.anything(),
        expect.stringContaining('AI assistant')
      );
    });
  });
  
  describe('metrics', () => {
    it('should track and return metrics', async () => {
      // Mock necessary methods to avoid actual API calls
      jest.spyOn(service, 'extractFactualStatements').mockResolvedValue([
        { text: 'Test statement', lineNumber: 1 }
      ]);
      
      // Mock successful verification
      mockOpenAIService.processQuery.mockResolvedValue({
        text: JSON.stringify([{ status: 'SUPPORTED', confidence: 0.9 }]),
        usage: {}
      });
      
      // Call the method multiple times
      await service.verifyResponse('Test 1', []);
      await service.verifyResponse('Test 2', []);
      
      // Get and verify metrics
      const metrics = service.getMetrics();
      
      expect(metrics).toHaveProperty('totalVerifications', 2);
      expect(metrics).toHaveProperty('totalCorrections');
      expect(metrics).toHaveProperty('averageConfidence');
      expect(metrics).toHaveProperty('totalVerificationTimeMs');
      expect(metrics).toHaveProperty('averageVerificationTimeMs');
      expect(metrics).toHaveProperty('correctionRate');
      
      // Reset metrics
      service.resetMetrics();
      
      // Verify reset worked
      const resetMetrics = service.getMetrics();
      expect(resetMetrics.totalVerifications).toBe(0);
    });
  });
});