/**
 * Cache Service
 * 
 * Provides caching functionality for knowledge base data with:
 * - In-memory LRU cache with TTL (Time To Live)
 * - Cache invalidation strategies
 * - Cache hit/miss statistics
 */

const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    // Create separate caches for different types of data with different TTLs
    
    // Cache for configuration data that rarely changes (1 hour TTL)
    this.configCache = new NodeCache({
      stdTTL: 3600, // 1 hour in seconds
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // For better performance, especially with large objects
    });
    
    // Cache for operational data that changes more frequently (5 minutes TTL)
    this.operationalCache = new NodeCache({
      stdTTL: 300, // 5 minutes in seconds
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });
    
    // Cache for statistics and aggregated data (10 minutes TTL)
    this.statsCache = new NodeCache({
      stdTTL: 600, // 10 minutes in seconds
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });
    
    // Track cache statistics
    this.stats = {
      configHits: 0,
      configMisses: 0,
      operationalHits: 0,
      operationalMisses: 0,
      statsHits: 0,
      statsMisses: 0
    };
    
    // Set up event listeners for monitoring
    this._setupEventListeners();
  }
  
  /**
   * Set up event listeners for cache events
   * 
   * @private
   */
  _setupEventListeners() {
    // Listen for expired keys
    this.configCache.on('expired', (key, value) => {
      console.log(`Config cache key expired: ${key}`);
    });
    
    this.operationalCache.on('expired', (key, value) => {
      console.log(`Operational cache key expired: ${key}`);
    });
    
    this.statsCache.on('expired', (key, value) => {
      console.log(`Stats cache key expired: ${key}`);
    });
  }
  
  /**
   * Get an item from the configuration cache
   * 
   * @param {string} key - The cache key
   * @returns {*} - The cached item or undefined if not found
   */
  getConfigItem(key) {
    const value = this.configCache.get(key);
    if (value !== undefined) {
      this.stats.configHits++;
      return value;
    }
    this.stats.configMisses++;
    return undefined;
  }
  
  /**
   * Set an item in the configuration cache
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   * @param {number} ttl - Optional TTL in seconds (overrides default)
   * @returns {boolean} - True if successful
   */
  setConfigItem(key, value, ttl = undefined) {
    return this.configCache.set(key, value, ttl);
  }
  
  /**
   * Get an item from the operational cache
   * 
   * @param {string} key - The cache key
   * @returns {*} - The cached item or undefined if not found
   */
  getOperationalItem(key) {
    const value = this.operationalCache.get(key);
    if (value !== undefined) {
      this.stats.operationalHits++;
      return value;
    }
    this.stats.operationalMisses++;
    return undefined;
  }
  
  /**
   * Set an item in the operational cache
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   * @param {number} ttl - Optional TTL in seconds (overrides default)
   * @returns {boolean} - True if successful
   */
  setOperationalItem(key, value, ttl = undefined) {
    return this.operationalCache.set(key, value, ttl);
  }
  
  /**
   * Get an item from the statistics cache
   * 
   * @param {string} key - The cache key
   * @returns {*} - The cached item or undefined if not found
   */
  getStatsItem(key) {
    const value = this.statsCache.get(key);
    if (value !== undefined) {
      this.stats.statsHits++;
      return value;
    }
    this.stats.statsMisses++;
    return undefined;
  }
  
  /**
   * Set an item in the statistics cache
   * 
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   * @param {number} ttl - Optional TTL in seconds (overrides default)
   * @returns {boolean} - True if successful
   */
  setStatsItem(key, value, ttl = undefined) {
    return this.statsCache.set(key, value, ttl);
  }
  
  /**
   * Invalidate a specific key in all caches
   * 
   * @param {string} key - The cache key to invalidate
   */
  invalidateKey(key) {
    this.configCache.del(key);
    this.operationalCache.del(key);
    this.statsCache.del(key);
  }
  
  /**
   * Invalidate all keys with a specific prefix in all caches
   * 
   * @param {string} prefix - The prefix to match
   */
  invalidateByPrefix(prefix) {
    const invalidateKeysWithPrefix = (cache, prefix) => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          cache.del(key);
        }
      });
    };
    
    invalidateKeysWithPrefix(this.configCache, prefix);
    invalidateKeysWithPrefix(this.operationalCache, prefix);
    invalidateKeysWithPrefix(this.statsCache, prefix);
  }
  
  /**
   * Invalidate all keys in a specific cache
   * 
   * @param {string} cacheType - The cache type ('config', 'operational', or 'stats')
   */
  flushCache(cacheType) {
    switch (cacheType) {
      case 'config':
        this.configCache.flushAll();
        break;
      case 'operational':
        this.operationalCache.flushAll();
        break;
      case 'stats':
        this.statsCache.flushAll();
        break;
      default:
        // Flush all caches if no specific type is provided
        this.configCache.flushAll();
        this.operationalCache.flushAll();
        this.statsCache.flushAll();
        break;
    }
  }
  
  /**
   * Get cache statistics
   * 
   * @returns {Object} - Cache statistics
   */
  getStatistics() {
    return {
      config: {
        hits: this.stats.configHits,
        misses: this.stats.configMisses,
        hitRate: this._calculateHitRate(this.stats.configHits, this.stats.configMisses),
        keys: this.configCache.keys().length,
        memoryUsage: this._estimateMemoryUsage(this.configCache)
      },
      operational: {
        hits: this.stats.operationalHits,
        misses: this.stats.operationalMisses,
        hitRate: this._calculateHitRate(this.stats.operationalHits, this.stats.operationalMisses),
        keys: this.operationalCache.keys().length,
        memoryUsage: this._estimateMemoryUsage(this.operationalCache)
      },
      stats: {
        hits: this.stats.statsHits,
        misses: this.stats.statsMisses,
        hitRate: this._calculateHitRate(this.stats.statsHits, this.stats.statsMisses),
        keys: this.statsCache.keys().length,
        memoryUsage: this._estimateMemoryUsage(this.statsCache)
      }
    };
  }
  
  /**
   * Calculate hit rate percentage
   * 
   * @private
   * @param {number} hits - Number of cache hits
   * @param {number} misses - Number of cache misses
   * @returns {number} - Hit rate percentage
   */
  _calculateHitRate(hits, misses) {
    const total = hits + misses;
    if (total === 0) return 0;
    return parseFloat(((hits / total) * 100).toFixed(2));
  }
  
  /**
   * Estimate memory usage of a cache (rough approximation)
   * 
   * @private
   * @param {NodeCache} cache - The cache to estimate
   * @returns {string} - Human-readable memory usage
   */
  _estimateMemoryUsage(cache) {
    // This is a very rough approximation, as JS doesn't provide exact memory usage
    let totalSize = 0;
    const keys = cache.keys();
    
    keys.forEach(key => {
      const item = cache.get(key);
      if (item) {
        totalSize += key.length * 2; // Key size (Unicode = 2 bytes per char)
        
        if (typeof item === 'string') {
          totalSize += item.length * 2; // String (Unicode = 2 bytes per char)
        } else if (typeof item === 'number') {
          totalSize += 8; // Number (8 bytes)
        } else if (typeof item === 'boolean') {
          totalSize += 4; // Boolean (4 bytes)
        } else if (Array.isArray(item) || typeof item === 'object') {
          totalSize += JSON.stringify(item).length * 2; // Rough approximation
        }
      }
    });
    
    // Convert to human-readable format
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

module.exports = new CacheService();