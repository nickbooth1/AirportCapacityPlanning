/**
 * Base Query Handler
 * 
 * This class serves as the base for all query handlers in the system.
 * It provides common functionality and interfaces that all query handlers should implement.
 */

class QueryHandlerBase {
  /**
   * Create a new query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    this.services = services;
    this.options = options;
    
    // Initialize common services needed by most handlers
    this.knowledgeServices = services.knowledgeServices || {};
    this.dataTransformer = this.knowledgeServices.DataTransformerService;
    this.cacheService = this.knowledgeServices.CacheService;
  }
  
  /**
   * Get the type of queries this handler can process
   * Should be overridden by subclasses
   * 
   * @returns {Array<string>} - Array of query types/intents this handler can process
   */
  getQueryTypes() {
    throw new Error('Method getQueryTypes() must be implemented by subclass');
  }
  
  /**
   * Check if this handler can handle the given query
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {string} parsedQuery.intent - The detected intent
   * @param {Object} parsedQuery.entities - The extracted entities
   * @param {Object} context - The conversation context
   * @returns {boolean} - True if this handler can process the query
   */
  canHandle(parsedQuery, context = {}) {
    // By default, check if the query intent matches any supported types
    const queryTypes = this.getQueryTypes();
    return queryTypes.includes(parsedQuery.intent);
  }
  
  /**
   * Handle the query and generate a response
   * Must be implemented by subclasses
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {string} parsedQuery.intent - The detected intent
   * @param {Object} parsedQuery.entities - The extracted entities
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The query response
   */
  async handleQuery(parsedQuery, context = {}) {
    throw new Error('Method handleQuery() must be implemented by subclass');
  }
  
  /**
   * Format the query response according to the expected output format
   * 
   * @param {Object} result - The raw query result
   * @param {string} format - The desired output format (e.g., 'simple', 'detailed')
   * @returns {Object} - The formatted response
   */
  formatResponse(result, format = 'simple') {
    // Default implementation, should be overridden by subclasses
    if (this.dataTransformer) {
      return result; // Subclasses should use appropriate transformer methods
    }
    return result;
  }
  
  /**
   * Generate a cache key for this query
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - The conversation context
   * @returns {string} - A cache key
   */
  generateCacheKey(parsedQuery, context = {}) {
    const queryType = parsedQuery.intent || 'unknown';
    const entitiesKey = JSON.stringify(parsedQuery.entities || {});
    const contextKey = context.id || 'no-context';
    
    return `query:${queryType}:${entitiesKey}:${contextKey}`;
  }
  
  /**
   * Try to get cached response for this query
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - The conversation context
   * @returns {Object|null} - The cached response or null if not found
   */
  getCachedResponse(parsedQuery, context = {}) {
    if (!this.cacheService) {
      return null;
    }
    
    const cacheKey = this.generateCacheKey(parsedQuery, context);
    return this.cacheService.getOperationalItem(cacheKey);
  }
  
  /**
   * Cache the response for this query
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - The conversation context
   * @param {Object} response - The response to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} - True if the caching was successful
   */
  cacheResponse(parsedQuery, context = {}, response, ttl = 300) {
    if (!this.cacheService) {
      return false;
    }
    
    const cacheKey = this.generateCacheKey(parsedQuery, context);
    return this.cacheService.setOperationalItem(cacheKey, response, ttl);
  }
  
  /**
   * Helper method to extract entity value with fallbacks
   * 
   * @param {Object} entities - The extracted entities
   * @param {string} entityName - The entity name to extract
   * @param {Array<string>} alternateNames - Alternate entity names to try
   * @param {*} defaultValue - Default value if entity is not found
   * @returns {*} - The entity value
   */
  getEntityValue(entities, entityName, alternateNames = [], defaultValue = null) {
    if (entities[entityName] !== undefined) {
      return entities[entityName];
    }
    
    // Try alternate names
    for (const altName of alternateNames) {
      if (entities[altName] !== undefined) {
        return entities[altName];
      }
    }
    
    return defaultValue;
  }
  
  /**
   * Helper to create a standardized error response
   * 
   * @param {string} message - The error message
   * @param {string} code - The error code
   * @param {Object} details - Additional error details
   * @returns {Object} - A standardized error response object
   */
  createErrorResponse(message, code = 'QUERY_ERROR', details = {}) {
    return {
      success: false,
      error: {
        message,
        code,
        details
      }
    };
  }
  
  /**
   * Helper to create a standardized success response
   * 
   * @param {Object} data - The response data
   * @param {Object} metadata - Additional metadata about the response
   * @returns {Object} - A standardized success response object
   */
  createSuccessResponse(data, metadata = {}) {
    return {
      success: true,
      data,
      metadata
    };
  }
}

module.exports = QueryHandlerBase;