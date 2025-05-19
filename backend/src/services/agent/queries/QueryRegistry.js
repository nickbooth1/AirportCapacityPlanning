/**
 * Query Registry
 * 
 * This class maintains a registry of query handlers and provides
 * methods to register handlers and find appropriate handlers for specific queries.
 */

class QueryRegistry {
  /**
   * Create a new query registry
   * 
   * @param {Object} services - The service dependencies to pass to handlers
   * @param {Object} options - Additional options for the registry
   */
  constructor(services = {}, options = {}) {
    this.services = services;
    this.options = options;
    this.handlers = [];
    this.handlersByType = new Map();
    this.logger = services.logger || console;
  }
  
  /**
   * Register a new query handler
   * 
   * @param {Class} HandlerClass - The query handler class (not instance)
   * @param {Object} handlerOptions - Options to pass to the handler constructor
   * @returns {QueryRegistry} - This registry instance for chaining
   */
  registerHandler(HandlerClass, handlerOptions = {}) {
    try {
      // Create an instance of the handler
      const handler = new HandlerClass(this.services, handlerOptions);
      
      // Get the query types this handler can handle
      const queryTypes = handler.getQueryTypes();
      
      if (!Array.isArray(queryTypes) || queryTypes.length === 0) {
        this.logger.warn(`Handler ${HandlerClass.name} does not specify any query types`);
        return this;
      }
      
      // Add the handler to our list
      this.handlers.push(handler);
      
      // Register the handler for each query type it supports
      for (const queryType of queryTypes) {
        if (!this.handlersByType.has(queryType)) {
          this.handlersByType.set(queryType, []);
        }
        
        this.handlersByType.get(queryType).push(handler);
      }
      
      this.logger.info(`Registered handler ${HandlerClass.name} for query types: ${queryTypes.join(', ')}`);
      
      return this;
    } catch (error) {
      this.logger.error(`Failed to register handler ${HandlerClass.name}: ${error.message}`);
      return this;
    }
  }
  
  /**
   * Register multiple handlers at once
   * 
   * @param {Array<Object>} handlersConfig - Array of handler configurations
   * @param {Class} handlersConfig[].HandlerClass - The handler class
   * @param {Object} handlersConfig[].options - The handler options
   * @returns {QueryRegistry} - This registry instance for chaining
   */
  registerHandlers(handlersConfig) {
    if (!Array.isArray(handlersConfig)) {
      this.logger.error('registerHandlers expects an array of handler configs');
      return this;
    }
    
    for (const config of handlersConfig) {
      if (config.HandlerClass) {
        this.registerHandler(config.HandlerClass, config.options || {});
      }
    }
    
    return this;
  }
  
  /**
   * Find handlers that can process the given query
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {string} parsedQuery.intent - The detected intent
   * @param {Object} parsedQuery.entities - The extracted entities
   * @param {Object} context - The conversation context
   * @returns {Array} - Array of handlers that can process this query
   */
  findHandlers(parsedQuery, context = {}) {
    const { intent } = parsedQuery;
    
    // First try to find handlers specifically registered for this intent
    if (intent && this.handlersByType.has(intent)) {
      const typeHandlers = this.handlersByType.get(intent);
      
      // Filter handlers by calling their canHandle method
      const matchingHandlers = typeHandlers.filter(handler => 
        handler.canHandle(parsedQuery, context)
      );
      
      if (matchingHandlers.length > 0) {
        return matchingHandlers;
      }
    }
    
    // If no specific handlers found, or no intent specified,
    // try all handlers and see which ones can handle this query
    return this.handlers.filter(handler => 
      handler.canHandle(parsedQuery, context)
    );
  }
  
  /**
   * Process a query using the registered handlers
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {string} parsedQuery.intent - The detected intent
   * @param {Object} parsedQuery.entities - The extracted entities
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The query response
   */
  async processQuery(parsedQuery, context = {}) {
    // Find handlers that can process this query
    const handlers = this.findHandlers(parsedQuery, context);
    
    if (handlers.length === 0) {
      return {
        success: false,
        error: {
          message: 'No handler found for this query',
          code: 'NO_HANDLER',
          details: { intent: parsedQuery.intent }
        }
      };
    }
    
    // Use the first matching handler (in the future we might want to combine results)
    const handler = handlers[0];
    
    try {
      // Check for cached response
      const cachedResponse = handler.getCachedResponse(parsedQuery, context);
      if (cachedResponse) {
        return {
          ...cachedResponse,
          metadata: {
            ...(cachedResponse.metadata || {}),
            fromCache: true
          }
        };
      }
      
      // Process the query
      const response = await handler.handleQuery(parsedQuery, context);
      
      // Cache the response if applicable
      if (response.success && this.options.enableQueryCache !== false) {
        handler.cacheResponse(parsedQuery, context, response);
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`, error);
      
      return {
        success: false,
        error: {
          message: `Failed to process query: ${error.message}`,
          code: 'QUERY_PROCESSING_ERROR',
          details: { intent: parsedQuery.intent }
        }
      };
    }
  }
  
  /**
   * Get all registered handlers
   * 
   * @returns {Array} - Array of all registered handlers
   */
  getAllHandlers() {
    return [...this.handlers];
  }
  
  /**
   * Get statistics about the registered handlers
   * 
   * @returns {Object} - Stats about registered handlers
   */
  getStats() {
    const queryTypeCount = this.handlersByType.size;
    const handlerCount = this.handlers.length;
    
    const queryTypeStats = {};
    for (const [queryType, handlers] of this.handlersByType.entries()) {
      queryTypeStats[queryType] = handlers.length;
    }
    
    return {
      totalHandlers: handlerCount,
      totalQueryTypes: queryTypeCount,
      queryTypes: queryTypeStats
    };
  }
}

module.exports = QueryRegistry;