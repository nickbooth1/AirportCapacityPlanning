/**
 * Mock implementation of ContextService for testing
 */

// In-memory cache
const cache = new Map();

// Create the mock
const ContextService = {
  // Mock implementation of set method
  set: jest.fn().mockImplementation((key, value) => {
    cache.set(key, value);
    return Promise.resolve(true);
  }),
  
  // Mock implementation of get method
  get: jest.fn().mockImplementation((key) => {
    return Promise.resolve(cache.get(key) || null);
  }),
  
  // Mock implementation of delete method
  delete: jest.fn().mockImplementation((key) => {
    cache.delete(key);
    return Promise.resolve(true);
  }),
  
  // Mock implementation of getContext
  getContext: jest.fn().mockImplementation((contextId) => {
    return Promise.resolve(cache.get(`context:${contextId}`) || {
      id: contextId,
      messages: [],
      entities: {},
      summary: null
    });
  }),
  
  // Other methods
  getMessages: jest.fn().mockResolvedValue([]),
  getEntities: jest.fn().mockResolvedValue({}),
  findRelevantInformation: jest.fn().mockResolvedValue({
    memories: [],
    messages: []
  }),
  cacheContext: jest.fn(),
  getConversationHistory: jest.fn().mockResolvedValue([]),
  
  // Helper to manually set test data
  mockData: (key, value) => {
    cache.set(key, value);
  },
  
  // Helper to clear all data
  clearMock: () => {
    cache.clear();
  }
};

// Reset all mocks helper function
ContextService.resetMocks = () => {
  Object.keys(ContextService).forEach(key => {
    if (typeof ContextService[key] === 'function' && ContextService[key].mockReset) {
      ContextService[key].mockReset();
    }
  });
  cache.clear();
};

module.exports = ContextService;