/**
 * Query Feedback Service
 * 
 * This service provides a mechanism to collect, store, and apply user feedback
 * about query understanding and responses. It helps improve the quality of
 * query understanding over time through a feedback loop.
 * 
 * Features:
 * - Collection and storage of user feedback on query understanding
 * - Learning from feedback to improve future query processing
 * - Analysis of feedback patterns for system improvement
 * - Integration with other query understanding components
 */

const logger = require('../../utils/logger');
const OpenAIService = require('./OpenAIService');
const WorkingMemoryService = require('./WorkingMemoryService');
const QueryVariationHandlerService = require('./QueryVariationHandlerService');
const IntentClassifierService = require('./IntentClassifierService');
const QueryParserService = require('./QueryParserService');

class QueryFeedbackService {
  /**
   * Initialize the query feedback service
   * 
   * @param {Object} services - Service dependencies
   * @param {Object} options - Configuration options
   */
  constructor(services = {}, options = {}) {
    // Initialize dependencies
    this.openAIService = services.openAIService || OpenAIService;
    this.workingMemoryService = services.workingMemoryService || new WorkingMemoryService();
    this.queryVariationHandler = services.queryVariationHandler || QueryVariationHandlerService;
    this.intentClassifier = services.intentClassifier || IntentClassifierService;
    this.queryParser = services.queryParser || QueryParserService;
    
    // Configure options
    this.options = {
      learningEnabled: options.learningEnabled !== false,
      feedbackHistoryLimit: options.feedbackHistoryLimit || 100,
      feedbackAggregationThreshold: options.feedbackAggregationThreshold || 10,
      minFeedbackConfidence: options.minFeedbackConfidence || 0.7,
      syncInterval: options.syncInterval || 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };
    
    // Initialize logger
    this.logger = services.logger || logger;
    
    // Initialize feedback memory
    this.feedbackMemory = {
      variations: [], // Variation patterns learned from feedback
      intents: [], // Intent patterns learned from feedback
      entities: [], // Entity patterns learned from feedback
      lastSyncTime: null
    };
    
    // Initialize metrics
    this.metrics = {
      totalFeedback: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      appliedLearning: 0,
      intentFeedback: 0,
      entityFeedback: 0,
      variationFeedback: 0,
      averageFeedbackScore: 0,
      totalFeedbackScore: 0
    };
    
    this.logger.info('QueryFeedbackService initialized');
    
    // Attempt to load previously stored feedback data
    this._loadFeedbackData();
  }

  /**
   * Submit feedback about query understanding
   * 
   * @param {Object} data - Feedback data
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Feedback submission result
   */
  async submitFeedback(data, context = {}) {
    try {
      if (!data) {
        return {
          success: false,
          error: 'Invalid feedback data'
        };
      }
      
      const {
        queryId,
        query,
        parsedQuery,
        rating,
        feedbackType,
        comments,
        correction
      } = data;
      
      // Required fields
      if (!queryId || !query || !rating) {
        return {
          success: false,
          error: 'Missing required feedback fields'
        };
      }
      
      const sessionId = context.sessionId || data.sessionId;
      
      // Prepare feedback record
      const feedbackRecord = {
        feedbackId: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        queryId,
        sessionId,
        timestamp: Date.now(),
        query,
        parsedQuery,
        rating,
        feedbackType,
        comments,
        correction,
        applied: false
      };
      
      // Store feedback in working memory
      await this._storeFeedback(feedbackRecord, context);
      
      // Update metrics
      this._updateMetrics(feedbackRecord);
      
      // Process feedback for learning if enabled
      if (this.options.learningEnabled) {
        await this._processFeedbackForLearning(feedbackRecord);
      }
      
      return {
        success: true,
        feedbackId: feedbackRecord.feedbackId,
        message: 'Feedback submitted successfully'
      };
    } catch (error) {
      this.logger.error(`Error submitting feedback: ${error.message}`);
      return {
        success: false,
        error: `Feedback submission error: ${error.message}`
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
    try {
      if (!this.options.learningEnabled) {
        return {
          success: false,
          error: 'Feedback learning is not enabled'
        };
      }
      
      // Get all feedback for analysis
      const allFeedback = await this._getAllFeedback(sessionId);
      
      // Apply learning to each component
      const results = {
        variations: await this._applyVariationLearning(allFeedback),
        intents: await this._applyIntentLearning(allFeedback),
        entities: await this._applyEntityLearning(allFeedback)
      };
      
      // Update metrics
      this.metrics.appliedLearning++;
      
      // Store updated feedback memory
      this._saveFeedbackData();
      
      return {
        success: true,
        results,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`Error applying feedback learning: ${error.message}`);
      return {
        success: false,
        error: `Feedback learning error: ${error.message}`
      };
    }
  }
  
  /**
   * Get feedback statistics and insights
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Feedback statistics
   */
  async getFeedbackStatistics(options = {}) {
    try {
      // Get all feedback for analysis
      const allFeedback = await this._getAllFeedback(options.sessionId);
      
      // Calculate basic statistics
      const totalCount = allFeedback.length;
      const positiveCount = allFeedback.filter(f => f.rating >= 4).length;
      const negativeCount = allFeedback.filter(f => f.rating <= 2).length;
      const neutralCount = totalCount - positiveCount - negativeCount;
      
      // Calculate average rating
      const totalRating = allFeedback.reduce((sum, f) => sum + f.rating, 0);
      const averageRating = totalCount > 0 ? totalRating / totalCount : 0;
      
      // Count by type
      const byType = {};
      allFeedback.forEach(f => {
        if (f.feedbackType) {
          byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1;
        }
      });
      
      // Identify common issues
      const commonIssues = this._identifyCommonIssues(allFeedback);
      
      // Calculate improvement over time
      const improvementTrend = this._calculateImprovementTrend(allFeedback);
      
      return {
        totalFeedback: totalCount,
        ratingDistribution: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount
        },
        averageRating,
        byType,
        commonIssues,
        improvementTrend,
        learningStatus: {
          variations: this.feedbackMemory.variations.length,
          intents: this.feedbackMemory.intents.length,
          entities: this.feedbackMemory.entities.length,
          lastSyncTime: this.feedbackMemory.lastSyncTime
        }
      };
    } catch (error) {
      this.logger.error(`Error getting feedback statistics: ${error.message}`);
      return {
        success: false,
        error: `Feedback statistics error: ${error.message}`
      };
    }
  }
  
  /**
   * Store feedback in memory
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @param {Object} context - Context information
   * @returns {Promise<void>}
   */
  async _storeFeedback(feedbackRecord, context) {
    try {
      const sessionId = feedbackRecord.sessionId || context.sessionId;
      
      if (!sessionId) {
        this.logger.warn('Cannot store feedback without session ID');
        return;
      }
      
      // Store in session data
      await this.workingMemoryService.storeSessionData(
        sessionId,
        `feedback:${feedbackRecord.feedbackId}`,
        feedbackRecord
      );
      
      // Update feedback history in session context
      const sessionContext = await this.workingMemoryService.getSessionContext(sessionId) || {};
      const feedbackHistory = sessionContext.feedbackHistory || [];
      
      feedbackHistory.unshift({
        feedbackId: feedbackRecord.feedbackId,
        queryId: feedbackRecord.queryId,
        timestamp: feedbackRecord.timestamp,
        rating: feedbackRecord.rating,
        feedbackType: feedbackRecord.feedbackType
      });
      
      // Limit history size
      if (feedbackHistory.length > 10) {
        feedbackHistory.pop();
      }
      
      await this.workingMemoryService.updateSessionContextField(
        sessionId,
        'feedbackHistory',
        feedbackHistory
      );
      
      // Add to global feedback list
      await this._addToFeedbackList(feedbackRecord);
    } catch (error) {
      this.logger.error(`Error storing feedback: ${error.message}`);
      // Non-critical error, continue
    }
  }
  
  /**
   * Add feedback to global list
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _addToFeedbackList(feedbackRecord) {
    try {
      // Get global feedback list
      const feedbackList = await this.workingMemoryService.getSessionData(
        'global',
        'feedback_list'
      ) || { items: [] };
      
      // Add to list
      feedbackList.items.unshift({
        feedbackId: feedbackRecord.feedbackId,
        sessionId: feedbackRecord.sessionId,
        queryId: feedbackRecord.queryId,
        timestamp: feedbackRecord.timestamp,
        query: feedbackRecord.query,
        rating: feedbackRecord.rating,
        feedbackType: feedbackRecord.feedbackType
      });
      
      // Limit list size
      if (feedbackList.items.length > this.options.feedbackHistoryLimit) {
        feedbackList.items = feedbackList.items.slice(0, this.options.feedbackHistoryLimit);
      }
      
      // Update global feedback list
      await this.workingMemoryService.storeSessionData(
        'global',
        'feedback_list',
        {
          ...feedbackList,
          lastUpdated: Date.now()
        }
      );
    } catch (error) {
      this.logger.error(`Error adding to feedback list: ${error.message}`);
      // Non-critical error, continue
    }
  }
  
  /**
   * Get all stored feedback
   * @private
   * @param {string} sessionId - Optional session ID to filter by
   * @returns {Promise<Array>} - All feedback records
   */
  async _getAllFeedback(sessionId) {
    try {
      // Get global feedback list
      const feedbackList = await this.workingMemoryService.getSessionData(
        'global',
        'feedback_list'
      ) || { items: [] };
      
      // Filter by session if needed
      let filteredList = feedbackList.items;
      if (sessionId) {
        filteredList = filteredList.filter(f => f.sessionId === sessionId);
      }
      
      // Fetch full feedback records
      const result = [];
      
      for (const item of filteredList) {
        if (item.feedbackId && item.sessionId) {
          const fullRecord = await this.workingMemoryService.getSessionData(
            item.sessionId,
            `feedback:${item.feedbackId}`
          );
          
          if (fullRecord) {
            result.push(fullRecord);
          }
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting all feedback: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Process feedback for learning
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _processFeedbackForLearning(feedbackRecord) {
    try {
      // Only process detailed feedback with corrections
      if (!feedbackRecord.correction || !feedbackRecord.parsedQuery) {
        return;
      }
      
      // Analyze what type of correction is being made
      const feedbackType = feedbackRecord.feedbackType || this._determineFeedbackType(
        feedbackRecord.parsedQuery,
        feedbackRecord.correction
      );
      
      // Process based on feedback type
      switch (feedbackType) {
        case 'variation':
          await this._processVariationFeedback(feedbackRecord);
          break;
          
        case 'intent':
          await this._processIntentFeedback(feedbackRecord);
          break;
          
        case 'entity':
          await this._processEntityFeedback(feedbackRecord);
          break;
          
        default:
          // For general feedback, try to analyze what components need improvement
          await this._processGeneralFeedback(feedbackRecord);
      }
    } catch (error) {
      this.logger.error(`Error processing feedback for learning: ${error.message}`);
      // Non-critical error, continue
    }
  }
  
  /**
   * Determine feedback type from correction
   * @private
   * @param {Object} parsedQuery - Original parsed query
   * @param {Object} correction - Correction data
   * @returns {string} - Feedback type
   */
  _determineFeedbackType(parsedQuery, correction) {
    // Check for intent correction
    if (correction.intent && correction.intent !== parsedQuery.intent) {
      return 'intent';
    }
    
    // Check for entity corrections
    if (correction.entities) {
      const correctedEntities = Object.keys(correction.entities);
      const originalEntities = Object.keys(parsedQuery.entities || {});
      
      // If there are new entities or changed entity values
      if (correctedEntities.length !== originalEntities.length || 
          correctedEntities.some(e => 
            !originalEntities.includes(e) || 
            correction.entities[e] !== parsedQuery.entities[e]
          )) {
        return 'entity';
      }
    }
    
    // Check for query variation correction
    if (correction.query && correction.query !== parsedQuery.query) {
      return 'variation';
    }
    
    // Default to general feedback
    return 'general';
  }
  
  /**
   * Process query variation feedback
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _processVariationFeedback(feedbackRecord) {
    try {
      const originalQuery = feedbackRecord.query;
      const correctedQuery = feedbackRecord.correction.query || originalQuery;
      
      // Only process if there's an actual correction
      if (originalQuery === correctedQuery) {
        return;
      }
      
      // Check if this is a new variation pattern
      if (!this._variationExists(originalQuery, correctedQuery)) {
        // Add to variation patterns
        this.feedbackMemory.variations.push({
          original: originalQuery,
          corrected: correctedQuery,
          count: 1,
          lastUsed: Date.now(),
          confidence: 0.7,
          feedbackIds: [feedbackRecord.feedbackId]
        });
      } else {
        // Update existing variation pattern
        const existingIndex = this.feedbackMemory.variations.findIndex(
          v => this._isSimilarVariation(v.original, originalQuery) && 
               this._isSimilarVariation(v.corrected, correctedQuery)
        );
        
        if (existingIndex >= 0) {
          const variation = this.feedbackMemory.variations[existingIndex];
          variation.count++;
          variation.lastUsed = Date.now();
          variation.confidence = Math.min(0.95, variation.confidence + 0.05);
          
          if (!variation.feedbackIds.includes(feedbackRecord.feedbackId)) {
            variation.feedbackIds.push(feedbackRecord.feedbackId);
          }
        }
      }
      
      // Update metrics
      this.metrics.variationFeedback++;
      
      // Save changes
      this._saveFeedbackData();
    } catch (error) {
      this.logger.error(`Error processing variation feedback: ${error.message}`);
    }
  }
  
  /**
   * Process intent feedback
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _processIntentFeedback(feedbackRecord) {
    try {
      const originalIntent = feedbackRecord.parsedQuery.intent;
      const correctedIntent = feedbackRecord.correction.intent;
      
      // Only process if there's an actual correction
      if (originalIntent === correctedIntent || !correctedIntent) {
        return;
      }
      
      // Check if this pattern exists
      if (!this._intentPatternExists(feedbackRecord.query, correctedIntent)) {
        // Add new intent pattern
        this.feedbackMemory.intents.push({
          pattern: feedbackRecord.query,
          intent: correctedIntent,
          count: 1,
          lastUsed: Date.now(),
          confidence: 0.7,
          feedbackIds: [feedbackRecord.feedbackId]
        });
      } else {
        // Update existing pattern
        const existingIndex = this.feedbackMemory.intents.findIndex(
          i => this._isSimilarVariation(i.pattern, feedbackRecord.query) && 
               i.intent === correctedIntent
        );
        
        if (existingIndex >= 0) {
          const pattern = this.feedbackMemory.intents[existingIndex];
          pattern.count++;
          pattern.lastUsed = Date.now();
          pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
          
          if (!pattern.feedbackIds.includes(feedbackRecord.feedbackId)) {
            pattern.feedbackIds.push(feedbackRecord.feedbackId);
          }
        }
      }
      
      // Update metrics
      this.metrics.intentFeedback++;
      
      // Save changes
      this._saveFeedbackData();
    } catch (error) {
      this.logger.error(`Error processing intent feedback: ${error.message}`);
    }
  }
  
  /**
   * Process entity feedback
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _processEntityFeedback(feedbackRecord) {
    try {
      const originalEntities = feedbackRecord.parsedQuery.entities || {};
      const correctedEntities = feedbackRecord.correction.entities || {};
      
      // Process each corrected entity
      for (const [entityType, entityValue] of Object.entries(correctedEntities)) {
        const originalValue = originalEntities[entityType];
        
        // Skip if no change
        if (originalValue === entityValue) {
          continue;
        }
        
        // Check for entity pattern
        const contextPattern = this._extractEntityContext(
          feedbackRecord.query,
          entityValue
        );
        
        if (contextPattern && !this._entityPatternExists(contextPattern, entityType, entityValue)) {
          // Add new entity pattern
          this.feedbackMemory.entities.push({
            pattern: contextPattern,
            entityType,
            entityValue,
            count: 1,
            lastUsed: Date.now(),
            confidence: 0.7,
            feedbackIds: [feedbackRecord.feedbackId]
          });
        } else if (contextPattern) {
          // Update existing pattern
          const existingIndex = this.feedbackMemory.entities.findIndex(
            e => this._isSimilarVariation(e.pattern, contextPattern) && 
                 e.entityType === entityType &&
                 e.entityValue === entityValue
          );
          
          if (existingIndex >= 0) {
            const pattern = this.feedbackMemory.entities[existingIndex];
            pattern.count++;
            pattern.lastUsed = Date.now();
            pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
            
            if (!pattern.feedbackIds.includes(feedbackRecord.feedbackId)) {
              pattern.feedbackIds.push(feedbackRecord.feedbackId);
            }
          }
        }
      }
      
      // Update metrics
      this.metrics.entityFeedback++;
      
      // Save changes
      this._saveFeedbackData();
    } catch (error) {
      this.logger.error(`Error processing entity feedback: ${error.message}`);
    }
  }
  
  /**
   * Process general feedback
   * @private
   * @param {Object} feedbackRecord - Feedback record
   * @returns {Promise<void>}
   */
  async _processGeneralFeedback(feedbackRecord) {
    try {
      // For general feedback without specific corrections,
      // use LLM to analyze and determine improvement areas
      if (!feedbackRecord.comments) {
        return;
      }
      
      const prompt = `
      Analyze this feedback about query understanding:
      
      Original query: ${feedbackRecord.query}
      Parsed intent: ${feedbackRecord.parsedQuery.intent}
      Parsed entities: ${JSON.stringify(feedbackRecord.parsedQuery.entities || {})}
      
      User feedback: ${feedbackRecord.comments}
      Rating: ${feedbackRecord.rating}/5
      
      Determine what aspect of query understanding needs improvement.
      Respond with a JSON object containing:
      1. primaryIssue: "intent", "entity", "variation", or "other"
      2. explanation: Brief explanation of the issue
      3. suggestedCorrection: What the correct understanding should be
      `;
      
      const response = await this.openAIService.processQuery(prompt);
      
      // Try to parse the analysis
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          // Create synthetic correction based on analysis
          const correction = {
            ...feedbackRecord.correction || {},
            _generated: true,
            _confidence: 0.6
          };
          
          // Add appropriate corrections based on analysis
          if (analysis.primaryIssue === 'intent' && analysis.suggestedCorrection) {
            correction.intent = analysis.suggestedCorrection;
          } else if (analysis.primaryIssue === 'entity' && typeof analysis.suggestedCorrection === 'object') {
            correction.entities = analysis.suggestedCorrection;
          } else if (analysis.primaryIssue === 'variation' && analysis.suggestedCorrection) {
            correction.query = analysis.suggestedCorrection;
          }
          
          // Process with synthetic correction
          const enhancedFeedback = {
            ...feedbackRecord,
            correction,
            feedbackType: analysis.primaryIssue
          };
          
          await this._processFeedbackForLearning(enhancedFeedback);
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse feedback analysis: ${parseError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error processing general feedback: ${error.message}`);
    }
  }
  
  /**
   * Apply query variation learning
   * @private
   * @param {Array} feedbackRecords - Feedback records
   * @returns {Promise<Object>} - Application results
   */
  async _applyVariationLearning(feedbackRecords) {
    try {
      // Skip if no variations to apply
      if (this.feedbackMemory.variations.length === 0) {
        return { applied: 0 };
      }
      
      // Filter to confident variations
      const confidentVariations = this.feedbackMemory.variations.filter(
        v => v.confidence >= this.options.minFeedbackConfidence
      );
      
      let appliedCount = 0;
      
      // Apply each variation to the QueryVariationHandlerService
      for (const variation of confidentVariations) {
        // Extract pattern from original and corrected queries
        const patterns = this._extractVariationPatterns(variation.original, variation.corrected);
        
        if (patterns) {
          // Add new pattern or mapping
          if (patterns.type === 'colloquial') {
            // Add colloquial expression mapping
            this.queryVariationHandler.addColloquialMapping(
              patterns.original,
              patterns.corrected
            );
            appliedCount++;
          } else if (patterns.type === 'synonym') {
            // Add synonym mapping
            this.queryVariationHandler.addSynonym(
              patterns.original,
              patterns.corrected
            );
            appliedCount++;
          }
        }
      }
      
      return { applied: appliedCount };
    } catch (error) {
      this.logger.error(`Error applying variation learning: ${error.message}`);
      return { applied: 0, error: error.message };
    }
  }
  
  /**
   * Apply intent learning
   * @private
   * @param {Array} feedbackRecords - Feedback records
   * @returns {Promise<Object>} - Application results
   */
  async _applyIntentLearning(feedbackRecords) {
    try {
      // Skip if no intents to apply
      if (this.feedbackMemory.intents.length === 0) {
        return { applied: 0 };
      }
      
      // Filter to confident patterns
      const confidentPatterns = this.feedbackMemory.intents.filter(
        p => p.confidence >= this.options.minFeedbackConfidence
      );
      
      let appliedCount = 0;
      
      // Apply each pattern to the IntentClassifierService
      for (const pattern of confidentPatterns) {
        // Convert pattern to regex
        try {
          const patternRegex = this._patternToRegex(pattern.pattern);
          
          // Add intent pattern
          this.intentClassifier.addIntentPattern(
            pattern.intent,
            patternRegex
          );
          
          appliedCount++;
        } catch (regexError) {
          this.logger.warn(`Error creating regex from pattern: ${regexError.message}`);
        }
      }
      
      return { applied: appliedCount };
    } catch (error) {
      this.logger.error(`Error applying intent learning: ${error.message}`);
      return { applied: 0, error: error.message };
    }
  }
  
  /**
   * Apply entity learning
   * @private
   * @param {Array} feedbackRecords - Feedback records
   * @returns {Promise<Object>} - Application results
   */
  async _applyEntityLearning(feedbackRecords) {
    try {
      // Skip if no entity patterns to apply
      if (this.feedbackMemory.entities.length === 0) {
        return { applied: 0 };
      }
      
      // Filter to confident patterns
      const confidentPatterns = this.feedbackMemory.entities.filter(
        p => p.confidence >= this.options.minFeedbackConfidence
      );
      
      let appliedCount = 0;
      
      // Apply each pattern to the QueryParserService
      for (const pattern of confidentPatterns) {
        // Convert pattern to regex
        try {
          const patternRegex = this._patternToRegex(pattern.pattern);
          
          // Add entity definition
          this.queryParser.addEntityDefinition(
            pattern.entityType,
            pattern.entityType,
            [patternRegex],
            value => value // Simple normalization
          );
          
          appliedCount++;
        } catch (regexError) {
          this.logger.warn(`Error creating regex from pattern: ${regexError.message}`);
        }
      }
      
      return { applied: appliedCount };
    } catch (error) {
      this.logger.error(`Error applying entity learning: ${error.message}`);
      return { applied: 0, error: error.message };
    }
  }
  
  /**
   * Check if a variation exists
   * @private
   * @param {string} original - Original query
   * @param {string} corrected - Corrected query
   * @returns {boolean} - Whether variation exists
   */
  _variationExists(original, corrected) {
    return this.feedbackMemory.variations.some(
      v => this._isSimilarVariation(v.original, original) && 
           this._isSimilarVariation(v.corrected, corrected)
    );
  }
  
  /**
   * Check if similar variation
   * @private
   * @param {string} pattern1 - First pattern
   * @param {string} pattern2 - Second pattern
   * @returns {boolean} - Whether patterns are similar
   */
  _isSimilarVariation(pattern1, pattern2) {
    // Simple similarity check (exact match)
    if (pattern1 === pattern2) {
      return true;
    }
    
    // Normalize both patterns
    const normalized1 = pattern1.toLowerCase().trim();
    const normalized2 = pattern2.toLowerCase().trim();
    
    if (normalized1 === normalized2) {
      return true;
    }
    
    // Check if they're almost the same (allowing for minor differences)
    // This is a simple approach, could be more sophisticated
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const distance = this._levenshteinDistance(normalized1, normalized2);
    
    // If difference is less than 20% of max length
    return distance / maxLength < 0.2;
  }
  
  /**
   * Check if intent pattern exists
   * @private
   * @param {string} pattern - Query pattern
   * @param {string} intent - Intent name
   * @returns {boolean} - Whether pattern exists
   */
  _intentPatternExists(pattern, intent) {
    return this.feedbackMemory.intents.some(
      i => this._isSimilarVariation(i.pattern, pattern) && i.intent === intent
    );
  }
  
  /**
   * Check if entity pattern exists
   * @private
   * @param {string} pattern - Context pattern
   * @param {string} entityType - Entity type
   * @param {string} entityValue - Entity value
   * @returns {boolean} - Whether pattern exists
   */
  _entityPatternExists(pattern, entityType, entityValue) {
    return this.feedbackMemory.entities.some(
      e => this._isSimilarVariation(e.pattern, pattern) && 
           e.entityType === entityType &&
           e.entityValue === entityValue
    );
  }
  
  /**
   * Extract context around entity
   * @private
   * @param {string} query - Query text
   * @param {string} entityValue - Entity value
   * @returns {string|null} - Context pattern or null
   */
  _extractEntityContext(query, entityValue) {
    if (!query || !entityValue) {
      return null;
    }
    
    // Find entity in query
    const index = query.toLowerCase().indexOf(entityValue.toLowerCase());
    if (index < 0) {
      return null;
    }
    
    // Extract context (words before and after)
    // This is a simple approach - could be more sophisticated
    const words = query.split(/\s+/);
    const entityWords = entityValue.split(/\s+/);
    
    let entityIndex = -1;
    for (let i = 0; i <= words.length - entityWords.length; i++) {
      if (words.slice(i, i + entityWords.length).join(' ').toLowerCase() === entityValue.toLowerCase()) {
        entityIndex = i;
        break;
      }
    }
    
    if (entityIndex < 0) {
      return null;
    }
    
    // Get context words (up to 2 before, 2 after)
    const beforeWords = words.slice(Math.max(0, entityIndex - 2), entityIndex);
    const afterWords = words.slice(entityIndex + entityWords.length, entityIndex + entityWords.length + 2);
    
    // Create pattern
    return [...beforeWords, '(.*?)', ...afterWords].join(' ');
  }
  
  /**
   * Extract variation patterns
   * @private
   * @param {string} original - Original query
   * @param {string} corrected - Corrected query
   * @returns {Object|null} - Extracted patterns or null
   */
  _extractVariationPatterns(original, corrected) {
    try {
      // Simple word replacement
      const originalWords = original.toLowerCase().split(/\s+/);
      const correctedWords = corrected.toLowerCase().split(/\s+/);
      
      // Find word differences
      const diff = originalWords.filter(w => !correctedWords.includes(w));
      const correctedDiff = correctedWords.filter(w => !originalWords.includes(w));
      
      if (diff.length === 1 && correctedDiff.length === 1) {
        // Simple synonym replacement
        return {
          type: 'synonym',
          original: diff[0],
          corrected: correctedDiff[0]
        };
      }
      
      // Phrase replacement
      if (originalWords.length > 2 && correctedWords.length > 0) {
        const originalPhrase = originalWords.join(' ');
        const correctedPhrase = correctedWords.join(' ');
        
        // Check if this looks like a colloquial expression
        const colloquialIndicators = ['whats', "what's", 'hows', "how's", 'gimme', 'show me', 'tell me about'];
        
        if (colloquialIndicators.some(i => originalPhrase.includes(i))) {
          return {
            type: 'colloquial',
            original: originalPhrase,
            corrected: correctedPhrase
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error extracting variation patterns: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Convert pattern to regex
   * @private
   * @param {string} pattern - Pattern string
   * @returns {RegExp} - Regex pattern
   */
  _patternToRegex(pattern) {
    // Escape special regex characters
    let escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace common wildcards with regex equivalent
    escapedPattern = escapedPattern.replace(/\\\(\.\\\*\\\?\\\)/g, '(.+?)');
    
    // Create regex
    return new RegExp(`\\b${escapedPattern}\\b`, 'i');
  }
  
  /**
   * Calculate Levenshtein distance between strings
   * @private
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} - Distance
   */
  _levenshteinDistance(a, b) {
    const matrix = [];
    
    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Substitution
            matrix[i][j - 1] + 1,     // Insertion
            matrix[i - 1][j] + 1      // Deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Identify common issues from feedback
   * @private
   * @param {Array} feedback - Feedback records
   * @returns {Array} - Common issues
   */
  _identifyCommonIssues(feedback) {
    const issues = [];
    
    // Group negative feedback by type
    const negativeFeedback = feedback.filter(f => f.rating <= 2);
    
    // Group by feedback type
    const byType = {};
    for (const item of negativeFeedback) {
      const type = item.feedbackType || 'general';
      byType[type] = byType[type] || [];
      byType[type].push(item);
    }
    
    // Identify common patterns in each type
    for (const [type, items] of Object.entries(byType)) {
      if (items.length < 3) {
        continue; // Need at least 3 instances to be considered common
      }
      
      // Analyze based on type
      switch (type) {
        case 'intent':
          // Group by original intent
          const intentIssues = {};
          for (const item of items) {
            const intent = item.parsedQuery?.intent || 'unknown';
            intentIssues[intent] = intentIssues[intent] || { count: 0, examples: [] };
            intentIssues[intent].count++;
            
            if (intentIssues[intent].examples.length < 3) {
              intentIssues[intent].examples.push({
                query: item.query,
                correction: item.correction?.intent
              });
            }
          }
          
          // Add significant issues
          for (const [intent, data] of Object.entries(intentIssues)) {
            if (data.count >= 3) {
              issues.push({
                type: 'intent',
                description: `Intent '${intent}' is frequently misclassified`,
                occurrences: data.count,
                examples: data.examples
              });
            }
          }
          break;
          
        case 'entity':
          // Group by entity type
          const entityIssues = {};
          for (const item of items) {
            // Determine which entity types have issues
            const originalEntities = item.parsedQuery?.entities || {};
            const correctedEntities = item.correction?.entities || {};
            
            // Check each corrected entity
            for (const [entityType, entityValue] of Object.entries(correctedEntities)) {
              const originalValue = originalEntities[entityType];
              
              // Skip if no change
              if (originalValue === entityValue) {
                continue;
              }
              
              entityIssues[entityType] = entityIssues[entityType] || { count: 0, examples: [] };
              entityIssues[entityType].count++;
              
              if (entityIssues[entityType].examples.length < 3) {
                entityIssues[entityType].examples.push({
                  query: item.query,
                  original: originalValue,
                  correction: entityValue
                });
              }
            }
          }
          
          // Add significant issues
          for (const [entityType, data] of Object.entries(entityIssues)) {
            if (data.count >= 3) {
              issues.push({
                type: 'entity',
                description: `Entity type '${entityType}' is frequently misidentified`,
                occurrences: data.count,
                examples: data.examples
              });
            }
          }
          break;
          
        case 'variation':
          // Just count total variation issues
          issues.push({
            type: 'variation',
            description: 'Query variations are frequently misunderstood',
            occurrences: items.length,
            examples: items.slice(0, 3).map(item => ({
              original: item.query,
              correction: item.correction?.query
            }))
          });
          break;
      }
    }
    
    return issues;
  }
  
  /**
   * Calculate improvement trend over time
   * @private
   * @param {Array} feedback - Feedback records
   * @returns {Object} - Trend data
   */
  _calculateImprovementTrend(feedback) {
    // Group feedback by week
    const byWeek = {};
    
    for (const item of feedback) {
      const date = new Date(item.timestamp);
      const weekKey = `${date.getFullYear()}-${Math.floor(date.getMonth() / 4) + 1}Q${Math.floor(date.getDate() / 7) + 1}W`;
      
      byWeek[weekKey] = byWeek[weekKey] || { 
        total: 0, 
        positive: 0, 
        neutral: 0, 
        negative: 0, 
        averageRating: 0, 
        totalRating: 0
      };
      
      byWeek[weekKey].total++;
      
      if (item.rating >= 4) byWeek[weekKey].positive++;
      else if (item.rating <= 2) byWeek[weekKey].negative++;
      else byWeek[weekKey].neutral++;
      
      byWeek[weekKey].totalRating += item.rating;
    }
    
    // Calculate averages and format for output
    const trend = [];
    
    for (const [week, data] of Object.entries(byWeek)) {
      data.averageRating = data.totalRating / data.total;
      
      trend.push({
        period: week,
        total: data.total,
        positive: data.positive,
        negative: data.negative,
        averageRating: data.averageRating,
        positiveRate: data.positive / data.total
      });
    }
    
    // Sort by period
    trend.sort((a, b) => a.period.localeCompare(b.period));
    
    return trend;
  }
  
  /**
   * Update metrics from feedback
   * @private
   * @param {Object} feedbackRecord - Feedback record
   */
  _updateMetrics(feedbackRecord) {
    this.metrics.totalFeedback++;
    this.metrics.totalFeedbackScore += feedbackRecord.rating;
    this.metrics.averageFeedbackScore = this.metrics.totalFeedbackScore / this.metrics.totalFeedback;
    
    if (feedbackRecord.rating >= 4) {
      this.metrics.positiveFeedback++;
    } else if (feedbackRecord.rating <= 2) {
      this.metrics.negativeFeedback++;
    }
    
    // Count by feedback type
    if (feedbackRecord.feedbackType === 'intent') {
      this.metrics.intentFeedback++;
    } else if (feedbackRecord.feedbackType === 'entity') {
      this.metrics.entityFeedback++;
    } else if (feedbackRecord.feedbackType === 'variation') {
      this.metrics.variationFeedback++;
    }
  }
  
  /**
   * Load feedback data from storage
   * @private
   * @returns {Promise<void>}
   */
  async _loadFeedbackData() {
    try {
      // Load from working memory
      const storedData = await this.workingMemoryService.getSessionData(
        'global',
        'feedback_memory'
      );
      
      if (storedData) {
        this.feedbackMemory = {
          ...this.feedbackMemory,
          ...storedData,
          lastSyncTime: storedData.lastSyncTime || Date.now()
        };
        
        this.logger.info(`Loaded ${this.feedbackMemory.variations.length} variation patterns, ${this.feedbackMemory.intents.length} intent patterns, ${this.feedbackMemory.entities.length} entity patterns`);
      }
    } catch (error) {
      this.logger.error(`Error loading feedback data: ${error.message}`);
      // Non-critical error, continue with empty feedback memory
    }
  }
  
  /**
   * Save feedback data to storage
   * @private
   * @returns {Promise<void>}
   */
  async _saveFeedbackData() {
    try {
      // Update last sync time
      this.feedbackMemory.lastSyncTime = Date.now();
      
      // Save to working memory
      await this.workingMemoryService.storeSessionData(
        'global',
        'feedback_memory',
        this.feedbackMemory
      );
    } catch (error) {
      this.logger.error(`Error saving feedback data: ${error.message}`);
      // Non-critical error, continue
    }
  }
  
  /**
   * Get current metrics
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalFeedback: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      appliedLearning: 0,
      intentFeedback: 0,
      entityFeedback: 0,
      variationFeedback: 0,
      averageFeedbackScore: 0,
      totalFeedbackScore: 0
    };
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
    
    this.logger.info('QueryFeedbackService configuration updated', this.options);
  }
}

module.exports = new QueryFeedbackService();