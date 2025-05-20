/**
 * Mock Vector Search Service for testing
 */

// Mock model dimensions
const embeddingDimension = 1536;

const VectorSearchService = jest.fn().mockImplementation(() => {
  // In-memory storage for metrics
  const metrics = {
    apiCalls: 2, // Set to expected values in tests
    cacheHits: 1,
    vectorsGenerated: 2,
    searchesPerformed: 3,
    totalLatency: 150,
    errors: 1
  };
  
  return {
    // Original methods
    searchRelevantInformation: jest.fn(async (userId, contextId, query, options = {}) => {
      return {
        memories: [
          {
            id: 'memory-1',
            content: 'Information about Terminal 2 capacity',
            score: 0.92,
            createdAt: new Date().toISOString()
          }
        ],
        messages: [
          {
            id: 'message-1',
            content: 'Previous question about Terminal 2',
            score: 0.85,
            timestamp: new Date().toISOString()
          }
        ]
      };
    }),
    
    storeEmbeddings: jest.fn(async (userId, contextId, type, text, metadata = {}) => {
      return {
        id: `vector-${Date.now()}`,
        success: true
      };
    }),
    
    // New methods for other tests
    searchSimilarContent: jest.fn().mockImplementation((query, options = {}) => {
      // Return mock results
      return Promise.resolve([
        { content: "Result 1 content", source: "document-1", similarity: 0.92 },
        { content: "Result 2 content", source: "document-2", similarity: 0.87 },
        { content: "Result 3 content", source: "document-3", similarity: 0.76 }
      ].slice(0, options.limit || 3));
    }),
    
    getEmbedding: jest.fn().mockImplementation((text) => {
      // Return mock embedding with correct dimension
      return Promise.resolve(Array(embeddingDimension).fill(0).map((_, i) => 
        (Math.sin(i) + 1) / Math.sqrt(embeddingDimension)
      ));
    }),
    
    getMetrics: jest.fn().mockReturnValue(metrics),
    resetMetrics: jest.fn().mockImplementation(() => {
      Object.keys(metrics).forEach(key => metrics[key] = 0);
    }),
    
    // Other methods that might be called in tests
    similarityScore: jest.fn().mockReturnValue(0.85),
    clearCache: jest.fn(),
    findSimilarMemories: jest.fn().mockResolvedValue([
      { id: 1, content: "Memory 1", similarity: 0.9 },
      { id: 2, content: "Memory 2", similarity: 0.8 },
      { id: 3, content: "Memory 3", similarity: 0.7 }
    ])
  };
});

// Add static property to constructor function
VectorSearchService.embeddingDimension = embeddingDimension;

// For compatibility with existing code
Object.assign(VectorSearchService, {
  searchRelevantInformation: jest.fn(async (userId, contextId, query, options = {}) => {
    return {
      memories: [
        {
          id: 'memory-1',
          content: 'Information about Terminal 2 capacity',
          score: 0.92,
          createdAt: new Date().toISOString()
        }
      ],
      messages: [
        {
          id: 'message-1',
          content: 'Previous question about Terminal 2',
          score: 0.85,
          timestamp: new Date().toISOString()
        }
      ]
    };
  }),
  
  storeEmbeddings: jest.fn(async (userId, contextId, type, text, metadata = {}) => {
    return {
      id: `vector-${Date.now()}`,
      success: true
    };
  })
});

module.exports = VectorSearchService;