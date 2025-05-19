/**
 * Reference Data Query Handler Base Class
 * 
 * This class serves as the base for all reference data query handlers.
 * It provides common functionality for handling reference data queries.
 */
const QueryHandlerBase = require('../../QueryHandlerBase');

class ReferenceDataQueryHandler extends QueryHandlerBase {
  /**
   * Create a new reference data query handler
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the handler
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Reference to the reference data service
    this.referenceDataService = this.services.referenceDataService || 
      this.knowledgeServices.ReferenceDataService;
      
    if (!this.referenceDataService) {
      console.warn('ReferenceDataService not available for ReferenceDataQueryHandler');
    }
    
    // Reference data type - should be overridden by subclasses
    this.dataType = options.dataType || 'generic';
    
    // Common entity names for lookups
    this.identifierKeys = options.identifierKeys || ['id', 'code', 'name'];
    this.formatKey = options.formatKey || 'format';
    this.limitKey = options.limitKey || 'limit';
    
    // Default format and limit values
    this.defaultFormat = options.defaultFormat || 'detailed';
    this.defaultLimit = options.defaultLimit || 10;
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
   * Check if service is available
   * 
   * @returns {boolean} - True if the required service is available
   */
  isServiceAvailable() {
    return !!this.referenceDataService;
  }
  
  /**
   * Check if this handler can handle the given query
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {Object} context - The conversation context
   * @returns {boolean} - True if this handler can process the query
   */
  canHandle(parsedQuery, context = {}) {
    // Check for basic intent match using parent method
    if (!super.canHandle(parsedQuery, context)) {
      return false;
    }
    
    // Service must be available
    if (!this.isServiceAvailable()) {
      return false;
    }
    
    // Each subclass should implement specific handling logic
    return true;
  }
  
  /**
   * Handle a query by type
   * 
   * @param {Object} parsedQuery - The parsed query object
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The query response
   */
  async handleQuery(parsedQuery, context = {}) {
    try {
      // Check cache first
      const cachedResponse = this.getCachedResponse(parsedQuery, context);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Verify service is available
      if (!this.isServiceAvailable()) {
        return this.createErrorResponse(
          'Reference data service not available',
          'SERVICE_UNAVAILABLE'
        );
      }
      
      // Process the query based on intent
      let result;
      try {
        result = await this.processQuery(parsedQuery, context);
      } catch (error) {
        return this.createErrorResponse(
          `Error processing reference data query: ${error.message}`,
          'PROCESSING_ERROR',
          { originalError: error.message }
        );
      }
      
      // Cache the result
      this.cacheResponse(parsedQuery, context, result);
      
      return result;
    } catch (error) {
      return this.createErrorResponse(
        `Unexpected error in reference data query handler: ${error.message}`,
        'HANDLER_ERROR',
        { originalError: error.message }
      );
    }
  }
  
  /**
   * Process a query - must be implemented by subclasses
   * 
   * @param {Object} parsedQuery - The parsed query
   * @param {Object} context - The conversation context
   * @returns {Promise<Object>} - The formatted response
   */
  async processQuery(parsedQuery, context = {}) {
    throw new Error('Method processQuery() must be implemented by subclass');
  }
  
  /**
   * Extract an identifier from the entities
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {*} - The extracted identifier or null
   */
  extractIdentifier(entities) {
    for (const key of this.identifierKeys) {
      if (entities[key] !== undefined) {
        return entities[key];
      }
    }
    return null;
  }
  
  /**
   * Extract format from the entities
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {string} - The extracted format or default
   */
  extractFormat(entities) {
    return this.getEntityValue(
      entities,
      this.formatKey,
      ['responseFormat', 'detailLevel'],
      this.defaultFormat
    );
  }
  
  /**
   * Extract limit from the entities
   * 
   * @param {Object} entities - The entities from the parsed query
   * @returns {number} - The extracted limit or default
   */
  extractLimit(entities) {
    const limit = this.getEntityValue(
      entities,
      this.limitKey,
      ['maxResults', 'count'],
      this.defaultLimit
    );
    
    // Ensure limit is a number
    return typeof limit === 'number' ? limit : parseInt(limit, 10) || this.defaultLimit;
  }
  
  /**
   * Format reference data based on the requested format
   * 
   * @param {Object|Array} data - The data to format
   * @param {string} format - The format to use ('simple', 'summary', 'detailed')
   * @returns {Object|Array} - The formatted data
   */
  formatReferenceData(data, format = 'detailed') {
    // Use data transformer if available
    if (this.dataTransformer && typeof this.dataTransformer.transformReferenceData === 'function') {
      return this.dataTransformer.transformReferenceData(data, this.dataType, format);
    }
    
    // Default implementation - should be overridden by subclasses
    return data;
  }
  
  /**
   * Create a standardized response for a single item
   * 
   * @param {Object} item - The item data
   * @param {string} format - The format to use
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - The formatted response
   */
  createItemResponse(item, format = 'detailed', metadata = {}) {
    if (!item) {
      return this.createErrorResponse(
        `${this.dataType} not found`,
        'NOT_FOUND',
        metadata
      );
    }
    
    const formattedItem = this.formatReferenceData(item, format);
    
    return this.createSuccessResponse(formattedItem, {
      ...metadata,
      format
    });
  }
  
  /**
   * Create a standardized response for a list of items
   * 
   * @param {Array} items - The items data
   * @param {string} format - The format to use
   * @param {Object} filters - The filters that were applied
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - The formatted response
   */
  createListResponse(items, format = 'detailed', filters = {}, metadata = {}) {
    if (!items || items.length === 0) {
      return this.createErrorResponse(
        `No ${this.dataType} found matching criteria`,
        'NO_RESULTS',
        { filters, ...metadata }
      );
    }
    
    const formattedItems = Array.isArray(items) 
      ? items.map(item => this.formatReferenceData(item, format))
      : this.formatReferenceData(items, format);
    
    return this.createSuccessResponse(formattedItems, {
      count: Array.isArray(formattedItems) ? formattedItems.length : 1,
      filters,
      format,
      ...metadata
    });
  }
}

module.exports = ReferenceDataQueryHandler;