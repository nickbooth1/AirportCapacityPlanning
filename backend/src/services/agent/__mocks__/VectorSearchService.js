/**
 * Mock Vector Search Service for testing
 */

module.exports = {
  /**
   * Search for relevant information based on a query
   */
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

  /**
   * Store vector embeddings for text
   */
  storeEmbeddings: jest.fn(async (userId, contextId, type, text, metadata = {}) => {
    return {
      id: `vector-${Date.now()}`,
      success: true
    };
  })
};