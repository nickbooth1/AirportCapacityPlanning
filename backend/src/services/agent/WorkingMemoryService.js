/**
 * WorkingMemoryService.js
 * 
 * This service maintains state during multi-turn interactions and complex reasoning processes.
 * It provides short-term memory capabilities for the agent, storing query plans, intermediate results,
 * and final reasoning outcomes with a configurable time-to-live (TTL).
 */

const logger = require('../../utils/logger');

class WorkingMemoryService {
  constructor(options = {}) {
    // Initialize memory storage with default TTL of 30 minutes (in milliseconds)
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; 
    this.storage = new Map();
    
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
}

module.exports = WorkingMemoryService;