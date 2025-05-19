/**
 * Agent Query Processor
 * 
 * This module provides integration between the NLP components and the
 * Query Handlers, allowing natural language queries to be processed
 * and answered by the appropriate handlers.
 */

const { createNLPPipeline } = require('./nlp');
const { createQueryRegistry } = require('./queries');
const logger = require('../../utils/logger');

class AgentQueryProcessor {
  /**
   * Create a new agent query processor
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    this.services = services;
    this.options = options;
    this.logger = services.logger || logger;
    
    // Initialize NLP pipeline
    this.nlpPipeline = options.nlpPipeline || createNLPPipeline(services, options);
    
    // Initialize Query registry with handlers
    this.initializeQueryRegistry();
    
    // Metrics
    this.metrics = {
      processed: 0,
      successful: 0,
      failed: 0,
      notHandled: 0,
      processingTimeMs: 0
    };
  }
  
  /**
   * Initialize the query registry with handlers
   */
  async initializeQueryRegistry() {
    this.queryRegistry = await createQueryRegistry(this.services);
    this.logger.info('Query registry initialized with handlers');
  }
  
  /**
   * Process a natural language query
   * 
   * @param {string} text - The natural language query
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} - Query response
   */
  async processQuery(text, context = {}) {
    const startTime = process.hrtime();
    
    try {
      this.metrics.processed++;
      
      // Step 1: Process through NLP pipeline
      const nlpResult = await this.nlpPipeline.processQuery(text, context);
      
      if (!nlpResult.success) {
        this.metrics.failed++;
        return this.createErrorResponse(
          `Failed to process query: ${nlpResult.metadata.error.message}`,
          nlpResult.metadata.error.code,
          { nlpError: nlpResult.metadata.error }
        );
      }
      
      const parsedQuery = nlpResult.data;
      
      // Step 2: Find appropriate query handler(s)
      const handlers = this.queryRegistry.findHandlers(parsedQuery);
      
      if (!handlers || handlers.length === 0) {
        this.metrics.notHandled++;
        return this.createErrorResponse(
          `No handler found for intent: ${parsedQuery.intent}`,
          'NO_HANDLER_FOUND',
          { intent: parsedQuery.intent }
        );
      }
      
      // Step 3: Process the query with the first matching handler
      const handler = handlers[0];
      const handlerResponse = await this.queryRegistry.processQuery(parsedQuery, context);
      
      // Step 4: Format and return the response
      if (handlerResponse.success) {
        this.metrics.successful++;
        
        return {
          success: true,
          response: handlerResponse.data,
          parsedQuery,
          handlerUsed: handler.constructor.name,
          context: {
            ...context,
            lastIntent: parsedQuery.intent,
            lastEntities: parsedQuery.entities
          }
        };
      } else {
        this.metrics.failed++;
        
        return this.createErrorResponse(
          `Handler error: ${handlerResponse.error.message}`,
          handlerResponse.error.code,
          { handlerError: handlerResponse.error }
        );
      }
    } catch (error) {
      this.metrics.failed++;
      this.logger.error(`Error processing query: ${error.message}`, error);
      
      return this.createErrorResponse(
        `Unexpected error processing query: ${error.message}`,
        'PROCESSING_ERROR'
      );
    } finally {
      // Update processing time metric
      const endTime = process.hrtime(startTime);
      const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      this.metrics.processingTimeMs += timeMs;
      
      if (timeMs > 1000) {
        this.logger.warn(`Slow query processing: ${timeMs.toFixed(2)}ms for "${text}"`);
      }
    }
  }
  
  /**
   * Create a standardized error response
   * 
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} - Error response
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
   * Get metrics from all components
   * 
   * @returns {Object} - Combined metrics
   */
  getMetrics() {
    const nlpMetrics = this.nlpPipeline.getMetrics();
    
    // Calculate average processing time
    const avgTime = this.metrics.processed > 0 
      ? this.metrics.processingTimeMs / this.metrics.processed 
      : 0;
    
    return {
      processor: {
        ...this.metrics,
        averageProcessingTimeMs: avgTime,
        successRate: this.metrics.processed > 0 
          ? this.metrics.successful / this.metrics.processed 
          : 0
      },
      nlp: nlpMetrics,
      queryHandlers: {
        totalHandlers: this.queryRegistry ? this.queryRegistry.handlers.length : 0
      }
    };
  }
  
  /**
   * Reset metrics across all components
   */
  resetMetrics() {
    this.metrics = {
      processed: 0,
      successful: 0,
      failed: 0,
      notHandled: 0,
      processingTimeMs: 0
    };
    
    this.nlpPipeline.resetMetrics();
  }
  
  /**
   * Get a list of available intents that can be handled
   * 
   * @returns {Array<string>} - Available intents
   */
  getAvailableIntents() {
    return this.nlpPipeline.queryParser.getAvailableIntents();
  }
  
  /**
   * Get registered query handlers
   * 
   * @returns {Array<Object>} - Registered handlers
   */
  getRegisteredHandlers() {
    if (!this.queryRegistry) {
      return [];
    }
    
    return this.queryRegistry.handlers.map(handler => ({
      name: handler.constructor.name,
      queryTypes: handler.getQueryTypes()
    }));
  }
}

module.exports = AgentQueryProcessor;