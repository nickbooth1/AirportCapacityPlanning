/**
 * Tests for RetrievalAugmentedGenerationService
 */

const RetrievalAugmentedGenerationService = require('../../../../src/services/agent/knowledge/RetrievalAugmentedGenerationService');
const KnowledgeRetrievalService = require('../../../../src/services/agent/knowledge/KnowledgeRetrievalService');
const WorkingMemoryService = require('../../../../src/services/agent/WorkingMemoryService');

// Mock the OpenAI service
jest.mock('../../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn().mockResolvedValue({
    text: 'Generated response',
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  })
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

// Mock KnowledgeRetrievalService
jest.mock('../../../../src/services/agent/knowledge/KnowledgeRetrievalService');

describe('RetrievalAugmentedGenerationService', () => {
  let service;
  let mockKnowledgeRetrievalService;
  let mockWorkingMemoryService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock services
    mockKnowledgeRetrievalService = {
      retrieveKnowledge: jest.fn().mockResolvedValue({
        facts: [
          { type: 'stand', data: { id: 'A1', terminal: 'T1', status: 'active' }, source: 'stand-data-service' },
          { type: 'terminal', data: { id: 'T1', name: 'Terminal 1' }, source: 'terminal-data-service' }
        ],
        contextual: [
          { content: 'Contextual information about stand A1', source: 'vector-search', similarity: 0.92 }
        ]
      })
    };
    
    mockWorkingMemoryService = {
      storeEntityMentions: jest.fn(),
      getKnowledgeRetrievalContext: jest.fn().mockReturnValue({}),
      storeRetrievalContext: jest.fn(),
      storeRetrievedKnowledge: jest.fn(),
      storeFinalResult: jest.fn(),
      getSessionContext: jest.fn().mockReturnValue(null)
    };
    
    // Initialize service with mocks
    service = new RetrievalAugmentedGenerationService({
      openAIService: mockOpenAIService,
      knowledgeRetrievalService: mockKnowledgeRetrievalService,
      workingMemoryService: mockWorkingMemoryService
    }, {
      maxKnowledgeItemsPerPrompt: 5,
      factCheckingEnabled: true
    });
  });
  
  describe('generateResponse', () => {
    it('should generate a response based on retrieved knowledge', async () => {
      const query = {
        text: 'Tell me about stand A1',
        parsedQuery: { intent: 'stand.details', entities: { stand: 'A1' } },
        queryId: 'test-query-id'
      };
      
      const context = { sessionId: 'test-session-id' };
      
      const result = await service.generateResponse(query, context);
      
      // Check that knowledge was retrieved
      expect(mockKnowledgeRetrievalService.retrieveKnowledge).toHaveBeenCalledWith(
        query,
        expect.objectContaining({ sessionId: 'test-session-id' }),
        expect.any(Object)
      );
      
      // Check that OpenAI was called with appropriate prompts
      expect(mockOpenAIService.processQuery).toHaveBeenCalledTimes(2);
      
      // Check that final result was stored in working memory
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalledWith(
        'test-session-id',
        'test-query-id',
        expect.any(Object)
      );
      
      // Verify the result structure
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('knowledgeUsed');
      expect(result.metadata).toHaveProperty('generationTime');
      expect(result.metadata).toHaveProperty('retrievalTime');
    });
    
    it('should use pre-retrieved knowledge if provided', async () => {
      const query = {
        text: 'Tell me about stand A1',
        parsedQuery: { intent: 'stand.details', entities: { stand: 'A1' } }
      };
      
      const preRetrievedKnowledge = {
        facts: [
          { type: 'stand', data: { id: 'A1', terminal: 'T1', status: 'active' }, source: 'stand-data-service' }
        ],
        contextual: []
      };
      
      const result = await service.generateResponse(query, {}, { preRetrievedKnowledge });
      
      // Check that knowledge wasn't retrieved again
      expect(mockKnowledgeRetrievalService.retrieveKnowledge).not.toHaveBeenCalled();
      
      // Check that OpenAI was called
      expect(mockOpenAIService.processQuery).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('sources');
    });
    
    it('should fall back to generative response when knowledge is insufficient', async () => {
      // Setup retrieval service to return empty results
      mockKnowledgeRetrievalService.retrieveKnowledge.mockResolvedValueOnce({
        facts: [],
        contextual: []
      });
      
      const query = {
        text: 'Tell me about stand Z9',
        parsedQuery: { intent: 'stand.details', entities: { stand: 'Z9' } }
      };
      
      const result = await service.generateResponse(query, {});
      
      // Should have tried retrieval
      expect(mockKnowledgeRetrievalService.retrieveKnowledge).toHaveBeenCalled();
      
      // Should have used fallback
      expect(result).toHaveProperty('isFallback', true);
      
      // Should have empty sources
      expect(result.sources).toEqual([]);
    });
    
    it('should handle errors by falling back to generative response', async () => {
      // Make the knowledge retrieval throw an error
      mockKnowledgeRetrievalService.retrieveKnowledge.mockRejectedValueOnce(
        new Error('Retrieval failed')
      );
      
      const query = { text: 'Tell me about stand A1' };
      
      const result = await service.generateResponse(query, {});
      
      // Should have fallback response
      expect(result).toHaveProperty('isFallback', true);
      expect(result).toHaveProperty('text');
    });
  });
  
  describe('knowledge preparation', () => {
    it('should prepare knowledge for generation', async () => {
      // Setup knowledge with facts and contextual items
      const knowledgeResult = {
        facts: [
          { type: 'stand', data: { id: 'A1' }, source: 'db', confidence: 0.9 },
          { type: 'terminal', data: { id: 'T1' }, source: 'db', confidence: 0.8 }
        ],
        contextual: [
          { content: 'Context item 1', source: 'vector', similarity: 0.95 },
          { content: 'Context item 2', source: 'vector', similarity: 0.85 },
          { content: 'Context item 3', source: 'vector', similarity: 0.75 }
        ]
      };
      
      // Call the private method directly
      const prepared = service._prepareKnowledgeForGeneration(knowledgeResult, {
        maxKnowledgeItems: 3,
        chunkByTokens: false
      });
      
      // Check that knowledge was prioritized correctly
      expect(prepared.items).toHaveLength(3);
      // Facts should be prioritized over contextual
      expect(prepared.items[0]).toHaveProperty('type', 'fact');
      expect(prepared.items[1]).toHaveProperty('type', 'fact');
      // Highest similarity contextual should be included
      expect(prepared.items[2]).toHaveProperty('type', 'contextual');
      expect(prepared.items[2]).toHaveProperty('similarity', 0.95);
    });
    
    it('should chunk knowledge by tokens', async () => {
      // Create dummy knowledge with long content
      const longContent = 'A'.repeat(5000); // Long enough to force chunking
      const knowledgeResult = {
        facts: [
          { type: 'fact1', data: { content: longContent }, source: 'db' },
          { type: 'fact2', data: { content: longContent }, source: 'db' }
        ],
        contextual: [
          { content: longContent, source: 'vector', similarity: 0.9 }
        ]
      };
      
      // Call the private method
      const prepared = service._prepareKnowledgeForGeneration(knowledgeResult);
      
      // Should have created multiple chunks
      expect(prepared.chunks.length).toBeGreaterThan(1);
    });
    
    it('should determine if knowledge is insufficient', async () => {
      // No knowledge
      const emptyKnowledge = { items: [] };
      expect(service._isKnowledgeInsufficient(emptyKnowledge, { text: 'query' })).toBe(true);
      
      // Factual query but no facts
      const noFactsKnowledge = { 
        items: [{ type: 'contextual', content: 'context' }] 
      };
      expect(service._isKnowledgeInsufficient(
        noFactsKnowledge, 
        { text: 'what is stand A1', parsedQuery: { intent: 'stand.query' } }
      )).toBe(true);
      
      // Sufficient knowledge
      const goodKnowledge = { 
        items: [
          { type: 'fact', data: { id: 'A1' } },
          { type: 'contextual', content: 'context about A1' }
        ] 
      };
      expect(service._isKnowledgeInsufficient(
        goodKnowledge,
        { text: 'Tell me about stand A1', parsedQuery: { intent: 'stand.details', entities: { stand: 'A1' } } }
      )).toBe(false);
    });
  });
  
  describe('evidence-based answering', () => {
    it('should generate evidence-based answers', async () => {
      // Mock OpenAI to return a response with confidence
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: 'Based on the evidence provided, stand A1 is currently active. (Evidence 1)\nConfidence score: 4',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });
      
      const question = 'Is stand A1 active?';
      const evidence = [
        { id: 'A1', status: 'active', lastUpdated: '2023-01-01' }
      ];
      
      const result = await service.generateEvidenceBasedAnswer(question, evidence);
      
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('confidence', 0.8); // 4/5
    });
  });
  
  describe('metrics', () => {
    it('should track and return metrics', async () => {
      // Call generate a few times to accumulate metrics
      const query = { text: 'Test query' };
      
      await service.generateResponse(query, {});
      await service.generateResponse(query, {});
      
      // Get and verify metrics
      const metrics = service.getMetrics();
      
      expect(metrics).toHaveProperty('totalQueries', 2);
      expect(metrics).toHaveProperty('totalRetrievalTimeMs');
      expect(metrics).toHaveProperty('totalGenerationTimeMs');
      expect(metrics).toHaveProperty('averageGenerationTimeMs');
      expect(metrics).toHaveProperty('averageRetrievalTimeMs');
      
      // Reset metrics
      service.resetMetrics();
      
      // Verify reset
      const resetMetrics = service.getMetrics();
      expect(resetMetrics.totalQueries).toBe(0);
    });
  });
});