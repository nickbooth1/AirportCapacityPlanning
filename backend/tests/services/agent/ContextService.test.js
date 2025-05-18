/**
 * Test file for ContextService
 */

const ContextService = require('../../../src/services/agent/ContextService');
const ConversationContext = require('../../../src/models/agent/ConversationContext');
const LongTermMemory = require('../../../src/models/agent/LongTermMemory');
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const VectorSearchService = require('../../../src/services/agent/VectorSearchService');
const logger = require('../../../src/utils/logger');

// Mock the dependencies
jest.mock('../../../src/models/agent/ConversationContext', () => {
  return {
    query: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    insert: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    patch: jest.fn().mockResolvedValue({}),
    deleteById: jest.fn().mockResolvedValue(1)
  };
});

jest.mock('../../../src/models/agent/LongTermMemory', () => {
  return {
    query: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn(),
    delete: jest.fn().mockResolvedValue(true),
    findById: jest.fn().mockReturnThis(),
    patch: jest.fn().mockResolvedValue({})
  };
});

jest.mock('../../../src/services/agent/OpenAIService', () => {
  return {
    processQuery: jest.fn().mockResolvedValue({
      text: 'Mocked summary response',
      usage: {}
    })
  };
});

jest.mock('../../../src/services/agent/VectorSearchService', () => {
  return {
    searchRelevantInformation: jest.fn().mockResolvedValue({
      memories: [],
      messages: []
    }),
    findSimilarMemories: jest.fn().mockResolvedValue([])
  };
});

jest.mock('../../../src/utils/logger', () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };
});

describe('ContextService', () => {
  let mockContext;
  
  beforeEach(() => {
    jest.clearAllMocks();
    ContextService.resetMetrics();
    
    // Set up mock context for most tests
    mockContext = {
      id: 'test-context-id',
      userId: 'test-user-id',
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
          responseId: 'resp1'
        }
      ],
      entities: { airport: { name: 'Test Airport' } },
      intents: [],
      summary: null,
      contextQuality: 1.0,
      topicTags: ['airport', 'capacity'],
      addMessage: jest.fn().mockResolvedValue({}),
      updateEntities: jest.fn().mockResolvedValue({}),
      addIntent: jest.fn().mockResolvedValue({}),
      $query: jest.fn().mockReturnValue({
        patch: jest.fn().mockResolvedValue({})
      })
    };
    
    // Mock the ConversationContext query responses
    ConversationContext.query().findById.mockResolvedValue(mockContext);
    ConversationContext.query().insert.mockResolvedValue(mockContext);
    ConversationContext.query().where().orderBy().limit().offset().mockResolvedValue([mockContext]);
  });
  
  afterEach(() => {
    // Clear any memoized values or caches
    ContextService.contextCache.clear();
  });
  
  describe('createContext', () => {
    it('should create a new conversation context', async () => {
      const result = await ContextService.createContext('test-user-id');
      
      expect(ConversationContext.query().insert).toHaveBeenCalledWith({
        userId: 'test-user-id'
      });
      
      expect(result).toEqual(mockContext);
      expect(ContextService.metrics.contextsCreated).toBe(1);
    });
    
    it('should throw error if userId is not provided', async () => {
      await expect(ContextService.createContext()).rejects.toThrow('required');
      expect(ContextService.metrics.errors).toBe(1);
    });
    
    it('should throw error if database insert fails', async () => {
      const mockError = new Error('Database error');
      ConversationContext.query().insert.mockRejectedValueOnce(mockError);
      
      await expect(ContextService.createContext('test-user-id')).rejects.toThrow();
      expect(ContextService.metrics.errors).toBe(1);
    });
  });
  
  describe('getContext', () => {
    it('should get a context by ID', async () => {
      const result = await ContextService.getContext('test-context-id');
      
      expect(ConversationContext.query().findById).toHaveBeenCalledWith('test-context-id');
      expect(result).toEqual(mockContext);
    });
    
    it('should use cache for subsequent requests', async () => {
      // First request should query the database
      await ContextService.getContext('test-context-id');
      expect(ConversationContext.query().findById).toHaveBeenCalledTimes(1);
      
      // Reset the mock to verify it's not called again
      ConversationContext.query().findById.mockClear();
      
      // Second request should use cache
      await ContextService.getContext('test-context-id');
      expect(ConversationContext.query().findById).not.toHaveBeenCalled();
      expect(ContextService.metrics.cacheHits).toBe(1);
    });
    
    it('should bypass cache when requested', async () => {
      // First request should query the database
      await ContextService.getContext('test-context-id');
      
      // Reset the mock to verify it's called again
      ConversationContext.query().findById.mockClear();
      
      // Second request should bypass cache
      await ContextService.getContext('test-context-id', true);
      expect(ConversationContext.query().findById).toHaveBeenCalledTimes(1);
    });
    
    it('should throw error if context is not found', async () => {
      ConversationContext.query().findById.mockResolvedValueOnce(null);
      
      await expect(ContextService.getContext('nonexistent-id')).rejects.toThrow('not found');
      expect(ContextService.metrics.errors).toBe(1);
    });
  });
  
  describe('getUserContexts', () => {
    it('should get contexts for a user with default pagination', async () => {
      const result = await ContextService.getUserContexts('test-user-id');
      
      expect(ConversationContext.query().where).toHaveBeenCalledWith('userId', 'test-user-id');
      expect(ConversationContext.query().where().orderBy).toHaveBeenCalledWith('lastUpdateTime', 'desc');
      expect(ConversationContext.query().where().orderBy().limit).toHaveBeenCalledWith(10);
      expect(ConversationContext.query().where().orderBy().limit().offset).toHaveBeenCalledWith(0);
      
      expect(result).toEqual([mockContext]);
    });
    
    it('should apply custom pagination parameters', async () => {
      await ContextService.getUserContexts('test-user-id', 20, 40);
      
      expect(ConversationContext.query().where().orderBy().limit).toHaveBeenCalledWith(20);
      expect(ConversationContext.query().where().orderBy().limit().offset).toHaveBeenCalledWith(40);
    });
    
    it('should apply constraints to pagination parameters', async () => {
      // Test with invalid values
      await ContextService.getUserContexts('test-user-id', -5, -10);
      
      // Should sanitize to valid values
      expect(ConversationContext.query().where().orderBy().limit).toHaveBeenCalledWith(1);
      expect(ConversationContext.query().where().orderBy().limit().offset).toHaveBeenCalledWith(0);
    });
  });
  
  describe('message management', () => {
    describe('addUserMessage', () => {
      it('should add a user message to the context', async () => {
        await ContextService.addUserMessage('test-context-id', 'New user message');
        
        expect(mockContext.addMessage).toHaveBeenCalledWith('user', 'New user message');
        expect(ContextService.metrics.messagesAdded).toBe(1);
      });
      
      it('should trigger context size management if needed', async () => {
        // Create a context with more than MAX_CONTEXT_MESSAGES
        const manyMessages = Array(51).fill().map((_, i) => ({
          id: `msg${i}`,
          role: i % 2 === 0 ? 'user' : 'agent',
          content: `Message ${i}`,
          timestamp: new Date().toISOString()
        }));
        
        const largeContext = {
          ...mockContext,
          messages: manyMessages,
          addMessage: jest.fn().mockResolvedValue({})
        };
        
        ConversationContext.query().findById.mockResolvedValueOnce(largeContext);
        
        // Mock the manageContextSize method
        const originalManageContextSize = ContextService.manageContextSize;
        ContextService.manageContextSize = jest.fn().mockResolvedValue(undefined);
        
        await ContextService.addUserMessage('test-context-id', 'New message');
        
        expect(ContextService.manageContextSize).toHaveBeenCalledWith('test-context-id');
        
        // Restore original method
        ContextService.manageContextSize = originalManageContextSize;
      });
      
      it('should sanitize message content', async () => {
        const longMessage = 'a'.repeat(60000); // Message longer than max
        
        await ContextService.addUserMessage('test-context-id', longMessage);
        
        // Should be truncated
        const expectedTruncated = 'a'.repeat(51200) + ' [content truncated]';
        expect(mockContext.addMessage).toHaveBeenCalledWith('user', expectedTruncated);
      });
    });
    
    describe('addAgentMessage', () => {
      it('should add an agent message with responseId', async () => {
        await ContextService.addAgentMessage('test-context-id', 'New agent message', 'response-123');
        
        expect(mockContext.addMessage).toHaveBeenCalledWith('agent', 'New agent message', 'response-123');
        expect(ContextService.metrics.messagesAdded).toBe(1);
      });
      
      it('should generate a responseId if not provided', async () => {
        await ContextService.addAgentMessage('test-context-id', 'New agent message');
        
        // Check that addMessage was called with a generated UUID
        expect(mockContext.addMessage).toHaveBeenCalled();
        const callArgs = mockContext.addMessage.mock.calls[0];
        expect(callArgs[0]).toBe('agent');
        expect(callArgs[1]).toBe('New agent message');
        expect(callArgs[2]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format
      });
      
      it('should trigger memory extraction periodically', async () => {
        // Set up a context with exactly 5 agent messages
        const fiveAgentMessages = Array(5).fill().map((_, i) => ({
          id: `msg${i}`,
          role: 'agent',
          content: `Agent message ${i}`,
          timestamp: new Date().toISOString()
        }));
        
        const context = {
          ...mockContext,
          messages: fiveAgentMessages,
          addMessage: jest.fn().mockResolvedValue({})
        };
        
        ConversationContext.query().findById.mockResolvedValueOnce(context);
        
        // Mock the extractAndStoreLongTermMemories method
        const originalExtractMethod = ContextService.extractAndStoreLongTermMemories;
        ContextService.extractAndStoreLongTermMemories = jest.fn().mockResolvedValue([]);
        
        await ContextService.addAgentMessage('test-context-id', 'This should trigger extraction');
        
        expect(ContextService.extractAndStoreLongTermMemories).toHaveBeenCalledWith('test-context-id');
        
        // Restore original method
        ContextService.extractAndStoreLongTermMemories = originalExtractMethod;
      });
    });
  });
  
  describe('context entity management', () => {
    it('should update entities in the context', async () => {
      const newEntities = {
        airport: { code: 'TEST', terminal: 'T1' },
        airlines: ['Airline1', 'Airline2']
      };
      
      await ContextService.updateEntities('test-context-id', newEntities);
      
      expect(mockContext.updateEntities).toHaveBeenCalledWith(newEntities);
    });
    
    it('should reject non-serializable entities', async () => {
      // Create an object with circular reference
      const circular = {};
      circular.self = circular;
      
      await expect(ContextService.updateEntities('test-context-id', circular))
        .rejects.toThrow('serializable');
      
      expect(mockContext.updateEntities).not.toHaveBeenCalled();
    });
    
    it('should get entities from the context', async () => {
      const result = await ContextService.getEntities('test-context-id');
      
      expect(result).toEqual({ airport: { name: 'Test Airport' } });
    });
  });
  
  describe('intent management', () => {
    it('should add an intent to the context', async () => {
      await ContextService.addIntent('test-context-id', 'capacity_query', 0.85);
      
      expect(mockContext.addIntent).toHaveBeenCalledWith('capacity_query', 0.85);
    });
    
    it('should normalize confidence values', async () => {
      await ContextService.addIntent('test-context-id', 'test_intent', 1.5); // Above 1
      expect(mockContext.addIntent).toHaveBeenCalledWith('test_intent', 1);
      
      mockContext.addIntent.mockClear();
      
      await ContextService.addIntent('test-context-id', 'test_intent', -0.5); // Below 0
      expect(mockContext.addIntent).toHaveBeenCalledWith('test_intent', 0);
    });
  });
  
  describe('message retrieval', () => {
    it('should get recent messages from the context', async () => {
      const result = await ContextService.getMessages('test-context-id', 5);
      
      expect(result).toEqual(mockContext.messages);
    });
    
    it('should limit the number of returned messages', async () => {
      // Create a context with many messages
      const manyMessages = Array(20).fill().map((_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? 'user' : 'agent',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));
      
      const largeContext = {
        ...mockContext,
        messages: manyMessages
      };
      
      ConversationContext.query().findById.mockResolvedValueOnce(largeContext);
      
      const result = await ContextService.getMessages('test-context-id', 5);
      
      // Should return the 5 most recent messages
      expect(result).toHaveLength(5);
      expect(result[0].id).toBe('msg15');
      expect(result[4].id).toBe('msg19');
    });
  });
  
  describe('conversation history', () => {
    it('should retrieve full conversation history', async () => {
      const result = await ContextService.getConversationHistory('test-context-id');
      
      // Should return formatted messages for LLM
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'user',
        content: 'Test message 1'
      });
      expect(result[1]).toEqual({
        role: 'agent',
        content: 'Test message 2'
      });
    });
    
    it('should include summary if available', async () => {
      // Mock a context with a summary
      const contextWithSummary = {
        ...mockContext,
        summary: 'This is a summary of previous conversation'
      };
      
      ConversationContext.query().findById.mockResolvedValueOnce(contextWithSummary);
      
      const result = await ContextService.getConversationHistory('test-context-id');
      
      // Should include the summary as a system message at the beginning
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('This is a summary');
    });
    
    it('should enrich history with relevant information when requested', async () => {
      // Mock vector search to return some relevant memories
      VectorSearchService.searchRelevantInformation.mockResolvedValueOnce({
        memories: [
          { id: 'mem1', content: 'Important memory', category: 'DATA', importance: 8 }
        ],
        messages: []
      });
      
      const result = await ContextService.getConversationHistory(
        'test-context-id',
        true, // enrich with memories
        'What is the airport capacity?'
      );
      
      // Should include the relevant memory as a system message
      expect(result.length).toBeGreaterThan(2);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('Important memory');
      
      // Should have called vector search
      expect(VectorSearchService.searchRelevantInformation).toHaveBeenCalledWith(
        'test-user-id',
        'test-context-id',
        'What is the airport capacity?',
        expect.any(Object)
      );
    });
  });
  
  describe('memory extraction & retrieval', () => {
    beforeEach(() => {
      // Mock OpenAI response for memory extraction
      OpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            content: 'User prefers Terminal 1 for arrivals',
            category: 'PREFERENCE',
            importance: 7
          },
          {
            content: 'Stand A5 is under maintenance until June 15',
            category: 'CONSTRAINT',
            importance: 9
          }
        ]),
        usage: {}
      });
      
      // Mock the LongTermMemory insert
      LongTermMemory.query().insert.mockImplementation(memory => Promise.resolve({
        ...memory,
        id: 'mem-' + Math.floor(Math.random() * 1000)
      }));
    });
    
    it('should extract and store long-term memories from conversation', async () => {
      // Create a context with enough messages
      const messages = Array(15).fill().map((_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? 'user' : 'agent',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));
      
      const contextWithMessages = {
        ...mockContext,
        messages
      };
      
      ConversationContext.query().findById.mockResolvedValueOnce(contextWithMessages);
      
      const result = await ContextService.extractAndStoreLongTermMemories('test-context-id');
      
      // Should have stored 2 memories
      expect(result).toHaveLength(2);
      expect(LongTermMemory.query().insert).toHaveBeenCalledTimes(2);
      
      // Verify the first memory was stored correctly
      const firstMemoryCall = LongTermMemory.query().insert.mock.calls[0][0];
      expect(firstMemoryCall.userId).toBe('test-user-id');
      expect(firstMemoryCall.contextId).toBe('test-context-id');
      expect(firstMemoryCall.content).toBe('User prefers Terminal 1 for arrivals');
      expect(firstMemoryCall.category).toBe('PREFERENCE');
      expect(firstMemoryCall.importance).toBe(7);
    });
    
    it('should retrieve relevant memories based on a query', async () => {
      // Mock the vector search service
      VectorSearchService.findSimilarMemories.mockResolvedValueOnce([
        {
          id: 'mem1',
          content: 'Terminal 1 has 15 gates',
          category: 'DATA',
          importance: 6,
          similarity: 0.85
        }
      ]);
      
      const result = await ContextService.retrieveRelevantMemories(
        'test-context-id',
        'How many gates in Terminal 1?'
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Terminal 1 has 15 gates');
      
      // Verify search parameters
      expect(VectorSearchService.findSimilarMemories).toHaveBeenCalledWith(
        'test-user-id',
        'How many gates in Terminal 1?',
        expect.objectContaining({
          threshold: expect.any(Number),
          minImportance: expect.any(Number)
        })
      );
    });
  });
  
  describe('context summarization', () => {
    it('should summarize older messages when context is too large', async () => {
      // Create a context with more than MAX_CONTEXT_MESSAGES
      const manyMessages = Array(60).fill().map((_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? 'user' : 'agent',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));
      
      const largeContext = {
        ...mockContext,
        messages: manyMessages,
        $query: jest.fn().mockReturnValue({
          patch: jest.fn().mockResolvedValue({})
        })
      };
      
      ConversationContext.query().findById.mockResolvedValueOnce(largeContext);
      
      // Mock the summarizeMessages method
      OpenAIService.processQuery.mockResolvedValueOnce({
        text: 'This is a summary of the conversation about airport capacity.',
        usage: {}
      });
      
      await ContextService.manageContextSize('test-context-id');
      
      // Should have called OpenAI to summarize
      expect(OpenAIService.processQuery).toHaveBeenCalled();
      
      // Should have updated the context with the summary and reduced messages
      expect(largeContext.$query().patch).toHaveBeenCalledWith({
        messages: expect.arrayContaining([]), // Should contain the most recent messages
        summary: 'This is a summary of the conversation about airport capacity.',
        lastUpdateTime: expect.any(String)
      });
      
      // Should have kept MAX_CONTEXT_MESSAGES messages
      const patchCall = largeContext.$query().patch.mock.calls[0][0];
      expect(patchCall.messages.length).toBe(50);
    });
    
    it('should include previous summary when summarizing messages', async () => {
      // Create a context with existing summary and many messages
      const manyMessages = Array(60).fill().map((_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? 'user' : 'agent',
        content: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));
      
      const contextWithSummary = {
        ...mockContext,
        messages: manyMessages,
        summary: 'Previous summary: User discussed airport capacity issues.',
        $query: jest.fn().mockReturnValue({
          patch: jest.fn().mockResolvedValue({})
        })
      };
      
      ConversationContext.query().findById.mockResolvedValueOnce(contextWithSummary);
      
      await ContextService.manageContextSize('test-context-id');
      
      // Should have included the previous summary in the prompt
      const promptArg = OpenAIService.processQuery.mock.calls[0][0];
      expect(promptArg).toContain('Previous summary:');
    });
  });
  
  describe('context lifecycle management', () => {
    it('should mark a context as completed', async () => {
      await ContextService.markContextAsCompleted('test-context-id');
      
      // Should patch the context with endTime
      expect(ConversationContext.query().findById().patch).toHaveBeenCalledWith({
        endTime: expect.any(String),
        lastUpdateTime: expect.any(String)
      });
    });
    
    it('should delete a context and related memories', async () => {
      await ContextService.deleteContext('test-context-id');
      
      // Should delete the context
      expect(ConversationContext.query().deleteById).toHaveBeenCalledWith('test-context-id');
      
      // Should delete related memories
      expect(LongTermMemory.query().where).toHaveBeenCalledWith('contextId', 'test-context-id');
      expect(LongTermMemory.query().where().delete).toHaveBeenCalled();
      
      // Should remove from cache
      expect(ContextService.getCachedContext('test-context-id')).toBeNull();
    });
  });
  
  describe('cache management', () => {
    it('should cache contexts and retrieve them efficiently', () => {
      // Cache a context
      ContextService.cacheContext(mockContext);
      
      // Should be able to retrieve it from cache
      const cachedContext = ContextService.getCachedContext('test-context-id');
      expect(cachedContext).toEqual(mockContext);
    });
    
    it('should clean expired cache entries', () => {
      // Mock Date.now to manipulate time
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(1000);
      
      // Cache a context
      ContextService.cacheContext(mockContext);
      
      // Advance time beyond TTL
      Date.now = jest.fn().mockReturnValue(1000 + (6 * 60 * 1000)); // 6 minutes later
      
      // Clean the cache
      ContextService.cleanCache();
      
      // Should be removed from cache
      const cachedContext = ContextService.getCachedContext('test-context-id');
      expect(cachedContext).toBeNull();
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });
  
  describe('metrics tracking', () => {
    it('should track metrics for service operations', async () => {
      // Perform various operations to generate metrics
      await ContextService.createContext('user-1');
      await ContextService.getContext('test-context-id');
      await ContextService.getContext('test-context-id'); // Cache hit
      await ContextService.addUserMessage('test-context-id', 'Message 1');
      await ContextService.addUserMessage('test-context-id', 'Message 2');
      
      // Get the metrics
      const metrics = ContextService.getMetrics();
      
      // Verify metrics were tracked
      expect(metrics.contextsCreated).toBe(1);
      expect(metrics.messagesAdded).toBe(2);
      expect(metrics.cacheHits).toBe(1);
    });
    
    it('should reset metrics when requested', () => {
      // Set some metrics
      ContextService.metrics.contextsCreated = 5;
      ContextService.metrics.messagesAdded = 10;
      
      // Reset metrics
      ContextService.resetMetrics();
      
      // Verify all metrics were reset to 0
      const metrics = ContextService.getMetrics();
      expect(metrics.contextsCreated).toBe(0);
      expect(metrics.messagesAdded).toBe(0);
      expect(metrics.cacheHits).toBe(0);
    });
  });
  
  describe('utility methods', () => {
    it('should sanitize message content', () => {
      const sanitized = ContextService.sanitizeMessageContent('  Test message with whitespace  ');
      expect(sanitized).toBe('Test message with whitespace');
    });
    
    it('should truncate overly long messages', () => {
      const longMessage = 'a'.repeat(60000);
      const sanitized = ContextService.sanitizeMessageContent(longMessage);
      
      expect(sanitized.length).toBeLessThan(longMessage.length);
      expect(sanitized.endsWith('[content truncated]')).toBe(true);
    });
    
    it('should identify relevant entity types from queries', () => {
      const types1 = ContextService.getRelevantEntityTypes('How many stands are in Terminal 3?');
      expect(types1).toContain('stands');
      expect(types1).toContain('terminals');
      
      const types2 = ContextService.getRelevantEntityTypes('What maintenance is scheduled?');
      expect(types2).toContain('maintenance');
      
      const types3 = ContextService.getRelevantEntityTypes('When does British Airways flight arrive?');
      expect(types3).toContain('airlines');
      expect(types3).toContain('flights');
    });
  });
});