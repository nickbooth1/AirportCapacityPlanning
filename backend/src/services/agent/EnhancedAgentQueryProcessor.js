/**
 * Enhanced Agent Query Processor
 * 
 * This processor integrates the new query understanding components to provide
 * improved natural language processing capabilities for the agent system.
 * 
 * Enhancements:
 * - Query variation handling for different phrasings
 * - Improved intent classification
 * - More robust entity extraction
 * - Contextual understanding across queries
 * - Support for complex, multi-intent queries
 */

const logger = require('../../utils/logger');
const QueryVariationHandlerService = require('./QueryVariationHandlerService');
const IntentClassifierService = require('./IntentClassifierService');
const QueryParserService = require('./QueryParserService');
const ResponseGeneratorService = require('./ResponseGeneratorService');
const WorkingMemoryService = require('./WorkingMemoryService');
const MultiStepReasoningService = require('./MultiStepReasoningService');

class EnhancedAgentQueryProcessor {
  /**
   * Initialize enhanced agent query processor
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.queryVariationHandler = services.queryVariationHandler || QueryVariationHandlerService;
    this.intentClassifier = services.intentClassifier || IntentClassifierService;
    this.queryParser = services.queryParser || QueryParserService;
    this.responseGenerator = services.responseGenerator || ResponseGeneratorService;
    this.workingMemoryService = services.workingMemoryService || new WorkingMemoryService();
    this.multiStepReasoningService = services.multiStepReasoningService || services.reasoningService || 
      new MultiStepReasoningService({ workingMemoryService: this.workingMemoryService });
    
    // Initialize registry
    this.queryHandlerRegistry = {};
    
    // Configure options
    this.options = {
      useWorkingMemory: options.useWorkingMemory !== false,
      useMultiStepReasoning: options.useMultiStepReasoning !== false,
      storeQueryHistory: options.storeQueryHistory !== false,
      complexQueryThreshold: options.complexQueryThreshold || 0.75,
      ...options
    };
    
    // Initialize metrics
    this.metrics = {
      processed: 0,
      successful: 0,
      failed: 0,
      notHandled: 0,
      processingTimeMs: 0,
      complexQueries: 0,
      simpleQueries: 0,
      intentDistribution: {}
    };
    
    logger.info('EnhancedAgentQueryProcessor initialized');
  }

  /**
   * Register a query handler for specific intents
   * 
   * @param {Object} handler - The handler object
   * @param {Array<string>} intents - Intents this handler can process
   */
  registerQueryHandler(handler, intents) {
    if (!handler || !handler.processQuery || !Array.isArray(intents)) {
      throw new Error('Invalid handler registration: handler must have a processQuery method and intents must be an array');
    }
    
    for (const intent of intents) {
      if (!this.queryHandlerRegistry[intent]) {
        this.queryHandlerRegistry[intent] = [];
      }
      
      this.queryHandlerRegistry[intent].push(handler);
      logger.info(`Registered handler ${handler.constructor.name} for intent: ${intent}`);
    }
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
    const sessionId = context.sessionId || `session-${Date.now()}`;
    const queryId = `query-${Date.now()}`;
    
    try {
      this.metrics.processed++;
      
      // Enhanced context with session and query identifiers
      const enhancedContext = {
        ...context,
        sessionId,
        queryId
      };
      
      // Step 1: Retrieve session context if available
      let sessionContext = {};
      if (this.options.useWorkingMemory) {
        sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
        
        // Merge with provided context
        enhancedContext.session = {
          ...sessionContext,
          ...(context.session || {})
        };
      }
      
      // Step 2: Handle query variations (different phrasings)
      const processedQuery = this.queryVariationHandler.processQuery(text);
      
      // Use normalized query if available, otherwise original
      const normalizedQuery = processedQuery.success ? processedQuery.normalizedQuery : text;
      enhancedContext.normalizedQuery = normalizedQuery;
      
      // Step 3: Classify query intent
      const intentResult = await this.intentClassifier.classifyIntent(
        normalizedQuery, 
        enhancedContext
      );
      
      // Store intent result in context
      enhancedContext.intent = intentResult.intent;
      enhancedContext.intentConfidence = intentResult.confidence;
      enhancedContext.subType = intentResult.subType;
      
      // Step 4: Parse query to extract entities and parameters
      const parsedQuery = await this.queryParser.parseQuery(
        normalizedQuery,
        enhancedContext
      );
      
      // Update context with parsed entities and parameters
      enhancedContext.entities = parsedQuery.entities;
      enhancedContext.parameters = parsedQuery.parameters;
      
      // Step 5: Determine if this is a complex query requiring multi-step reasoning
      const isComplexQuery = this._isComplexQuery(parsedQuery, enhancedContext);
      
      // Update metrics based on query complexity
      if (isComplexQuery) {
        this.metrics.complexQueries++;
      } else {
        this.metrics.simpleQueries++;
      }
      
      // Step 6A: Process complex queries with multi-step reasoning
      if (isComplexQuery && this.options.useMultiStepReasoning) {
        return await this._processComplexQuery(text, parsedQuery, enhancedContext, startTime);
      }
      
      // Step 6B: For simple queries, find appropriate query handler(s)
      const handlers = this._findHandlers(parsedQuery.intent);
      
      if (!handlers || handlers.length === 0) {
        this.metrics.notHandled++;
        const endTime = process.hrtime(startTime);
        const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
        this.metrics.processingTimeMs += timeMs;
        
        // Update intent distribution metrics
        this._updateIntentMetrics(parsedQuery.intent, false);
        
        return this.createErrorResponse(
          `No handler found for intent: ${parsedQuery.intent}`,
          'NO_HANDLER_FOUND',
          { intent: parsedQuery.intent }
        );
      }
      
      // Step 7: Process the query with the first matching handler
      const handler = handlers[0];
      const handlerResponse = await handler.processQuery(parsedQuery, enhancedContext);
      
      // Step 8: Store query information in working memory if enabled
      if (this.options.useWorkingMemory && this.options.storeQueryHistory) {
        await this._storeQueryInMemory(
          sessionId,
          queryId,
          text,
          parsedQuery,
          handlerResponse
        );
      }
      
      // Step 9: Format and return the response
      if (handlerResponse.success) {
        this.metrics.successful++;
        
        // Update intent distribution metrics
        this._updateIntentMetrics(parsedQuery.intent, true);
        
        // Calculate processing time
        const endTime = process.hrtime(startTime);
        const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
        this.metrics.processingTimeMs += timeMs;
        
        logger.info(`Query processed successfully: "${text}" (${timeMs.toFixed(2)}ms)`);
        
        return {
          success: true,
          response: handlerResponse.data,
          parsedQuery,
          handlerUsed: handler.constructor.name,
          processingTime: timeMs,
          context: {
            ...enhancedContext,
            lastIntent: parsedQuery.intent,
            lastEntities: parsedQuery.entities
          }
        };
      } else {
        this.metrics.failed++;
        
        // Update intent distribution metrics
        this._updateIntentMetrics(parsedQuery.intent, false);
        
        // Calculate processing time
        const endTime = process.hrtime(startTime);
        const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
        this.metrics.processingTimeMs += timeMs;
        
        logger.warn(`Query processing failed: "${text}" (${timeMs.toFixed(2)}ms)`);
        
        return this.createErrorResponse(
          `Handler error: ${handlerResponse.error.message}`,
          handlerResponse.error.code,
          { handlerError: handlerResponse.error }
        );
      }
    } catch (error) {
      this.metrics.failed++;
      logger.error(`Error processing query: ${error.message}`, error);
      
      // Calculate processing time
      const endTime = process.hrtime(startTime);
      const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      this.metrics.processingTimeMs += timeMs;
      
      return this.createErrorResponse(
        `Unexpected error processing query: ${error.message}`,
        'PROCESSING_ERROR'
      );
    }
  }
  
  /**
   * Process a complex query using multi-step reasoning
   * @private
   * @param {string} text - Original query text
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} context - Enhanced context
   * @param {Array} startTime - Start time for performance measurement
   * @returns {Promise<Object>} - Query response
   */
  async _processComplexQuery(text, parsedQuery, context, startTime) {
    try {
      logger.info(`Processing complex query with multi-step reasoning: "${text}"`);
      
      // Execute query using multi-step reasoning
      const reasoningResult = await this.multiStepReasoningService.executeQuery(
        text,
        {
          ...context,
          parsedQuery
        }
      );
      
      // Calculate processing time
      const endTime = process.hrtime(startTime);
      const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      this.metrics.processingTimeMs += timeMs;
      
      if (reasoningResult.success) {
        this.metrics.successful++;
        
        // Update intent distribution metrics
        this._updateIntentMetrics(parsedQuery.intent, true);
        
        logger.info(`Complex query processed successfully: "${text}" (${timeMs.toFixed(2)}ms)`);
        
        return {
          success: true,
          response: {
            text: reasoningResult.answer,
            reasoning: reasoningResult.reasoning,
            confidence: reasoningResult.confidence
          },
          parsedQuery,
          handlerUsed: 'MultiStepReasoningService',
          processingTime: timeMs,
          reasoningSteps: reasoningResult.reasoning,
          context: {
            ...context,
            lastIntent: parsedQuery.intent,
            lastEntities: parsedQuery.entities
          }
        };
      } else {
        this.metrics.failed++;
        
        // Update intent distribution metrics
        this._updateIntentMetrics(parsedQuery.intent, false);
        
        logger.warn(`Complex query processing failed: "${text}" (${timeMs.toFixed(2)}ms)`);
        
        return this.createErrorResponse(
          `Reasoning error: ${reasoningResult.error}`,
          'REASONING_ERROR',
          { reasoningError: reasoningResult.error }
        );
      }
    } catch (error) {
      this.metrics.failed++;
      logger.error(`Error processing complex query: ${error.message}`, error);
      
      // Calculate processing time
      const endTime = process.hrtime(startTime);
      const timeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      this.metrics.processingTimeMs += timeMs;
      
      return this.createErrorResponse(
        `Complex query processing error: ${error.message}`,
        'COMPLEX_PROCESSING_ERROR'
      );
    }
  }
  
  /**
   * Determine if a query is complex and requires multi-step reasoning
   * @private
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} context - Query context
   * @returns {boolean} - Whether the query is complex
   */
  _isComplexQuery(parsedQuery, context) {
    // Check explicit complex intent
    if (parsedQuery.intent === 'complex_query') {
      return true;
    }
    
    // Check if intention confidence is low (ambiguous query)
    if (context.intentConfidence && context.intentConfidence < 0.6) {
      return true;
    }
    
    // Check for specific complex intents
    const complexIntents = [
      'what_if_analysis', 
      'comparison', 
      'forecast', 
      'optimization',
      'scenario_query'
    ];
    
    if (complexIntents.includes(parsedQuery.intent)) {
      return true;
    }
    
    // Check query length - longer queries tend to be more complex
    if (parsedQuery.query && parsedQuery.query.length > 100) {
      return true;
    }
    
    // Check for multiple entities - queries with many entities are often complex
    if (parsedQuery.entities && Object.keys(parsedQuery.entities).length > 3) {
      return true;
    }
    
    // Check for specific complex keywords
    const complexKeywords = [
      'why', 'how', 'explain', 'analyze', 'compare', 'difference',
      'impact', 'affect', 'relationship', 'correlation', 'predict',
      'forecast', 'trend', 'optimize', 'improve', 'best', 'worst',
      'alternative', 'scenario', 'simulation', 'model', 'complex'
    ];
    
    if (parsedQuery.query) {
      const lowerQuery = parsedQuery.query.toLowerCase();
      for (const keyword of complexKeywords) {
        if (lowerQuery.includes(keyword)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Find handlers for a specific intent
   * @private
   * @param {string} intent - The classified intent
   * @returns {Array} - Matching handlers
   */
  _findHandlers(intent) {
    // Check for specific intent handlers
    if (this.queryHandlerRegistry[intent]) {
      return this.queryHandlerRegistry[intent];
    }
    
    // Check for fallback handlers
    if (this.queryHandlerRegistry['*']) {
      return this.queryHandlerRegistry['*'];
    }
    
    return [];
  }
  
  /**
   * Store query information in working memory
   * @private
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {string} text - Original query text
   * @param {Object} parsedQuery - Parsed query information
   * @param {Object} handlerResponse - Handler response
   * @returns {Promise<void>}
   */
  async _storeQueryInMemory(sessionId, queryId, text, parsedQuery, handlerResponse) {
    try {
      // Store query results
      await this.workingMemoryService.storeQueryResult(
        sessionId,
        queryId,
        {
          text,
          timestamp: Date.now(),
          intent: parsedQuery.intent,
          entities: parsedQuery.entities,
          parameters: parsedQuery.parameters,
          response: handlerResponse.data
        }
      );
      
      // Store entity mentions for context
      if (parsedQuery.entities) {
        const entityMentions = [];
        
        for (const [type, value] of Object.entries(parsedQuery.entities)) {
          entityMentions.push({
            type,
            value,
            queryId,
            timestamp: Date.now()
          });
        }
        
        if (entityMentions.length > 0) {
          await this.workingMemoryService.storeEntityMentions(
            sessionId,
            queryId,
            entityMentions
          );
        }
      }
      
      // Update session context with last query information
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      
      // Store last mentioned entities for context
      if (parsedQuery.entities.terminal) {
        sessionContext.lastTerminal = parsedQuery.entities.terminal;
      }
      
      if (parsedQuery.entities.stand) {
        sessionContext.lastStand = parsedQuery.entities.stand;
      }
      
      // Update previous queries list
      const previousQueries = sessionContext.previousQueries || [];
      previousQueries.unshift({
        queryId,
        text,
        intent: parsedQuery.intent,
        timestamp: Date.now()
      });
      
      // Keep only the 5 most recent queries
      if (previousQueries.length > 5) {
        previousQueries.pop();
      }
      
      // Update session context
      await this.workingMemoryService.storeSessionContext(sessionId, {
        ...sessionContext,
        lastQueryId: queryId,
        lastIntent: parsedQuery.intent,
        previousQueries
      });
      
    } catch (error) {
      logger.error(`Error storing query in memory: ${error.message}`);
      // Non-critical error, continue processing
    }
  }
  
  /**
   * Update metrics for intent distribution
   * @private
   * @param {string} intent - Classified intent
   * @param {boolean} success - Whether processing was successful
   */
  _updateIntentMetrics(intent, success) {
    if (!this.metrics.intentDistribution[intent]) {
      this.metrics.intentDistribution[intent] = {
        total: 0,
        successful: 0,
        failed: 0
      };
    }
    
    this.metrics.intentDistribution[intent].total++;
    
    if (success) {
      this.metrics.intentDistribution[intent].successful++;
    } else {
      this.metrics.intentDistribution[intent].failed++;
    }
  }
  
  /**
   * Create a standardized error response
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
   * @returns {Object} - Combined metrics
   */
  getMetrics() {
    // Calculate average processing time
    const avgTime = this.metrics.processed > 0 
      ? this.metrics.processingTimeMs / this.metrics.processed 
      : 0;
    
    // Get component metrics
    const nlpMetrics = {
      queryVariation: this.queryVariationHandler.getMetrics ? this.queryVariationHandler.getMetrics() : {},
      intentClassifier: this.intentClassifier.getMetrics ? this.intentClassifier.getMetrics() : {},
      queryParser: this.queryParser.getMetrics ? this.queryParser.getMetrics() : {}
    };
    
    return {
      processor: {
        ...this.metrics,
        averageProcessingTimeMs: avgTime,
        successRate: this.metrics.processed > 0 
          ? this.metrics.successful / this.metrics.processed 
          : 0,
        complexQueryPercentage: this.metrics.processed > 0
          ? (this.metrics.complexQueries / this.metrics.processed) * 100
          : 0
      },
      nlp: nlpMetrics,
      queryHandlers: {
        totalHandlers: Object.values(this.queryHandlerRegistry)
          .reduce((total, handlers) => total + handlers.length, 0)
      },
      multiStepReasoning: this.multiStepReasoningService.getMetrics 
        ? this.multiStepReasoningService.getMetrics() 
        : {}
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
      processingTimeMs: 0,
      complexQueries: 0,
      simpleQueries: 0,
      intentDistribution: {}
    };
    
    // Reset component metrics
    if (this.queryVariationHandler.resetMetrics) {
      this.queryVariationHandler.resetMetrics();
    }
    
    if (this.intentClassifier.resetMetrics) {
      this.intentClassifier.resetMetrics();
    }
    
    if (this.queryParser.resetMetrics) {
      this.queryParser.resetMetrics();
    }
    
    if (this.multiStepReasoningService.resetMetrics) {
      this.multiStepReasoningService.resetMetrics();
    }
  }
  
  /**
   * Get registered query handlers
   * @returns {Object} - Registered handlers by intent
   */
  getRegisteredHandlers() {
    const handlersByIntent = {};
    
    for (const [intent, handlers] of Object.entries(this.queryHandlerRegistry)) {
      handlersByIntent[intent] = handlers.map(handler => ({
        name: handler.constructor.name,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(handler))
          .filter(name => name !== 'constructor' && typeof handler[name] === 'function')
      }));
    }
    
    return handlersByIntent;
  }
  
  /**
   * Get all available intents
   * @returns {Array<string>} - Available intents
   */
  getAvailableIntents() {
    return this.intentClassifier.getAvailableIntents();
  }
  
  /**
   * Get available entity types
   * @returns {Array<string>} - Available entity types
   */
  getAvailableEntityTypes() {
    return this.queryParser.getAvailableEntityTypes();
  }
  
  /**
   * Update configuration options
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    logger.info('EnhancedAgentQueryProcessor configuration updated', this.options);
  }
}

module.exports = EnhancedAgentQueryProcessor;