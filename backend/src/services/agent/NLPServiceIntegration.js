/**
 * NLP Service Integration
 * 
 * This module provides integration between the existing NLPService and the
 * new NLP components and Query Handlers.
 */

const AgentQueryProcessor = require('./AgentQueryProcessor');
const { createNLPPipeline } = require('./nlp');
const logger = require('../../utils/logger');

/**
 * Enhanced NLP Service that integrates the new query processing pipeline
 */
class EnhancedNLPService {
  constructor(services = {}) {
    this.services = services;
    this.logger = services.logger || logger;
    
    // Initialize the processor
    this.processor = new AgentQueryProcessor(services);
    
    // NLP pipeline for standalone processing
    this.nlpPipeline = createNLPPipeline(services);
    
    this.logger.info('Enhanced NLP Service initialized with query processor');
  }
  
  /**
   * Process a query using the new processing pipeline
   * 
   * @param {string} text - The natural language query
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} - Processed query response
   */
  async processQuery(text, context = {}) {
    return await this.processor.processQuery(text, context);
  }
  
  /**
   * Parse a query without executing it (for analysis)
   * 
   * @param {string} text - The natural language query
   * @param {Object} context - Conversation context
   * @returns {Promise<Object>} - Parsed query
   */
  async parseQuery(text, context = {}) {
    const result = await this.nlpPipeline.processQuery(text, context);
    
    if (!result.success) {
      return {
        success: false,
        error: result.metadata.error
      };
    }
    
    return {
      success: true,
      parsedQuery: result.data,
      domainMetadata: result.metadata.domainMetadata
    };
  }
  
  /**
   * Get metrics from all components
   * 
   * @returns {Object} - Metrics from all components
   */
  getMetrics() {
    return this.processor.getMetrics();
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.processor.resetMetrics();
  }
  
  /**
   * Get information about available intents and handlers
   * 
   * @returns {Object} - System information
   */
  getSystemInfo() {
    return {
      availableIntents: this.processor.getAvailableIntents(),
      registeredHandlers: this.processor.getRegisteredHandlers(),
      metrics: this.getMetrics()
    };
  }
}

/**
 * Initialize the NLP service enhancements
 * 
 * @param {Object} existingNLPService - The existing NLP service instance
 * @param {Object} services - Services to pass to the enhanced components
 * @returns {Object} - The enhanced NLP service
 */
function enhanceNLPService(existingNLPService, services = {}) {
  // Create the enhanced service
  const enhancedService = new EnhancedNLPService(services);
  
  // Add the new methods to the existing service
  existingNLPService.processor = enhancedService.processor;
  existingNLPService.nlpPipeline = enhancedService.nlpPipeline;
  existingNLPService.processStructuredQuery = enhancedService.processQuery.bind(enhancedService);
  existingNLPService.parseQueryDetailed = enhancedService.parseQuery.bind(enhancedService);
  existingNLPService.getQueryMetrics = enhancedService.getMetrics.bind(enhancedService);
  existingNLPService.resetQueryMetrics = enhancedService.resetMetrics.bind(enhancedService);
  existingNLPService.getQuerySystemInfo = enhancedService.getSystemInfo.bind(enhancedService);
  
  logger.info('NLP Service enhanced with new query processing capabilities');
  
  return existingNLPService;
}

module.exports = {
  EnhancedNLPService,
  enhanceNLPService
};