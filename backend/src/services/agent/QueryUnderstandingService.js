/**
 * Query Understanding Service
 * 
 * This service integrates all query understanding components to provide a
 * comprehensive query processing pipeline with disambiguation, variation handling,
 * related question suggestions, and feedback processing.
 * 
 * Features:
 * - Unified interface for query understanding components
 * - Pre-processing of query variations
 * - Disambiguation for unclear queries
 * - Suggestion of related questions
 * - Processing of user feedback for continuous improvement
 */

const logger = require('../../utils/logger');
const QueryVariationHandlerService = require('./QueryVariationHandlerService');
const QueryDisambiguationService = require('./QueryDisambiguationService');
const RelatedQuestionService = require('./RelatedQuestionService');
const QueryFeedbackService = require('./QueryFeedbackService');

class QueryUnderstandingService {
  /**
   * Initialize the query understanding service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.variationHandler = services.variationHandler || QueryVariationHandlerService;
    this.disambiguationService = services.disambiguationService || QueryDisambiguationService;
    this.relatedQuestionService = services.relatedQuestionService || RelatedQuestionService;
    this.feedbackService = services.feedbackService || QueryFeedbackService;
    
    // Configure options
    this.options = {
      enableVariationHandling: options.enableVariationHandling !== false,
      enableDisambiguation: options.enableDisambiguation !== false,
      enableRelatedQuestions: options.enableRelatedQuestions !== false,
      enableFeedbackProcessing: options.enableFeedbackProcessing !== false,
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    this.logger.info('QueryUnderstandingService initialized');
  }

  /**
   * Process a query through the understanding pipeline
   * 
   * @param {string} query - The raw user query
   * @param {Object} parsedQuery - Optional pre-parsed query
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Processed query results
   */
  async processQuery(query, parsedQuery = null, context = {}) {
    try {
      const result = {
        originalQuery: query,
        normalizedQuery: query,
        wasProcessed: false,
        ambiguous: false,
        suggestions: [],
        processingSteps: []
      };
      
      // 1. Handle query variations
      if (this.options.enableVariationHandling) {
        const variationResult = this.variationHandler.processQuery(query);
        
        if (variationResult.success) {
          result.normalizedQuery = variationResult.normalizedQuery;
          result.wasProcessed = true;
          result.processingSteps.push({
            step: 'variation_handling',
            wasApplied: variationResult.wasTransformed,
            confidence: variationResult.confidence
          });
          
          // Track detailed processing steps
          if (variationResult.processingSteps) {
            result.variationSteps = variationResult.processingSteps;
          }
        }
      }
      
      // 2. Check for ambiguity if we have parsed query
      if (this.options.enableDisambiguation && parsedQuery) {
        const ambiguityResult = await this.disambiguationService.checkAmbiguity(
          parsedQuery,
          context
        );
        
        if (ambiguityResult.isAmbiguous) {
          result.ambiguous = true;
          result.ambiguities = ambiguityResult.ambiguities;
          result.requiresDisambiguation = true;
          
          result.processingSteps.push({
            step: 'disambiguation_check',
            wasApplied: true,
            ambiguityTypes: ambiguityResult.ambiguities.map(a => a.type)
          });
        } else {
          result.processingSteps.push({
            step: 'disambiguation_check',
            wasApplied: false
          });
        }
      }
      
      // 3. Add related questions if not ambiguous
      if (this.options.enableRelatedQuestions && !result.ambiguous && parsedQuery) {
        // Format the current query result
        const queryResult = {
          parsedQuery,
          response: context.response || { text: '' },
          handlerUsed: context.handlerUsed || 'unknown',
          queryId: context.queryId
        };
        
        const suggestions = await this.relatedQuestionService.generateSuggestions(
          queryResult,
          context
        );
        
        if (suggestions && suggestions.length > 0) {
          result.suggestions = suggestions;
          
          result.processingSteps.push({
            step: 'suggestion_generation',
            wasApplied: true,
            count: suggestions.length
          });
        } else {
          result.processingSteps.push({
            step: 'suggestion_generation',
            wasApplied: false
          });
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);
      return {
        originalQuery: query,
        error: `Query understanding error: ${error.message}`,
        success: false
      };
    }
  }
  
  /**
   * Process disambiguation response
   * 
   * @param {Object} disambiguationData - Disambiguation data
   * @param {Object} userResponse - User's disambiguation response
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Disambiguation result
   */
  async processDisambiguation(disambiguationData, userResponse, context = {}) {
    if (!this.options.enableDisambiguation) {
      return {
        success: false,
        error: 'Disambiguation is not enabled'
      };
    }
    
    try {
      return await this.disambiguationService.processDisambiguation(
        disambiguationData,
        userResponse,
        context
      );
    } catch (error) {
      this.logger.error(`Error processing disambiguation: ${error.message}`);
      return {
        success: false,
        error: `Disambiguation error: ${error.message}`
      };
    }
  }
  
  /**
   * Track usage of a suggested related question
   * 
   * @param {string} suggestionId - ID of the used suggestion
   * @param {Object} context - Session context
   * @returns {Promise<boolean>} - Success indicator
   */
  async trackSuggestionUsage(suggestionId, context = {}) {
    if (!this.options.enableRelatedQuestions) {
      return false;
    }
    
    try {
      return await this.relatedQuestionService.trackSuggestionUsage(
        suggestionId,
        context
      );
    } catch (error) {
      this.logger.error(`Error tracking suggestion usage: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Submit feedback about query understanding
   * 
   * @param {Object} feedbackData - Feedback data
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Feedback submission result
   */
  async submitFeedback(feedbackData, context = {}) {
    if (!this.options.enableFeedbackProcessing) {
      return {
        success: false,
        error: 'Feedback processing is not enabled'
      };
    }
    
    try {
      return await this.feedbackService.submitFeedback(feedbackData, context);
    } catch (error) {
      this.logger.error(`Error submitting feedback: ${error.message}`);
      return {
        success: false,
        error: `Feedback error: ${error.message}`
      };
    }
  }
  
  /**
   * Apply feedback learning to improve query understanding
   * 
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} - Learning application result
   */
  async applyFeedbackLearning(sessionId) {
    if (!this.options.enableFeedbackProcessing) {
      return {
        success: false,
        error: 'Feedback processing is not enabled'
      };
    }
    
    try {
      return await this.feedbackService.applyFeedbackLearning(sessionId);
    } catch (error) {
      this.logger.error(`Error applying feedback learning: ${error.message}`);
      return {
        success: false,
        error: `Feedback learning error: ${error.message}`
      };
    }
  }
  
  /**
   * Get combined metrics from all services
   * 
   * @returns {Object} - Metrics from all query understanding components
   */
  getMetrics() {
    return {
      variationHandler: this.variationHandler.getMetrics ? this.variationHandler.getMetrics() : {},
      disambiguation: this.disambiguationService.getMetrics(),
      relatedQuestions: this.relatedQuestionService.getMetrics(),
      feedback: this.feedbackService.getMetrics()
    };
  }
  
  /**
   * Update configuration options
   * @param {Object} options - New configuration options
   */
  updateConfig(options) {
    if (!options) return;
    
    this.options = {
      ...this.options,
      ...options
    };
    
    // Forward configuration to individual services
    if (options.variationHandling) {
      this.variationHandler.updateConfig(options.variationHandling);
    }
    
    if (options.disambiguation) {
      this.disambiguationService.updateConfig(options.disambiguation);
    }
    
    if (options.relatedQuestions) {
      this.relatedQuestionService.updateConfig(options.relatedQuestions);
    }
    
    if (options.feedback) {
      this.feedbackService.updateConfig(options.feedback);
    }
    
    this.logger.info('QueryUnderstandingService configuration updated', this.options);
  }
}

module.exports = new QueryUnderstandingService();