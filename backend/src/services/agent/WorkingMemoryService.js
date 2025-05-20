/**
 * WorkingMemoryService.js
 * 
 * This service maintains state during multi-turn interactions and complex reasoning processes.
 * It provides short-term memory capabilities for the agent, storing query plans, intermediate results,
 * final reasoning outcomes, and knowledge retrieval context with a configurable time-to-live (TTL).
 * 
 * Enhanced to support knowledge retrieval components with methods for storing and retrieving:
 * - Entity mentions from the conversation
 * - Retrieved knowledge items
 * - Query context for knowledge retrieval
 * - Past knowledge retrieval results
 */

const logger = require('../../utils/logger');

class WorkingMemoryService {
  constructor(options = {}) {
    // Initialize memory storage with default TTL of 30 minutes (in milliseconds)
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; 
    this.storage = new Map();
    
    // Knowledge retrieval specific settings
    this.maxEntityHistorySize = options.maxEntityHistorySize || 50;
    this.maxKnowledgeItemsPerQuery = options.maxKnowledgeItemsPerQuery || 20;
    this.maxRetrievalResultsHistory = options.maxRetrievalResultsHistory || 10;
    
    // Set up memory cleanup interval (every 10 minutes by default)
    this.cleanupInterval = options.cleanupInterval || 10 * 60 * 1000;
    this.startCleanupInterval();
  }

  /**
   * Start the cleanup interval to remove expired entries
   */
  startCleanupInterval() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear storage to prevent memory leaks during tests
    if (this.storage) {
      this.storage.clear();
    }
  }

  /**
   * Remove all expired entries from storage
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.storage.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.storage.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired memory entries`);
    }
  }

  /**
   * Store a query plan for a specific session
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {Object} plan - The query execution plan
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeQueryPlan(sessionId, queryId, plan, ttl) {
    try {
      const key = this.generateKey(sessionId, 'plans', queryId);
      this.storeEntry(key, plan, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing query plan:', error);
      return false;
    }
  }

  /**
   * Retrieve a query plan
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {Object|null} - The query plan or null if not found
   */
  getQueryPlan(sessionId, queryId) {
    try {
      const key = this.generateKey(sessionId, 'plans', queryId);
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving query plan:', error);
      return null;
    }
  }

  /**
   * Store an intermediate step result
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {string} stepId - The step identifier
   * @param {any} result - The step result to store
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeStepResult(sessionId, queryId, stepId, result, ttl) {
    try {
      const key = this.generateKey(sessionId, 'steps', `${queryId}-${stepId}`);
      this.storeEntry(key, result, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing step result:', error);
      return false;
    }
  }

  /**
   * Retrieve an intermediate step result
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {string} stepId - The step identifier
   * @returns {any|null} - The step result or null if not found
   */
  getStepResult(sessionId, queryId, stepId) {
    try {
      const key = this.generateKey(sessionId, 'steps', `${queryId}-${stepId}`);
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving step result:', error);
      return null;
    }
  }

  /**
   * Store the final reasoning result
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {any} result - The final result to store
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeFinalResult(sessionId, queryId, result, ttl) {
    try {
      const key = this.generateKey(sessionId, 'results', queryId);
      this.storeEntry(key, result, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing final result:', error);
      return false;
    }
  }

  /**
   * Retrieve a final reasoning result
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {any|null} - The final result or null if not found
   */
  getFinalResult(sessionId, queryId) {
    try {
      const key = this.generateKey(sessionId, 'results', queryId);
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving final result:', error);
      return null;
    }
  }

  /**
   * Store session context information
   * @param {string} sessionId - The session identifier
   * @param {Object} context - The context object to store
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeSessionContext(sessionId, context, ttl) {
    try {
      const key = this.generateKey(sessionId, 'context');
      this.storeEntry(key, context, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing session context:', error);
      return false;
    }
  }

  /**
   * Retrieve session context information
   * @param {string} sessionId - The session identifier
   * @returns {Object|null} - The context object or null if not found
   */
  getSessionContext(sessionId) {
    try {
      const key = this.generateKey(sessionId, 'context');
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving session context:', error);
      return null;
    }
  }

  /**
   * Update a specific field in the session context
   * @param {string} sessionId - The session identifier
   * @param {string} field - The field to update
   * @param {any} value - The new value
   * @returns {boolean} - Success indicator
   */
  updateSessionContextField(sessionId, field, value) {
    try {
      const key = this.generateKey(sessionId, 'context');
      const context = this.getEntry(key);
      
      if (!context) {
        return false;
      }
      
      context[field] = value;
      this.storeEntry(key, context);
      return true;
    } catch (error) {
      logger.error('Error updating session context field:', error);
      return false;
    }
  }

  /**
   * Link related queries together
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The current query identifier
   * @param {string} relatedQueryId - The related query identifier
   * @param {string} relationship - The relationship type (e.g., 'follow-up', 'refinement')
   * @returns {boolean} - Success indicator
   */
  linkQueries(sessionId, queryId, relatedQueryId, relationship) {
    try {
      const key = this.generateKey(sessionId, 'links', queryId);
      let links = this.getEntry(key) || [];
      
      links.push({
        queryId: relatedQueryId,
        relationship,
        timestamp: Date.now()
      });
      
      this.storeEntry(key, links);
      return true;
    } catch (error) {
      logger.error('Error linking queries:', error);
      return false;
    }
  }

  /**
   * Get all queries linked to a specific query
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {Array|null} - Array of linked queries or null if error
   */
  getLinkedQueries(sessionId, queryId) {
    try {
      const key = this.generateKey(sessionId, 'links', queryId);
      return this.getEntry(key) || [];
    } catch (error) {
      logger.error('Error retrieving linked queries:', error);
      return null;
    }
  }

  /**
   * Retrieve contextual information for follow-up queries
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {Object|null} - Combined context information or null if error
   */
  getContextForFollowUp(sessionId, queryId) {
    try {
      // Get session context
      const sessionContext = this.getSessionContext(sessionId) || {};
      
      // Get query-specific information
      const queryPlan = this.getQueryPlan(sessionId, queryId);
      const finalResult = this.getFinalResult(sessionId, queryId);
      
      // Get information from linked queries
      const linkedQueries = this.getLinkedQueries(sessionId, queryId);
      const linkedResults = {};
      
      if (linkedQueries && linkedQueries.length > 0) {
        for (const link of linkedQueries) {
          linkedResults[link.queryId] = {
            relationship: link.relationship,
            result: this.getFinalResult(sessionId, link.queryId)
          };
        }
      }
      
      // Combine all context
      return {
        sessionContext,
        queryInfo: queryPlan ? { plan: queryPlan, result: finalResult } : null,
        linkedQueries: linkedResults
      };
    } catch (error) {
      logger.error('Error retrieving follow-up context:', error);
      return null;
    }
  }

  /**
   * Clear all data for a specific session
   * @param {string} sessionId - The session identifier
   * @returns {boolean} - Success indicator
   */
  clearSessionData(sessionId) {
    try {
      const prefix = `${sessionId}:`;
      let count = 0;
      
      for (const key of this.storage.keys()) {
        if (key.startsWith(prefix)) {
          this.storage.delete(key);
          count++;
        }
      }
      
      logger.debug(`Cleared ${count} entries for session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Error clearing session data:', error);
      return false;
    }
  }

  /**
   * Store an entry in the memory with TTL
   * @param {string} key - The storage key
   * @param {any} value - The value to store
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @private
   */
  storeEntry(key, value, ttl) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.storage.set(key, {
      value: this.serialize(value),
      expiresAt
    });
  }

  /**
   * Retrieve an entry from memory
   * @param {string} key - The storage key
   * @returns {any|null} - The stored value or null if not found/expired
   * @private
   */
  getEntry(key) {
    const entry = this.storage.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return null;
    }
    
    return this.deserialize(entry.value);
  }

  /**
   * Generate a storage key
   * @param {string} sessionId - The session identifier
   * @param {string} type - The entry type
   * @param {string} id - Optional identifier
   * @returns {string} - The generated key
   * @private
   */
  generateKey(sessionId, type, id = '') {
    return `${sessionId}:${type}${id ? `:${id}` : ''}`;
  }

  /**
   * Serialize an object for storage
   * @param {any} value - The value to serialize
   * @returns {string} - Serialized value
   * @private
   */
  serialize(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Error serializing object:', error);
      throw new Error('Failed to serialize object for storage');
    }
  }

  /**
   * Deserialize a stored value
   * @param {string} serialized - The serialized value
   * @returns {any} - Deserialized value
   * @private
   */
  deserialize(serialized) {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      logger.error('Error deserializing stored value:', error);
      throw new Error('Failed to deserialize stored value');
    }
  }

  /**
   * Refreshes the TTL for a specific entry
   * @param {string} sessionId - The session identifier
   * @param {string} type - The entry type (plans, steps, results, etc.)
   * @param {string} id - The entry identifier
   * @param {number} ttl - Optional new TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  refreshTTL(sessionId, type, id, ttl) {
    try {
      const key = this.generateKey(sessionId, type, id);
      const entry = this.storage.get(key);
      
      if (!entry) {
        return false;
      }
      
      entry.expiresAt = Date.now() + (ttl || this.defaultTTL);
      return true;
    } catch (error) {
      logger.error('Error refreshing TTL:', error);
      return false;
    }
  }

  /**
   * Store entities mentioned in the conversation
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {Array} entities - Array of entity objects extracted from the query
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeEntityMentions(sessionId, queryId, entities, ttl) {
    try {
      if (!Array.isArray(entities)) {
        throw new Error('Entities must be an array');
      }

      // Process entities with timestamps and types
      const processedEntities = entities.map(entity => ({
        ...entity,
        mentionedAt: Date.now(),
        queryId
      }));

      // Get existing entity history
      const key = this.generateKey(sessionId, 'entities');
      let entityHistory = this.getEntry(key) || [];
      
      // Add new entities
      entityHistory = [...processedEntities, ...entityHistory];
      
      // Keep only the most recent entities up to the maximum size
      if (entityHistory.length > this.maxEntityHistorySize) {
        entityHistory = entityHistory.slice(0, this.maxEntityHistorySize);
      }
      
      this.storeEntry(key, entityHistory, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing entity mentions:', error);
      return false;
    }
  }

  /**
   * Get entities mentioned in the conversation
   * @param {string} sessionId - The session identifier
   * @param {Object} options - Options for filtering entities
   * @param {string} options.entityType - Filter by entity type
   * @param {number} options.limit - Maximum number of entities to return
   * @param {number} options.recency - Only return entities from last N milliseconds
   * @returns {Array|null} - Array of entity objects or null if error
   */
  getEntityMentions(sessionId, options = {}) {
    try {
      const key = this.generateKey(sessionId, 'entities');
      let entities = this.getEntry(key) || [];
      
      // Apply filters
      if (options.entityType) {
        entities = entities.filter(e => e.type === options.entityType);
      }
      
      if (options.recency) {
        const cutoffTime = Date.now() - options.recency;
        entities = entities.filter(e => e.mentionedAt >= cutoffTime);
      }
      
      // Apply limit
      if (options.limit && entities.length > options.limit) {
        entities = entities.slice(0, options.limit);
      }
      
      return entities;
    } catch (error) {
      logger.error('Error retrieving entity mentions:', error);
      return null;
    }
  }

  /**
   * Get the most recent entity mention of a specific type
   * @param {string} sessionId - The session identifier
   * @param {string} entityType - The entity type to find
   * @param {Object} options - Additional options
   * @param {number} options.recency - Only consider entities from last N milliseconds
   * @param {number} options.minConfidence - Minimum confidence threshold (0-1)
   * @returns {Object|null} - The most recent entity or null if not found
   */
  getLatestEntityOfType(sessionId, entityType, options = {}) {
    try {
      const entities = this.getEntityMentions(sessionId, {
        entityType,
        recency: options.recency,
        limit: 10 // Get a few in case we need to filter by confidence
      });
      
      if (!entities || entities.length === 0) {
        return null;
      }
      
      // Filter by confidence if specified
      let filteredEntities = entities;
      if (options.minConfidence) {
        filteredEntities = entities.filter(e => 
          (e.confidence || 0) >= options.minConfidence
        );
        
        if (filteredEntities.length === 0) {
          return null;
        }
      }
      
      // Return the most recent one (they should be sorted by recency already)
      return filteredEntities[0];
      
    } catch (error) {
      logger.error('Error retrieving latest entity of type:', error);
      return null;
    }
  }

  /**
   * Store retrieved knowledge items for a query
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {Array} knowledgeItems - The knowledge items retrieved
   * @param {Object} metadata - Metadata about the retrieval
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeRetrievedKnowledge(sessionId, queryId, knowledgeItems, metadata = {}, ttl) {
    try {
      if (!Array.isArray(knowledgeItems)) {
        throw new Error('Knowledge items must be an array');
      }

      const key = this.generateKey(sessionId, 'knowledge', queryId);
      
      // Limit the number of items stored
      const limitedItems = knowledgeItems.slice(0, this.maxKnowledgeItemsPerQuery);
      
      // Store with retrieval metadata
      const retrievalResult = {
        items: limitedItems,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          itemCount: knowledgeItems.length,
          storedItemCount: limitedItems.length
        }
      };
      
      this.storeEntry(key, retrievalResult, ttl);
      
      // Update retrieval history
      this.updateRetrievalHistory(sessionId, queryId, metadata);
      
      return true;
    } catch (error) {
      logger.error('Error storing retrieved knowledge:', error);
      return false;
    }
  }

  /**
   * Get retrieved knowledge items for a query
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {Object|null} - Knowledge items and metadata or null if not found/error
   */
  getRetrievedKnowledge(sessionId, queryId) {
    try {
      const key = this.generateKey(sessionId, 'knowledge', queryId);
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving knowledge items:', error);
      return null;
    }
  }

  /**
   * Update the retrieval history for a session
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {Object} metadata - Retrieval metadata
   * @private
   */
  updateRetrievalHistory(sessionId, queryId, metadata) {
    try {
      const historyKey = this.generateKey(sessionId, 'retrievalHistory');
      let history = this.getEntry(historyKey) || [];
      
      // Add new retrieval record
      history.unshift({
        queryId,
        timestamp: Date.now(),
        strategy: metadata.strategy,
        sources: metadata.sources,
        itemCount: metadata.itemCount || 0
      });
      
      // Limit history size
      if (history.length > this.maxRetrievalResultsHistory) {
        history = history.slice(0, this.maxRetrievalResultsHistory);
      }
      
      this.storeEntry(historyKey, history);
    } catch (error) {
      logger.error('Error updating retrieval history:', error);
    }
  }

  /**
   * Get the knowledge retrieval history for a session
   * @param {string} sessionId - The session identifier
   * @param {number} limit - Optional limit on number of history items
   * @returns {Array|null} - Retrieval history or null if error
   */
  getRetrievalHistory(sessionId, limit) {
    try {
      const historyKey = this.generateKey(sessionId, 'retrievalHistory');
      let history = this.getEntry(historyKey) || [];
      
      if (limit && history.length > limit) {
        history = history.slice(0, limit);
      }
      
      return history;
    } catch (error) {
      logger.error('Error retrieving retrieval history:', error);
      return null;
    }
  }

  /**
   * Store knowledge retrieval context for a query
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @param {Object} context - The retrieval context
   * @param {number} ttl - Optional custom TTL in milliseconds
   * @returns {boolean} - Success indicator
   */
  storeRetrievalContext(sessionId, queryId, context, ttl) {
    try {
      const key = this.generateKey(sessionId, 'retrievalContext', queryId);
      this.storeEntry(key, context, ttl);
      return true;
    } catch (error) {
      logger.error('Error storing retrieval context:', error);
      return false;
    }
  }

  /**
   * Get knowledge retrieval context for a query
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The query identifier
   * @returns {Object|null} - Retrieval context or null if not found/error
   */
  getRetrievalContext(sessionId, queryId) {
    try {
      const key = this.generateKey(sessionId, 'retrievalContext', queryId);
      return this.getEntry(key);
    } catch (error) {
      logger.error('Error retrieving retrieval context:', error);
      return null;
    }
  }

  /**
   * Get comprehensive context for knowledge retrieval
   * @param {string} sessionId - The session identifier
   * @param {string} queryId - The current query identifier
   * @param {Object} options - Additional options
   * @returns {Object} - Combined context information for knowledge retrieval
   */
  getKnowledgeRetrievalContext(sessionId, queryId, options = {}) {
    try {
      // Basic session context
      const sessionContext = this.getSessionContext(sessionId) || {};
      
      // Recently mentioned entities (last 10 by default)
      const recentEntities = this.getEntityMentions(sessionId, {
        limit: options.entityLimit || 10,
        recency: options.entityRecency || 15 * 60 * 1000 // 15 minutes by default
      });
      
      // Prior knowledge retrieval results (most recent 3 by default)
      const retrievalHistory = this.getRetrievalHistory(sessionId, options.historyLimit || 3);
      const priorKnowledge = {};
      
      if (retrievalHistory && retrievalHistory.length > 0) {
        for (const item of retrievalHistory) {
          if (item.queryId !== queryId) { // Don't include current query
            const knowledgeResult = this.getRetrievedKnowledge(sessionId, item.queryId);
            if (knowledgeResult) {
              priorKnowledge[item.queryId] = knowledgeResult;
            }
          }
        }
      }
      
      // Query links and relationships
      const linkedQueries = this.getLinkedQueries(sessionId, queryId);
      
      return {
        sessionContext,
        currentQuery: queryId,
        recentEntities,
        retrievalHistory,
        priorKnowledge,
        linkedQueries,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error building knowledge retrieval context:', error);
      return {
        error: 'Failed to build retrieval context',
        timestamp: Date.now()
      };
    }
  }
}

module.exports = WorkingMemoryService;