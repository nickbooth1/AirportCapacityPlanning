/**
 * Query Parser
 * 
 * This class is responsible for parsing natural language queries into structured data.
 * It combines intent classification and entity extraction to create a complete
 * parsed query that can be processed by query handlers.
 */

const NLPProcessorBase = require('./NLPProcessorBase');
const IntentClassifier = require('./IntentClassifier');
const EntityExtractor = require('./EntityExtractor');

class QueryParser extends NLPProcessorBase {
  /**
   * Create a new query parser
   * 
   * @param {Object} services - The service dependencies
   * @param {Object} options - Additional options for the parser
   */
  constructor(services = {}, options = {}) {
    super(services, options);
    
    // Sub-components
    this.intentClassifier = options.intentClassifier || new IntentClassifier(services, options);
    this.entityExtractor = options.entityExtractor || new EntityExtractor(services, options);
    
    // Cache for recently parsed queries
    this.queryCache = new Map();
    this.cacheSize = options.cacheSize || 100;
    this.cacheEnabled = options.cacheEnabled !== undefined ? options.cacheEnabled : true;
    
    // Configuration
    this.minConfidenceThreshold = options.minConfidenceThreshold || 0.5;
  }
  
  /**
   * Process a query to extract intent and entities
   * 
   * @param {string} text - The query text
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Parsed query result
   */
  async process(text, context = {}) {
    return this.trackPerformance(async () => {
      try {
        // Normalize the input
        const normalizedText = this.normalizeText(text);
        
        if (!normalizedText) {
          return this.createErrorResult(
            'Empty or invalid query',
            'INVALID_INPUT'
          );
        }
        
        // Check cache if enabled
        if (this.cacheEnabled) {
          const cacheKey = this.generateCacheKey(normalizedText, context);
          const cachedResult = this.queryCache.get(cacheKey);
          
          if (cachedResult) {
            this.logger.debug('Retrieved parsed query from cache');
            return cachedResult;
          }
        }
        
        // Step 1: Classify intent
        const intentResult = await this.intentClassifier.process(normalizedText, context);
        
        if (!intentResult.success) {
          return this.createErrorResult(
            'Failed to classify intent',
            'INTENT_CLASSIFICATION_FAILED',
            { details: intentResult.metadata.error }
          );
        }
        
        const intent = intentResult.data.intent;
        const intentConfidence = intentResult.data.confidence;
        
        // Check if confidence is too low
        if (intentConfidence < this.minConfidenceThreshold) {
          return this.createErrorResult(
            'Intent classification confidence too low',
            'LOW_CONFIDENCE',
            { intent, confidence: intentConfidence }
          );
        }
        
        // Step 2: Extract entities with intent context
        const entityResult = await this.entityExtractor.process(normalizedText, {
          ...context,
          intent
        });
        
        if (!entityResult.success) {
          return this.createErrorResult(
            'Failed to extract entities',
            'ENTITY_EXTRACTION_FAILED',
            { details: entityResult.metadata.error }
          );
        }
        
        const entities = entityResult.data;
        
        // Step 3: Combine into a parsed query
        const parsedQuery = {
          intent,
          confidence: intentConfidence,
          entities,
          rawText: normalizedText,
          timestamp: new Date().toISOString()
        };
        
        // Add any additional context information that might be helpful
        if (context.conversationId) {
          parsedQuery.conversationId = context.conversationId;
        }
        
        if (intentResult.data.alternativeIntent) {
          parsedQuery.alternativeIntent = intentResult.data.alternativeIntent;
          parsedQuery.alternativeConfidence = intentResult.data.alternativeConfidence;
        }
        
        // Create the result
        const result = this.createSuccessResult(parsedQuery, {
          intentSource: intentResult.data.method,
          entityCount: Object.keys(entities).length
        });
        
        // Cache the result if enabled
        if (this.cacheEnabled) {
          const cacheKey = this.generateCacheKey(normalizedText, context);
          this.addToCache(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Error parsing query: ${error.message}`);
        return this.createErrorResult(
          `Query parsing error: ${error.message}`,
          'PARSING_ERROR'
        );
      }
    }, 'query parsing');
  }
  
  /**
   * Normalize input text for processing
   * 
   * @param {string} text - Input text
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text.trim();
  }
  
  /**
   * Generate a cache key for the query
   * 
   * @param {string} text - The query text
   * @param {Object} context - The context object
   * @returns {string} - Cache key
   */
  generateCacheKey(text, context = {}) {
    // Include relevant context in the key
    const contextKey = context.conversationId ? `-${context.conversationId}` : '';
    return `${text}${contextKey}`;
  }
  
  /**
   * Add a result to the cache
   * 
   * @param {string} key - Cache key
   * @param {Object} result - Result to cache
   */
  addToCache(key, result) {
    // If cache is at capacity, remove oldest entry
    if (this.queryCache.size >= this.cacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
    
    // Add to cache
    this.queryCache.set(key, result);
  }
  
  /**
   * Clear the query cache
   */
  clearCache() {
    this.queryCache.clear();
  }
  
  /**
   * Get combined metrics from all components
   * 
   * @returns {Object} - Combined metrics
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    const intentMetrics = this.intentClassifier.getMetrics();
    const entityMetrics = this.entityExtractor.getMetrics();
    
    return {
      parser: baseMetrics,
      intentClassifier: intentMetrics,
      entityExtractor: entityMetrics,
      cacheSize: this.queryCache.size,
      cacheEnabled: this.cacheEnabled
    };
  }
  
  /**
   * Get intent categories
   * 
   * @returns {Object} - Intent categories
   */
  getIntentCategories() {
    return this.intentClassifier.intentCategories;
  }
  
  /**
   * Get available intents
   * 
   * @returns {Array<string>} - Available intents
   */
  getAvailableIntents() {
    return this.intentClassifier.getAllIntents();
  }
  
  /**
   * Get entity types
   * 
   * @returns {Object} - Entity types
   */
  getEntityTypes() {
    return this.entityExtractor.entityTypes;
  }
}

module.exports = QueryParser;