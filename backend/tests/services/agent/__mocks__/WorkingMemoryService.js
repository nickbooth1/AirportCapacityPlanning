/**
 * Manual mock for WorkingMemoryService
 */

const mockWorkingMemoryService = {
  // Storage methods
  storeSessionData: jest.fn().mockResolvedValue(true),
  getSessionData: jest.fn(),
  
  // Session context methods
  getSessionContext: jest.fn().mockResolvedValue({}),
  storeSessionContext: jest.fn().mockResolvedValue(true),
  updateSessionContextField: jest.fn().mockResolvedValue(true),
  
  // Entity methods
  storeEntityMentions: jest.fn().mockResolvedValue(true),
  getEntityMentions: jest.fn().mockResolvedValue([]),
  getLatestEntityOfType: jest.fn().mockResolvedValue(null),
  
  // Knowledge methods
  storeRetrievedKnowledge: jest.fn().mockResolvedValue(true),
  getRetrievedKnowledge: jest.fn().mockResolvedValue({ items: [], metadata: {} }),
  getRetrievalHistory: jest.fn().mockResolvedValue([]),
  
  // Helper methods
  clearSessionData: jest.fn().mockResolvedValue(true),
  refreshTTL: jest.fn().mockResolvedValue(true)
};

module.exports = jest.fn().mockImplementation(() => mockWorkingMemoryService);