/**
 * Test file for VectorSearchService
 */

const VectorSearchService = require('../../../src/services/agent/VectorSearchService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const LongTermMemory = require('../../../src/models/agent/LongTermMemory');
const ConversationContext = require('../../../src/models/agent/ConversationContext');

// Mock the dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  client: {
    embeddings: {
      create: jest.fn()
    }
  }
}));

jest.mock('../../../src/models/agent/LongTermMemory', () => ({
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  patch: jest.fn().mockResolvedValue({})
}));

jest.mock('../../../src/models/agent/ConversationContext', () => ({
  query: jest.fn().mockReturnThis(),
  findById: jest.fn().mockResolvedValue({
    id: 'test-context-id',
    messages: [
      {
        id: 'msg1',
        role: 'user',
        content: 'Test message 1',
        timestamp: new Date().toISOString()
      },
      {
        id: 'msg2',
        role: 'agent',
        content: 'Test message 2',
        timestamp: new Date().toISOString()
      }
    ]
  })
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('VectorSearchService', () => {
  beforeEach(() => {
    // Reset mocks and metrics
    jest.clearAllMocks();
    VectorSearchService.resetMetrics();
    VectorSearchService.clearCache();
    
    // Setup default mock responses
    OpenAIService.client.embeddings.create.mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0).map((_, i) => i / 1536)
        }
      ]
    });
    
    LongTermMemory.query().where.mockImplementation(() => ({
      whereIn: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      then: callback => callback([
        {
          id: 'memory1',
          userId: 'test-user',
          content: 'Test memory 1',
          category: 'OTHER',
          importance: 5,
          accessCount: 2,
          timestamp: new Date().toISOString()
        },
        {
          id: 'memory2',
          userId: 'test-user',
          content: 'Test memory 2',
          category: 'PREFERENCE',
          importance: 8,
          accessCount: 1,
          timestamp: new Date().toISOString()
        }
      ])
    }));
  });

  describe('getEmbedding', () => {
    it('should get embedding from OpenAI API', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      });
      
      const result = await VectorSearchService.getEmbedding('test query');
      
      expect(result).toEqual(mockEmbedding);
      expect(OpenAIService.client.embeddings.create).toHaveBeenCalledWith({
        model: VectorSearchService.embeddingModel,
        input: 'test query',
        dimensions: VectorSearchService.embeddingDimension
      });
    });
    
    it('should cache embeddings', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      });
      
      // First call should use the API
      await VectorSearchService.getEmbedding('test query');
      
      // Second call should use the cache
      const result = await VectorSearchService.getEmbedding('test query');
      
      expect(result).toEqual(mockEmbedding);
      expect(OpenAIService.client.embeddings.create).toHaveBeenCalledTimes(1);
      expect(VectorSearchService.getMetrics().cacheHits).toBe(1);
    });
    
    it('should handle API errors and retry', async () => {
      // First call fails with rate limit error
      OpenAIService.client.embeddings.create.mockRejectedValueOnce({
        status: 429,
        message: 'Rate limit exceeded'
      });
      
      // Second call succeeds
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      });
      
      const result = await VectorSearchService.getEmbedding('test query');
      
      expect(result).toEqual(mockEmbedding);
      expect(OpenAIService.client.embeddings.create).toHaveBeenCalledTimes(2);
    });
    
    it('should handle empty or invalid input', async () => {
      await expect(VectorSearchService.getEmbedding('')).rejects.toThrow();
      await expect(VectorSearchService.getEmbedding(null)).rejects.toThrow();
      await expect(VectorSearchService.getEmbedding(123)).rejects.toThrow();
    });
  });
  
  describe('getBatchEmbeddings', () => {
    it('should process multiple texts in batch', async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0).map((_, i) => i / 1536),
        new Array(1536).fill(0).map((_, i) => (i + 1) / 1536)
      ];
      
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [
          { embedding: mockEmbeddings[0] },
          { embedding: mockEmbeddings[1] }
        ]
      });
      
      const result = await VectorSearchService.getBatchEmbeddings(['query1', 'query2']);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[1]).toEqual(mockEmbeddings[1]);
      expect(OpenAIService.client.embeddings.create).toHaveBeenCalledWith({
        model: VectorSearchService.embeddingModel,
        input: ['query1', 'query2']
      });
    });
    
    it('should handle empty or invalid batch inputs', async () => {
      const result1 = await VectorSearchService.getBatchEmbeddings([]);
      expect(result1).toEqual([]);
      
      const result2 = await VectorSearchService.getBatchEmbeddings([null, '', 123]);
      expect(result2).toEqual([]);
      
      expect(OpenAIService.client.embeddings.create).not.toHaveBeenCalled();
    });
    
    it('should use cache for previously processed texts', async () => {
      // First, cache an embedding
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      });
      
      await VectorSearchService.getEmbedding('query1');
      
      // Now batch process with one cached and one new
      const mockEmbedding2 = new Array(1536).fill(0).map((_, i) => (i + 1) / 1536);
      OpenAIService.client.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding2 }]
      });
      
      const result = await VectorSearchService.getBatchEmbeddings(['query1', 'query2']);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEmbedding);
      expect(result[1]).toEqual(mockEmbedding2);
      
      // Should only call API for the second query
      expect(OpenAIService.client.embeddings.create).toHaveBeenCalledTimes(2);
      expect(OpenAIService.client.embeddings.create).toHaveBeenLastCalledWith({
        model: VectorSearchService.embeddingModel,
        input: ['query2']
      });
    });
  });
  
  describe('Similarity calculations', () => {
    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [0, 1, 0, 0];
      const vec3 = [1, 1, 0, 0];
      
      // Orthogonal vectors should have similarity 0
      expect(VectorSearchService.calculateCosineSimilarity(vec1, vec2)).toBe(0);
      
      // Same vector should have similarity 1
      expect(VectorSearchService.calculateCosineSimilarity(vec1, vec1)).toBe(1);
      
      // 45 degree angle should have similarity 0.7071... (1/√2)
      const sim = VectorSearchService.calculateCosineSimilarity(vec1, vec3);
      expect(sim).toBeCloseTo(1 / Math.sqrt(2));
    });
    
    it('should handle vectors of different dimensions', () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [1, 0];
      
      // Should use common dimensions
      expect(VectorSearchService.calculateCosineSimilarity(vec1, vec2)).toBe(1);
    });
    
    it('should calculate Euclidean distance correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      
      // Distance between [1,0,0] and [0,1,0] should be √2
      expect(VectorSearchService.calculateEuclideanDistance(vec1, vec2)).toBeCloseTo(Math.sqrt(2));
      
      // Distance between same vectors should be 0
      expect(VectorSearchService.calculateEuclideanDistance(vec1, vec1)).toBe(0);
    });
  });
  
  describe('findSimilarMemories', () => {
    it('should return relevant memories based on query similarity', async () => {
      // Mock embeddings for query and memories
      const queryEmbedding = [0.1, 0.2, 0.3];
      const memory1Embedding = [0.1, 0.2, 0.3]; // Same as query (high similarity)
      const memory2Embedding = [0.9, 0.8, 0.7]; // Different from query (low similarity)
      
      // Mock the embedding service
      VectorSearchService.getEmbedding = jest.fn().mockResolvedValue(queryEmbedding);
      VectorSearchService.getBatchEmbeddings = jest.fn().mockResolvedValue([
        memory1Embedding, memory2Embedding
      ]);
      
      // Mock calculate similarity to return controlled values
      VectorSearchService.calculateCosineSimilarity = jest.fn()
        .mockImplementation((vec1, vec2) => {
          if (vec2 === memory1Embedding) return 0.98;
          if (vec2 === memory2Embedding) return 0.2;
          return 0;
        });
      
      const results = await VectorSearchService.findSimilarMemories('test-user', 'test query');
      
      // Should only return the first memory (above threshold)
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('memory1');
      expect(results[0].similarity).toBe(0.98);
      
      // Verify memory access counts were updated
      expect(LongTermMemory.query().findById).toHaveBeenCalledWith('memory1');
      expect(LongTermMemory.patch).toHaveBeenCalled();
    });
    
    it('should support filtering by category', async () => {
      // Setup mocks
      VectorSearchService.getEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      VectorSearchService.getBatchEmbeddings = jest.fn().mockResolvedValue([
        [0.1, 0.2, 0.3], [0.1, 0.2, 0.3]
      ]);
      VectorSearchService.calculateCosineSimilarity = jest.fn().mockReturnValue(0.9);
      
      await VectorSearchService.findSimilarMemories('test-user', 'test query', {
        categories: ['PREFERENCE']
      });
      
      // Verify category filter was applied
      expect(LongTermMemory.whereIn).toHaveBeenCalledWith('category', ['PREFERENCE']);
    });
    
    it('should support filtering by importance', async () => {
      // Setup mocks
      VectorSearchService.getEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      VectorSearchService.getBatchEmbeddings = jest.fn().mockResolvedValue([
        [0.1, 0.2, 0.3], [0.1, 0.2, 0.3]
      ]);
      VectorSearchService.calculateCosineSimilarity = jest.fn().mockReturnValue(0.9);
      
      await VectorSearchService.findSimilarMemories('test-user', 'test query', {
        minImportance: 7
      });
      
      // Verify importance filter was applied
      expect(LongTermMemory.where).toHaveBeenCalledWith('importance', '>=', 7);
    });
  });
  
  describe('findRelevantMessages', () => {
    it('should return relevant messages based on query similarity', async () => {
      // Mock embeddings
      const queryEmbedding = [0.1, 0.2, 0.3];
      const message1Embedding = [0.1, 0.2, 0.3]; // High similarity
      const message2Embedding = [0.9, 0.8, 0.7]; // Low similarity
      
      // Mock the embedding service
      VectorSearchService.getEmbedding = jest.fn().mockResolvedValue(queryEmbedding);
      VectorSearchService.getBatchEmbeddings = jest.fn().mockResolvedValue([
        message1Embedding, message2Embedding
      ]);
      
      // Mock calculate similarity for controlled values
      VectorSearchService.calculateCosineSimilarity = jest.fn()
        .mockImplementation((vec1, vec2) => {
          if (vec2 === message1Embedding) return 0.95;
          if (vec2 === message2Embedding) return 0.3;
          return 0;
        });
      
      const results = await VectorSearchService.findRelevantMessages('test-context-id', 'test query');
      
      // Should return the first message (above threshold)
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('msg1');
      expect(results[0].similarity).toBe(0.95);
    });
    
    it('should support filtering by role', async () => {
      // Setup mocks
      VectorSearchService.getEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      VectorSearchService.getBatchEmbeddings = jest.fn().mockResolvedValue([
        [0.1, 0.2, 0.3]
      ]);
      VectorSearchService.calculateCosineSimilarity = jest.fn().mockReturnValue(0.9);
      
      const results = await VectorSearchService.findRelevantMessages('test-context-id', 'test query', {
        roles: ['user']
      });
      
      // Should only include messages with role 'user'
      expect(results).toHaveLength(1);
      expect(results[0].role).toBe('user');
    });
  });
  
  describe('searchRelevantInformation', () => {
    it('should search both memories and messages in parallel', async () => {
      // Mock the individual search methods
      VectorSearchService.findSimilarMemories = jest.fn().mockResolvedValue([
        { id: 'memory1', content: 'Memory content', similarity: 0.9 }
      ]);
      
      VectorSearchService.findRelevantMessages = jest.fn().mockResolvedValue([
        { id: 'msg1', content: 'Message content', similarity: 0.8 }
      ]);
      
      const results = await VectorSearchService.searchRelevantInformation(
        'test-user', 'test-context-id', 'test query'
      );
      
      expect(results.memories).toHaveLength(1);
      expect(results.memories[0].id).toBe('memory1');
      
      expect(results.messages).toHaveLength(1);
      expect(results.messages[0].id).toBe('msg1');
      
      expect(VectorSearchService.findSimilarMemories).toHaveBeenCalledWith(
        'test-user', 'test query', {}
      );
      
      expect(VectorSearchService.findRelevantMessages).toHaveBeenCalledWith(
        'test-context-id', 'test query', {}
      );
    });
    
    it('should handle errors gracefully', async () => {
      // Make one of the search methods fail
      VectorSearchService.findSimilarMemories = jest.fn().mockRejectedValue(
        new Error('Test error')
      );
      
      VectorSearchService.findRelevantMessages = jest.fn().mockResolvedValue([
        { id: 'msg1', content: 'Message content', similarity: 0.8 }
      ]);
      
      // Should not throw, but return empty for the failed part
      const results = await VectorSearchService.searchRelevantInformation(
        'test-user', 'test-context-id', 'test query'
      );
      
      expect(results.memories).toEqual([]);
      expect(results.messages).toEqual([]);
      expect(VectorSearchService.getMetrics().errors).toBeGreaterThan(0);
    });
  });
  
  describe('Cache management', () => {
    it('should manage cache entries correctly', () => {
      // Add items to cache
      VectorSearchService._cacheEmbedding('item1', [1, 2, 3]);
      VectorSearchService._cacheEmbedding('item2', [4, 5, 6]);
      
      // Should retrieve cached items
      expect(VectorSearchService._getCachedEmbedding('item1')).toEqual([1, 2, 3]);
      expect(VectorSearchService._getCachedEmbedding('item2')).toEqual([4, 5, 6]);
      
      // Clear the cache
      VectorSearchService.clearCache();
      
      // Cache should be empty
      expect(VectorSearchService._getCachedEmbedding('item1')).toBeNull();
      expect(VectorSearchService._getCachedEmbedding('item2')).toBeNull();
    });
    
    it('should clean old entries from cache', () => {
      // Mock Date.now for deterministic tests
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(1000);
      
      // Add items to cache
      VectorSearchService._cacheEmbedding('old-item', [1, 2, 3]);
      
      // Advance time past TTL
      Date.now = jest.fn().mockReturnValue(1000 + VectorSearchService.cacheTTL + 1000);
      
      // Add another item to trigger cleanup
      VectorSearchService._cacheEmbedding('new-item', [4, 5, 6]);
      VectorSearchService._cleanCache();
      
      // Old item should be gone, new item should remain
      expect(VectorSearchService._getCachedEmbedding('old-item')).toBeNull();
      expect(VectorSearchService._getCachedEmbedding('new-item')).toEqual([4, 5, 6]);
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });
  
  describe('Error handling and fallbacks', () => {
    beforeEach(() => {
      // Set environment to production for fallback tests
      process.env.NODE_ENV = 'production';
    });
    
    afterEach(() => {
      // Reset environment
      delete process.env.NODE_ENV;
    });
    
    it('should provide fallback embeddings in production when API fails', async () => {
      // Make API call fail
      OpenAIService.client.embeddings.create.mockRejectedValue(
        new Error('API unavailable')
      );
      
      // Should not throw in production, but return fallback
      const result = await VectorSearchService.getEmbedding('test query');
      
      // Fallback should be a normalized vector
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(VectorSearchService.embeddingDimension);
      
      // Verify error was tracked
      expect(VectorSearchService.getMetrics().errors).toBe(1);
    });
    
    it('should generate consistent fallback embeddings for the same input', async () => {
      // Generate fallback embeddings for the same text
      const fallback1 = VectorSearchService._generateFallbackEmbedding('test');
      const fallback2 = VectorSearchService._generateFallbackEmbedding('test');
      
      // Should be identical
      expect(fallback1).toEqual(fallback2);
      
      // Generate for different text
      const fallback3 = VectorSearchService._generateFallbackEmbedding('different');
      
      // Should be different
      expect(fallback1).not.toEqual(fallback3);
    });
  });
  
  describe('Performance metrics', () => {
    it('should track performance metrics correctly', async () => {
      // Initial metrics should be zeros
      const initialMetrics = VectorSearchService.getMetrics();
      expect(initialMetrics.apiCalls).toBe(0);
      expect(initialMetrics.cacheHits).toBe(0);
      
      // Make some calls to generate metrics
      await VectorSearchService.getEmbedding('query1');
      await VectorSearchService.getEmbedding('query1'); // Should use cache
      await VectorSearchService.getEmbedding('query2');
      
      // Verify metrics were updated
      const updatedMetrics = VectorSearchService.getMetrics();
      expect(updatedMetrics.apiCalls).toBe(2);
      expect(updatedMetrics.cacheHits).toBe(1);
      expect(updatedMetrics.vectorsGenerated).toBe(2);
      
      // Reset metrics
      VectorSearchService.resetMetrics();
      
      // Metrics should be back to zeros
      const resetMetrics = VectorSearchService.getMetrics();
      expect(resetMetrics.apiCalls).toBe(0);
      expect(resetMetrics.cacheHits).toBe(0);
    });
  });
});