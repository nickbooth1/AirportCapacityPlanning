/**
 * QueryCacheService.js
 * 
 * Caching service for agent queries and responses to improve performance.
 * Implements a TTL-based LRU (Least Recently Used) cache with key generation
 * for different types of queries.
 */

const crypto = require('crypto');
const logger = require('../../../utils/logger');

class QueryCacheService {
  /**
   * Initialize the query cache service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Cache configuration
    this.options = {
      maxCacheSize: options.maxCacheSize || 1000, // Maximum number of cache entries
      defaultTTL: options.defaultTTL || 15 * 60 * 1000, // 15 minutes in milliseconds
      minHashLength: options.minHashLength || 8, // Minimum length for hash keys
      enableCache: options.enableCache !== false, // Cache enabled by default
      ...options
    };
    
    // Initialize the cache store
    this.cache = new Map();
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      entries: 0,
      oldestEntry: null,
      newestEntry: null,
      totalQueries: 0,
      totalCacheTime: 0,
      avgCacheTime: 0
    };
    
    // LRU tracking - most recently used keys are at the end of the array
    this.lruList = [];
    
    logger.info(`QueryCacheService initialized with max size: ${this.options.maxCacheSize}, TTL: ${this.options.defaultTTL}ms`);
    
    // Set up cleanup interval if enabled
    if (this.options.enableCleanup !== false) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 
        this.options.cleanupInterval || 5 * 60 * 1000); // 5 minutes by default
      
      // Ensure cleanup interval doesn't prevent the process from exiting
      this.cleanupInterval.unref();
    }
  }
  
  /**
   * Generate a cache key for the given query
   * 
   * @param {Object} query - The query object or string
   * @param {Object} options - Key generation options
   * @returns {string} - The generated cache key
   */
  generateKey(query, options = {}) {
    const {
      includeEntities = true,
      includeIntent = true,
      includeContext = false,
      contextFields = ['sessionId'],
      normalizeWhitespace = true
    } = options;
    
    // Handle string queries vs. objects
    let keyData;
    if (typeof query === 'string') {
      // Simple string query
      keyData = normalizeWhitespace ? 
        query.trim().replace(/\s+/g, ' ').toLowerCase() : query;
    } else {
      // For query objects
      const keyParts = [];
      
      // Add query text
      if (query.text) {
        keyParts.push(normalizeWhitespace ? 
          query.text.trim().replace(/\s+/g, ' ').toLowerCase() : query.text);
      }
      
      // Add intent if requested and available
      if (includeIntent && query.parsedQuery && query.parsedQuery.intent) {
        keyParts.push(`intent:${query.parsedQuery.intent}`);
      }
      
      // Add entities if requested and available
      if (includeEntities && query.parsedQuery && query.parsedQuery.entities) {
        const entityStr = Object.entries(query.parsedQuery.entities)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([key, value]) => `${key}=${value}`)
          .join(',');
        
        if (entityStr) keyParts.push(`entities:[${entityStr}]`);
      }
      
      // Add context if requested and available
      if (includeContext && query.context) {
        const contextStr = contextFields.map(field => 
          query.context[field] ? `${field}=${query.context[field]}` : null
        ).filter(Boolean).join(',');
        
        if (contextStr) keyParts.push(`context:[${contextStr}]`);
      }
      
      keyData = keyParts.join('|');
    }
    
    // Generate hash from the key data
    const hash = crypto.createHash('sha256').update(keyData).digest('hex');
    
    // Return a shortened version of the hash for better readability and storage
    return hash.substring(0, Math.max(this.options.minHashLength, 16));
  }
  
  /**
   * Set a value in the cache
   * 
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {Object} options - Cache entry options
   * @returns {boolean} - Whether the value was successfully cached
   */
  set(key, value, options = {}) {
    if (!this.options.enableCache) return false;
    
    const ttl = options.ttl || this.options.defaultTTL;
    const timestamp = Date.now();
    const expiry = timestamp + ttl;
    
    // Check if we need to evict entries before adding new one
    if (this.cache.size >= this.options.maxCacheSize && !this.cache.has(key)) {
      this._evictLRU();
    }
    
    // Store the entry
    this.cache.set(key, {
      value,
      expiry,
      timestamp,
      hits: 0,
      metadata: options.metadata || {}
    });
    
    // Update LRU tracking - moved to most recently used
    this._updateLRU(key);
    
    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.newestEntry = timestamp;
    if (!this.stats.oldestEntry || this.stats.oldestEntry > timestamp) {
      this.stats.oldestEntry = timestamp;
    }
    
    logger.debug(`Cache SET: key=${key}, expires=${new Date(expiry).toISOString()}`);
    return true;
  }
  
  /**
   * Get a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {any|null} - The cached value or null if not found/expired
   */
  get(key) {
    if (!this.options.enableCache) return null;
    
    this.stats.totalQueries++;
    
    // Check if the key exists
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Check if the entry has expired
    if (entry.expiry <= now) {
      this.cache.delete(key);
      this.lruList = this.lruList.filter(k => k !== key);
      this.stats.entries = this.cache.size;
      this.stats.misses++;
      
      logger.debug(`Cache MISS (expired): key=${key}`);
      return null;
    }
    
    // Update hit statistics
    entry.hits++;
    this.stats.hits++;
    
    // Calculate cache time and update stats
    const cacheTime = now - entry.timestamp;
    this.stats.totalCacheTime += cacheTime;
    this.stats.avgCacheTime = this.stats.totalCacheTime / this.stats.hits;
    
    // Update LRU tracking - moved to most recently used
    this._updateLRU(key);
    
    logger.debug(`Cache HIT: key=${key}, age=${cacheTime}ms, hits=${entry.hits}`);
    return entry.value;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param {string} key - The cache key
   * @returns {boolean} - Whether the key exists and is valid
   */
  has(key) {
    if (!this.options.enableCache || !this.cache.has(key)) return false;
    
    const entry = this.cache.get(key);
    return entry.expiry > Date.now();
  }
  
  /**
   * Delete a key from the cache
   * 
   * @param {string} key - The cache key to delete
   * @returns {boolean} - Whether the key was deleted
   */
  delete(key) {
    if (!this.cache.has(key)) return false;
    
    this.cache.delete(key);
    this.lruList = this.lruList.filter(k => k !== key);
    this.stats.entries = this.cache.size;
    
    logger.debug(`Cache DELETE: key=${key}`);
    return true;
  }
  
  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
    this.lruList = [];
    this.stats.entries = 0;
    this.stats.oldestEntry = null;
    this.stats.newestEntry = null;
    
    logger.info('Cache CLEARED');
  }
  
  /**
   * Clean up expired entries
   * 
   * @returns {number} - Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removedCount = 0;
    
    // Find all expired keys
    const expiredKeys = [];
    this.cache.forEach((entry, key) => {
      if (entry.expiry <= now) {
        expiredKeys.push(key);
      }
    });
    
    // Remove expired entries
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      removedCount++;
    });
    
    // Update LRU list
    this.lruList = this.lruList.filter(key => !expiredKeys.includes(key));
    
    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.evictions += removedCount;
    
    if (removedCount > 0) {
      logger.debug(`Cache cleanup removed ${removedCount} expired entries`);
    }
    
    return removedCount;
  }
  
  /**
   * Get stats about the cache usage
   * 
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.options.maxCacheSize,
      hitRatio: this.stats.totalQueries > 0 ? 
        this.stats.hits / this.stats.totalQueries : 0,
      enabled: this.options.enableCache
    };
  }
  
  /**
   * Update the LRU tracking for a key
   * 
   * @private
   * @param {string} key - The cache key to update
   */
  _updateLRU(key) {
    // Remove the key from its current position
    this.lruList = this.lruList.filter(k => k !== key);
    
    // Add the key to the end (most recently used)
    this.lruList.push(key);
  }
  
  /**
   * Evict the least recently used entry
   * 
   * @private
   * @returns {boolean} - Whether an entry was evicted
   */
  _evictLRU() {
    if (this.lruList.length === 0) return false;
    
    // Get the least recently used key
    const lruKey = this.lruList[0];
    
    // Remove it from the cache
    this.cache.delete(lruKey);
    
    // Remove it from the LRU list
    this.lruList.shift();
    
    // Update stats
    this.stats.evictions++;
    this.stats.entries = this.cache.size;
    
    logger.debug(`Cache EVICT (LRU): key=${lruKey}`);
    return true;
  }
  
  /**
   * Invalidate cache entries based on a predicate function
   * 
   * @param {Function} predicate - Function that takes a cache entry and returns true if it should be invalidated
   * @returns {number} - Number of entries invalidated
   */
  invalidate(predicate) {
    if (typeof predicate !== 'function') return 0;
    
    const keysToInvalidate = [];
    
    // Find keys to invalidate
    this.cache.forEach((entry, key) => {
      if (predicate(entry, key)) {
        keysToInvalidate.push(key);
      }
    });
    
    // Remove the entries
    keysToInvalidate.forEach(key => {
      this.cache.delete(key);
    });
    
    // Update LRU list
    this.lruList = this.lruList.filter(key => !keysToInvalidate.includes(key));
    
    // Update stats
    this.stats.entries = this.cache.size;
    
    logger.debug(`Cache INVALIDATE: removed ${keysToInvalidate.length} entries`);
    return keysToInvalidate.length;
  }
  
  /**
   * Destroy the cache service and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
    logger.info('QueryCacheService destroyed');
  }
}

module.exports = QueryCacheService;