/**
 * Tests for WorkingMemoryService
 */

const WorkingMemoryService = require('../../../src/services/agent/WorkingMemoryService');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
}));

// Mock timers for better control
jest.useFakeTimers();

describe('WorkingMemoryService', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Create a new instance for each test with shorter cleanup interval
    service = new WorkingMemoryService({ 
      defaultTTL: 500, 
      cleanupInterval: 200,
      maxEntityHistorySize: 5,
      maxKnowledgeItemsPerQuery: 3,
      maxRetrievalResultsHistory: 3
    });
    
    // Spy on Map methods
    jest.spyOn(service.storage, 'set');
    jest.spyOn(service.storage, 'get');
    jest.spyOn(service.storage, 'delete');
  });
  
  afterEach(() => {
    // Stop the cleanup interval to prevent leaks
    if (service && service.stopCleanupInterval) {
      service.stopCleanupInterval();
    }
    
    // Reset mocks and timers
    jest.clearAllTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with default options', () => {
      const defaultService = new WorkingMemoryService();
      expect(defaultService.defaultTTL).toBe(30 * 60 * 1000); // 30 minutes
      expect(defaultService.cleanupInterval).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaultService.storage).toBeInstanceOf(Map);
      expect(defaultService.cleanupTimer).toBeTruthy();
    });
    
    it('should initialize with custom options', () => {
      const customService = new WorkingMemoryService({
        defaultTTL: 5000,
        cleanupInterval: 1000
      });
      
      expect(customService.defaultTTL).toBe(5000);
      expect(customService.cleanupInterval).toBe(1000);
    });
  });

  describe('storeEntry and getEntry', () => {
    it('should store and retrieve an entry', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      service.storeEntry(key, value);
      
      expect(service.storage.set).toHaveBeenCalled();
      
      const retrieved = service.getEntry(key);
      
      expect(service.storage.get).toHaveBeenCalledWith(key);
      expect(retrieved).toEqual(value);
    });
    
    it('should return null for non-existent entries', () => {
      const result = service.getEntry('non-existent-key');
      expect(result).toBeNull();
    });
    
    it('should store with correct expiration time', () => {
      const key = 'ttl-test';
      const value = 'test-data';
      const customTTL = 500;
      
      service.storeEntry(key, value, customTTL);
      
      const storedEntry = service.storage.get(key);
      expect(storedEntry).toHaveProperty('expiresAt');
      
      const now = Date.now();
      expect(storedEntry.expiresAt).toBeGreaterThan(now);
      expect(storedEntry.expiresAt).toBeLessThanOrEqual(now + customTTL + 10); // Allow small timing difference
    });
    
    it('should return null for expired entries', () => {
      const key = 'expired-key';
      const value = 'expired-value';
      
      // Store with very short TTL
      service.storeEntry(key, value, 50);
      
      // Advance time to trigger expiration
      jest.advanceTimersByTime(100);
      
      const result = service.getEntry(key);
      expect(result).toBeNull();
      expect(service.storage.delete).toHaveBeenCalledWith(key);
    });
  });

  describe('generateKey', () => {
    it('should generate correct key format', () => {
      // Session only
      expect(service.generateKey('session1', 'context')).toBe('session1:context');
      
      // Session and type
      expect(service.generateKey('session1', 'plans')).toBe('session1:plans');
      
      // Session, type, and ID
      expect(service.generateKey('session1', 'plans', 'plan1')).toBe('session1:plans:plan1');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize objects correctly', () => {
      const original = {
        data: 'test',
        nested: { value: 42 },
        array: [1, 2, 3]
      };
      
      const serialized = service.serialize(original);
      expect(typeof serialized).toBe('string');
      
      const deserialized = service.deserialize(serialized);
      expect(deserialized).toEqual(original);
    });
    
    it('should handle serialization errors', () => {
      // Create an object with circular reference
      const circular = {};
      circular.self = circular;
      
      expect(() => service.serialize(circular)).toThrow('Failed to serialize');
    });
    
    it('should handle deserialization errors', () => {
      expect(() => service.deserialize('invalid-json')).toThrow('Failed to deserialize');
    });
  });

  describe('query plan storage and retrieval', () => {
    it('should store and retrieve a query plan', () => {
      const sessionId = 'session123';
      const queryId = 'query456';
      const plan = {
        steps: [
          { id: 'step1', description: 'Step 1' },
          { id: 'step2', description: 'Step 2' }
        ]
      };
      
      const stored = service.storeQueryPlan(sessionId, queryId, plan);
      expect(stored).toBe(true);
      
      const retrieved = service.getQueryPlan(sessionId, queryId);
      expect(retrieved).toEqual(plan);
    });
  });

  describe('step result storage and retrieval', () => {
    it('should store and retrieve step results', () => {
      const sessionId = 'session123';
      const queryId = 'query456';
      const stepId = 'step1';
      const result = { data: 'step result', success: true };
      
      const stored = service.storeStepResult(sessionId, queryId, stepId, result);
      expect(stored).toBe(true);
      
      const retrieved = service.getStepResult(sessionId, queryId, stepId);
      expect(retrieved).toEqual(result);
    });
  });

  describe('final result storage and retrieval', () => {
    it('should store and retrieve final results', () => {
      const sessionId = 'session123';
      const queryId = 'query456';
      const result = { answer: 'Final answer', confidence: 0.9 };
      
      const stored = service.storeFinalResult(sessionId, queryId, result);
      expect(stored).toBe(true);
      
      const retrieved = service.getFinalResult(sessionId, queryId);
      expect(retrieved).toEqual(result);
    });
  });

  describe('session context management', () => {
    it('should store and retrieve session context', () => {
      const sessionId = 'session123';
      const context = { 
        user: 'test-user',
        preferences: { theme: 'dark' }
      };
      
      const stored = service.storeSessionContext(sessionId, context);
      expect(stored).toBe(true);
      
      const retrieved = service.getSessionContext(sessionId);
      expect(retrieved).toEqual(context);
    });
    
    it('should update a specific field in session context', () => {
      const sessionId = 'session123';
      const context = { 
        user: 'test-user',
        preferences: { theme: 'light' }
      };
      
      service.storeSessionContext(sessionId, context);
      
      // Update a field
      const updated = service.updateSessionContextField(sessionId, 'preferences', { theme: 'dark' });
      expect(updated).toBe(true);
      
      const retrieved = service.getSessionContext(sessionId);
      expect(retrieved.preferences.theme).toBe('dark');
      expect(retrieved.user).toBe('test-user'); // Other fields unchanged
    });
    
    it('should handle updating non-existent context', () => {
      const updated = service.updateSessionContextField('non-existent', 'field', 'value');
      expect(updated).toBe(false);
    });
  });

  describe('linked queries', () => {
    it('should link related queries', () => {
      const sessionId = 'session123';
      const queryId = 'query1';
      const relatedId = 'query2';
      const relationship = 'follow-up';
      
      const linked = service.linkQueries(sessionId, queryId, relatedId, relationship);
      expect(linked).toBe(true);
      
      const links = service.getLinkedQueries(sessionId, queryId);
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveProperty('queryId', relatedId);
      expect(links[0]).toHaveProperty('relationship', relationship);
      expect(links[0]).toHaveProperty('timestamp');
    });
    
    it('should get empty array for queries with no links', () => {
      const links = service.getLinkedQueries('session123', 'no-links-query');
      expect(links).toEqual([]);
    });
  });

  describe('follow-up context retrieval', () => {
    it('should gather context for follow-up queries', () => {
      const sessionId = 'session123';
      const queryId = 'query1';
      
      // Set up session context
      service.storeSessionContext(sessionId, { user: 'test-user' });
      
      // Set up query plan and result
      service.storeQueryPlan(sessionId, queryId, { steps: [] });
      service.storeFinalResult(sessionId, queryId, { answer: 'Test answer' });
      
      // Link a related query
      service.linkQueries(sessionId, queryId, 'query2', 'follow-up');
      service.storeFinalResult(sessionId, 'query2', { answer: 'Follow-up answer' });
      
      // Get context for follow-up
      const followUpContext = service.getContextForFollowUp(sessionId, queryId);
      
      expect(followUpContext).toHaveProperty('sessionContext');
      expect(followUpContext).toHaveProperty('queryInfo');
      expect(followUpContext).toHaveProperty('linkedQueries');
      
      expect(followUpContext.sessionContext).toHaveProperty('user', 'test-user');
      expect(followUpContext.queryInfo).toHaveProperty('result');
      expect(followUpContext.linkedQueries).toHaveProperty('query2');
      expect(followUpContext.linkedQueries.query2).toHaveProperty('result');
    });
  });

  describe('session data management', () => {
    it('should clear all data for a session', () => {
      const sessionId = 'session-to-clear';
      
      // Store some data
      service.storeSessionContext(sessionId, { data: 'test' });
      service.storeQueryPlan(sessionId, 'q1', {});
      service.storeStepResult(sessionId, 'q1', 's1', {});
      
      // Also store data for another session
      service.storeSessionContext('other-session', { data: 'other' });
      
      // Clear the session
      const cleared = service.clearSessionData(sessionId);
      expect(cleared).toBe(true);
      
      // Verify data is gone
      expect(service.getSessionContext(sessionId)).toBeNull();
      expect(service.getQueryPlan(sessionId, 'q1')).toBeNull();
      expect(service.getStepResult(sessionId, 'q1', 's1')).toBeNull();
      
      // Other session data should remain
      expect(service.getSessionContext('other-session')).not.toBeNull();
    });
  });

  describe('TTL management', () => {
    it('should refresh TTL for an existing entry', () => {
      const sessionId = 'session123';
      const type = 'context';
      
      // Store with short TTL
      service.storeSessionContext(sessionId, { data: 'test' }, 50);
      
      // Refresh with longer TTL
      const refreshed = service.refreshTTL(sessionId, type, '', 1000);
      expect(refreshed).toBe(true);
      
      // Entry should now have longer expiration
      const key = service.generateKey(sessionId, type);
      const entry = service.storage.get(key);
      expect(entry.expiresAt).toBeGreaterThan(Date.now() + 500); // Should be more than 500ms from now
    });
    
    it('should return false when refreshing non-existent entry', () => {
      const refreshed = service.refreshTTL('non-existent', 'type', '', 1000);
      expect(refreshed).toBe(false);
    });
  });

  describe('cleanup functionality', () => {
    it('should remove expired entries during cleanup', () => {
      // Add some entries with short TTL
      service.storeEntry('expire1', 'value1', 50);
      service.storeEntry('expire2', 'value2', 50);
      
      // Add an entry with longer TTL
      service.storeEntry('keep', 'value3', 1000);
      
      // Advance time to trigger expiration
      jest.advanceTimersByTime(100);
      
      // Run cleanup manually
      service.cleanupExpiredEntries();
      
      // Verify expired entries are gone but others remain
      expect(service.getEntry('expire1')).toBeNull();
      expect(service.getEntry('expire2')).toBeNull();
      expect(service.getEntry('keep')).toBe('value3');
    });
    
    it('should run cleanup automatically', () => {
      // Create a service with very short cleanup interval
      const autoCleanService = new WorkingMemoryService({ 
        defaultTTL: 100, 
        cleanupInterval: 50 
      });
      
      // Add entry that will expire
      autoCleanService.storeEntry('auto-expire', 'value', 25);
      
      // Advance time to trigger expiration and cleanup
      jest.advanceTimersByTime(75); // Past expiration
      jest.advanceTimersByTime(50); // Trigger cleanup interval
      
      // Verify entry was removed
      expect(autoCleanService.getEntry('auto-expire')).toBeNull();
      
      // Clean up
      autoCleanService.stopCleanupInterval();
    });
  });

  describe('knowledge retrieval capabilities', () => {
    const sessionId = 'test-session';
    const queryId = 'test-query';

    it('should initialize with knowledge retrieval settings', () => {      
      expect(service.maxEntityHistorySize).toBe(5);
      expect(service.maxKnowledgeItemsPerQuery).toBe(3);
      expect(service.maxRetrievalResultsHistory).toBe(3);
    });

    describe('entity mentions tracking', () => {
      it('should store and retrieve entity mentions', () => {
        const entities = [
          { type: 'stand', value: 'A1', confidence: 0.95 },
          { type: 'terminal', value: 'T1', confidence: 0.9 }
        ];

        const stored = service.storeEntityMentions(sessionId, queryId, entities);
        expect(stored).toBe(true);

        const retrieved = service.getEntityMentions(sessionId);
        expect(retrieved).toHaveLength(2);
        expect(retrieved[0].type).toBe('stand');
        expect(retrieved[0].value).toBe('A1');
        expect(retrieved[0].queryId).toBe(queryId);
        expect(retrieved[0].mentionedAt).toBeDefined();
      });

      it('should filter entity mentions by type', () => {
        const entities = [
          { type: 'stand', value: 'A1', confidence: 0.95 },
          { type: 'terminal', value: 'T1', confidence: 0.9 },
          { type: 'stand', value: 'B1', confidence: 0.98 }
        ];

        service.storeEntityMentions(sessionId, queryId, entities);

        const standEntities = service.getEntityMentions(sessionId, { entityType: 'stand' });
        expect(standEntities).toHaveLength(2);
        expect(standEntities[0].value).toBe('A1');
        expect(standEntities[1].value).toBe('B1');

        const terminalEntities = service.getEntityMentions(sessionId, { entityType: 'terminal' });
        expect(terminalEntities).toHaveLength(1);
        expect(terminalEntities[0].value).toBe('T1');
      });
      
      it('should get the latest entity of a specific type', () => {
        // Create multiple entities of the same type with different timestamps
        const realDateNow = Date.now;
        let mockTime = 1000;
        Date.now = jest.fn(() => mockTime);
        
        // Add first entity
        service.storeEntityMentions(sessionId, 'query1', [
          { type: 'stand', value: 'A1', confidence: 0.95 }
        ]);
        
        // Add second entity later
        mockTime = 2000;
        service.storeEntityMentions(sessionId, 'query2', [
          { type: 'stand', value: 'B2', confidence: 0.98 }
        ]);
        
        // Add different type
        service.storeEntityMentions(sessionId, 'query3', [
          { type: 'terminal', value: 'T1', confidence: 0.9 }
        ]);
        
        // Get latest stand entity
        const latestStand = service.getLatestEntityOfType(sessionId, 'stand');
        expect(latestStand).toBeDefined();
        expect(latestStand.value).toBe('B2');
        expect(latestStand.confidence).toBe(0.98);
        
        // Restore original Date.now
        Date.now = realDateNow;
      });
      
      it('should filter by confidence when getting latest entity', () => {
        const realDateNow = Date.now;
        Date.now = jest.fn(() => 1000);
        
        service.storeEntityMentions(sessionId, 'query1', [
          { type: 'aircraft', value: 'B737', confidence: 0.65 },
          { type: 'aircraft', value: 'A320', confidence: 0.95 }
        ]);
        
        // Get with high confidence threshold
        const highConfidenceEntity = service.getLatestEntityOfType(sessionId, 'aircraft', {
          minConfidence: 0.9
        });
        expect(highConfidenceEntity.value).toBe('A320');
        
        // Get with lower confidence threshold
        const lowerConfidenceEntity = service.getLatestEntityOfType(sessionId, 'aircraft', {
          minConfidence: 0.6
        });
        // Should still return the most recent matching entity
        expect(lowerConfidenceEntity.value).toBe('B737');
        
        // Get with threshold that filters all entities
        const noEntity = service.getLatestEntityOfType(sessionId, 'aircraft', {
          minConfidence: 0.99
        });
        expect(noEntity).toBeNull();
        
        Date.now = realDateNow;
      });

      it('should respect entity history size limit', () => {
        // Create more entities than the max size
        for (let i = 0; i < 8; i++) {
          const entities = [{ type: 'test', value: `entity-${i}` }];
          service.storeEntityMentions(sessionId, `query-${i}`, entities);
        }

        const allEntities = service.getEntityMentions(sessionId);
        expect(allEntities.length).toBeLessThanOrEqual(5); // Max history size
        
        // Should keep the most recent entities
        expect(allEntities[0].value).toBe('entity-7');
        expect(allEntities[1].value).toBe('entity-6');
      });

      it('should handle entity filtering by recency', () => {
        // Mock Date.now to ensure consistent timestamps
        const realDateNow = Date.now;
        let mockTime = 1000;
        Date.now = jest.fn(() => mockTime);

        // Add entities at different times
        service.storeEntityMentions(sessionId, 'query1', [{ type: 'old', value: 'old-entity' }]);
        
        mockTime = 5000; // Advance time
        service.storeEntityMentions(sessionId, 'query2', [{ type: 'new', value: 'new-entity' }]);

        // Get only recent entities (last 3000ms)
        const recentEntities = service.getEntityMentions(sessionId, { recency: 3000 });
        expect(recentEntities).toHaveLength(1);
        expect(recentEntities[0].value).toBe('new-entity');

        // Restore original Date.now
        Date.now = realDateNow;
      });

      it('should handle invalid entity input', () => {
        expect(service.storeEntityMentions(sessionId, queryId, 'not-an-array')).toBe(false);
      });
    });

    describe('knowledge retrieval storage', () => {
      it('should store and retrieve knowledge items', () => {
        const items = [
          { id: 'item1', content: 'Test content 1', source: 'stands' },
          { id: 'item2', content: 'Test content 2', source: 'terminals' }
        ];

        const metadata = {
          strategy: 'vector',
          sources: ['stands', 'terminals'],
          query: 'Original query text'
        };

        const stored = service.storeRetrievedKnowledge(sessionId, queryId, items, metadata);
        expect(stored).toBe(true);

        const retrieved = service.getRetrievedKnowledge(sessionId, queryId);
        expect(retrieved).toBeDefined();
        expect(retrieved.items).toHaveLength(2);
        expect(retrieved.items[0].id).toBe('item1');
        expect(retrieved.metadata.strategy).toBe('vector');
        expect(retrieved.metadata.timestamp).toBeDefined();
      });

      it('should limit number of knowledge items stored', () => {
        const items = [
          { id: 'item1', content: 'Content 1' },
          { id: 'item2', content: 'Content 2' },
          { id: 'item3', content: 'Content 3' },
          { id: 'item4', content: 'Content 4' },
          { id: 'item5', content: 'Content 5' }
        ];

        service.storeRetrievedKnowledge(sessionId, queryId, items);

        const retrieved = service.getRetrievedKnowledge(sessionId, queryId);
        expect(retrieved.items.length).toBeLessThanOrEqual(3); // Max per query
        expect(retrieved.metadata.itemCount).toBe(5); // Original count
        expect(retrieved.metadata.storedItemCount).toBeLessThanOrEqual(3); // Stored count
      });

      it('should handle invalid knowledge item input', () => {
        expect(service.storeRetrievedKnowledge(sessionId, queryId, 'not-an-array')).toBe(false);
      });
    });

    describe('retrieval history tracking', () => {
      it('should maintain retrieval history', () => {
        // Store multiple retrieval results
        for (let i = 0; i < 5; i++) {
          const queryId = `history-query-${i}`;
          const items = [{ id: `item-${i}`, content: `Content ${i}` }];
          const metadata = {
            strategy: i % 2 === 0 ? 'vector' : 'structured',
            sources: ['test-source']
          };

          service.storeRetrievedKnowledge(sessionId, queryId, items, metadata);
        }

        // Get history
        const history = service.getRetrievalHistory(sessionId);
        expect(history).toHaveLength(3); // Limited by maxRetrievalResultsHistory
        
        // Should be in reverse chronological order (newest first)
        expect(history[0].queryId).toBe('history-query-4');
        expect(history[1].queryId).toBe('history-query-3');
        expect(history[2].queryId).toBe('history-query-2');
      });

      it('should limit history results when requested', () => {
        // Store multiple items
        for (let i = 0; i < 3; i++) {
          service.storeRetrievedKnowledge(
            sessionId, 
            `limit-query-${i}`, 
            [{ id: `item-${i}` }],
            { strategy: 'test' }
          );
        }

        // Get limited history
        const limitedHistory = service.getRetrievalHistory(sessionId, 2);
        expect(limitedHistory).toHaveLength(2);
      });
    });

    describe('retrieval context management', () => {
      it('should store and retrieve retrieval context', () => {
        const context = {
          intent: 'find.stands',
          parameters: { terminal: 'T1' },
          constraints: { minimumConfidence: 0.8 }
        };

        const stored = service.storeRetrievalContext(sessionId, queryId, context);
        expect(stored).toBe(true);

        const retrieved = service.getRetrievalContext(sessionId, queryId);
        expect(retrieved).toEqual(context);
      });
    });

    describe('comprehensive knowledge context building', () => {
      it('should build a comprehensive knowledge retrieval context', () => {
        // Set up session context
        service.storeSessionContext(sessionId, { user: 'test-user', preferences: { dataSource: 'primary' } });
        
        // Add some entity mentions
        service.storeEntityMentions(sessionId, 'prior-query', [
          { type: 'stand', value: 'A1', confidence: 0.9 },
          { type: 'terminal', value: 'T1', confidence: 0.95 }
        ]);
        
        // Add prior knowledge retrievals
        service.storeRetrievedKnowledge(
          sessionId,
          'prior-query',
          [{ id: 'prior-item', content: 'Prior content' }],
          { strategy: 'vector' }
        );
        
        // Link queries
        service.linkQueries(sessionId, queryId, 'prior-query', 'follows');
        
        // Get comprehensive context
        const context = service.getKnowledgeRetrievalContext(sessionId, queryId);
        
        // Validate structure and content
        expect(context).toHaveProperty('sessionContext');
        expect(context).toHaveProperty('currentQuery', queryId);
        expect(context).toHaveProperty('recentEntities');
        expect(context).toHaveProperty('retrievalHistory');
        expect(context).toHaveProperty('priorKnowledge');
        expect(context).toHaveProperty('linkedQueries');
        expect(context).toHaveProperty('timestamp');
        
        // Validate specific data
        expect(context.sessionContext.user).toBe('test-user');
        expect(context.recentEntities).toHaveLength(2);
        expect(context.retrievalHistory).toHaveLength(1);
        expect(context.priorKnowledge).toHaveProperty('prior-query');
      });

      it('should handle errors gracefully', () => {
        // Mock getEntityMentions to throw an error
        jest.spyOn(service, 'getEntityMentions').mockImplementation(() => {
          throw new Error('Test error');
        });
        
        const errorContext = service.getKnowledgeRetrievalContext(sessionId, queryId);
        
        expect(errorContext).toHaveProperty('error');
        expect(errorContext).toHaveProperty('timestamp');
      });
    });
  });
});