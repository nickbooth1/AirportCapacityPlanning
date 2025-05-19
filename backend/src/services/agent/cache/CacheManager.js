/**
 * CacheManager.js
 * 
 * Centralized cache manager for the agent system.
 * Coordinates different caching strategies and provides
 * a unified interface for cache operations.
 */

const QueryCacheService = require('./QueryCacheService');
const logger = require('../../../utils/logger');

class CacheManager {
  /**
   * Initialize the cache manager
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      queryCacheOptions: options.queryCacheOptions || {},
      knowledgeCacheOptions: options.knowledgeCacheOptions || {
        maxCacheSize: 500,  // Smaller cache for knowledge items
        defaultTTL: 30 * 60 * 1000  // 30 minutes for knowledge items
      },
      resultCacheOptions: options.resultCacheOptions || {
        maxCacheSize: 200,  // Even smaller for final results
        defaultTTL: 10 * 60 * 1000  // 10 minutes for results
      },
      ...options
    };
    
    // Initialize specialized caches
    this.queryCache = new QueryCacheService({
      ...this.options.queryCacheOptions,
      enableCache: this.options.enabled
    });
    
    this.knowledgeCache = new QueryCacheService({
      ...this.options.knowledgeCacheOptions,
      enableCache: this.options.enabled
    });
    
    this.resultCache = new QueryCacheService({
      ...this.options.resultCacheOptions,
      enableCache: this.options.enabled
    });
    
    // Store references to all caches for management
    this.caches = {
      query: this.queryCache,
      knowledge: this.knowledgeCache,
      result: this.resultCache
    };
    
    // Performance metrics
    this.metrics = {
      requestsServed: 0,
      requestsFromCache: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      cacheHitRatio: 0
    };
    
    logger.info(`CacheManager initialized, enabled: ${this.options.enabled}`);
  }
  
  /**
   * Generate a cache key for a specific cache type
   * 
   * @param {string} cacheType - The type of cache (query, knowledge, result)
   * @param {Object|string} query - The query to generate a key for
   * @param {Object} options - Key generation options
   * @returns {string} - The generated cache key
   */
  generateKey(cacheType, query, options = {}) {
    // Get the appropriate cache service
    const cache = this.caches[cacheType];
    if (!cache) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
    
    // Add cache type prefix to ensure no collisions between cache types
    const key = cache.generateKey(query, options);
    return `${cacheType}:${key}`;
  }
  
  /**
   * Cache a query and its response
   * 
   * @param {string} cacheType - The type of cache (query, knowledge, result)
   * @param {Object|string} query - The query that was executed
   * @param {any} response - The response to cache
   * @param {Object} options - Cache options
   * @returns {boolean} - Whether the response was successfully cached
   */
  cacheResponse(cacheType, query, response, options = {}) {
    if (!this.options.enabled) return false;
    
    // Get the appropriate cache service
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return false;
    }
    
    // Generate key and store the response
    const key = this.generateKey(cacheType, query, options.keyOptions);
    
    // Cache metadata can be useful for debugging and invalidation
    const metadata = {
      timestamp: Date.now(),
      queryType: typeof query === 'string' ? 'string' : 'object',
      cacheType,
      responseType: typeof response,
      ...(options.metadata || {})
    };
    
    return cache.set(key, response, {
      ttl: options.ttl,
      metadata
    });
  }
  
  /**
   * Retrieve a cached response for a query
   * 
   * @param {string} cacheType - The type of cache (query, knowledge, result)
   * @param {Object|string} query - The query to get a response for
   * @param {Object} options - Get options
   * @returns {any|null} - The cached response or null if not found
   */
  getCachedResponse(cacheType, query, options = {}) {
    if (!this.options.enabled) return null;
    
    // Get the appropriate cache service
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return null;
    }
    
    // Generate key and retrieve the response
    const key = this.generateKey(cacheType, query, options.keyOptions);
    const response = cache.get(key);
    
    // Update performance metrics
    if (response !== null) {
      this.metrics.requestsFromCache++;
    }
    this.metrics.requestsServed++;
    this.metrics.cacheHitRatio = this.metrics.requestsFromCache / this.metrics.requestsServed;
    
    return response;
  }
  
  /**
   * Check if a response is cached
   * 
   * @param {string} cacheType - The type of cache (query, knowledge, result)
   * @param {Object|string} query - The query to check
   * @param {Object} options - Check options
   * @returns {boolean} - Whether a cached response exists
   */
  hasCachedResponse(cacheType, query, options = {}) {
    if (!this.options.enabled) return false;
    
    // Get the appropriate cache service
    const cache = this.caches[cacheType];
    if (!cache) return false;
    
    // Generate key and check if it exists
    const key = this.generateKey(cacheType, query, options.keyOptions);
    return cache.has(key);
  }
  
  /**
   * Invalidate cache entries based on criteria
   * 
   * @param {string} cacheType - The type of cache to invalidate (or 'all')
   * @param {Function} predicate - Function that returns true for entries to invalidate
   * @returns {number} - Number of entries invalidated
   */
  invalidateCache(cacheType, predicate) {
    if (!this.options.enabled) return 0;
    
    let totalInvalidated = 0;
    
    if (cacheType === 'all') {
      // Invalidate across all caches
      Object.values(this.caches).forEach(cache => {
        totalInvalidated += cache.invalidate(predicate);
      });
    } else if (this.caches[cacheType]) {
      // Invalidate in a specific cache
      totalInvalidated = this.caches[cacheType].invalidate(predicate);
    } else {
      logger.warn(`Invalid cache type for invalidation: ${cacheType}`);
    }
    
    return totalInvalidated;
  }
  
  /**
   * Clear a specific cache or all caches
   * 
   * @param {string} cacheType - The type of cache to clear (or 'all')
   */
  clearCache(cacheType = 'all') {
    if (cacheType === 'all') {
      Object.values(this.caches).forEach(cache => {
        cache.clear();
      });
      logger.info('All caches cleared');
    } else if (this.caches[cacheType]) {
      this.caches[cacheType].clear();
      logger.info(`Cache cleared: ${cacheType}`);
    } else {
      logger.warn(`Invalid cache type to clear: ${cacheType}`);
    }
  }
  
  /**
   * Run cleanup on all caches
   * 
   * @returns {Object} - Number of entries removed from each cache
   */
  cleanup() {
    const results = {};
    
    Object.entries(this.caches).forEach(([type, cache]) => {
      results[type] = cache.cleanup();
    });
    
    return results;
  }
  
  /**
   * Get cache statistics
   * 
   * @returns {Object} - Combined cache statistics
   */
  getStats() {
    const stats = {
      overall: {
        enabled: this.options.enabled,
        ...this.metrics
      }
    };
    
    // Get stats from each cache
    Object.entries(this.caches).forEach(([type, cache]) => {
      stats[type] = cache.getStats();
    });
    
    return stats;
  }
  
  /**
   * Update performance metrics with a response time
   * 
   * @param {number} responseTime - The response time in milliseconds
   * @param {boolean} fromCache - Whether the response came from cache
   */
  updateMetrics(responseTime, fromCache) {
    this.metrics.totalResponseTime += responseTime;
    this.metrics.requestsServed++;
    
    if (fromCache) {
      this.metrics.requestsFromCache++;
    }
    
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requestsServed;
    this.metrics.cacheHitRatio = this.metrics.requestsFromCache / this.metrics.requestsServed;
  }
  
  /**
   * Enable or disable the cache
   * 
   * @param {boolean} enabled - Whether to enable caching
   */
  setEnabled(enabled) {
    this.options.enabled = !!enabled;
    
    // Update all caches
    Object.values(this.caches).forEach(cache => {
      cache.options.enableCache = this.options.enabled;
    });
    
    logger.info(`CacheManager ${this.options.enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Destroy all caches and clean up resources
   */
  destroy() {
    Object.values(this.caches).forEach(cache => {
      cache.destroy();
    });
    
    this.caches = {};
    logger.info('CacheManager destroyed');
  }
}

module.exports = CacheManager;