/**
 * FeedbackLearningService.js
 * 
 * Service for processing and learning from user feedback to improve agent responses,
 * recommendations, and insights over time.
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

const logger = require('../../utils/logger');
const Feedback = require('../../models/agent/Feedback');
const UserPreference = require('../../models/agent/UserPreference');
const LongTermMemory = require('../../models/agent/LongTermMemory');
const { v4: uuidv4 } = require('uuid');

/**
 * Feedback Learning Service
 * 
 * Provides capabilities for:
 * - Processing explicit user feedback
 * - Learning from implicit user behavior
 * - Enhancing agent responses based on feedback history
 * - Personalization based on user preferences and feedback patterns
 * - Continuous improvement through feedback analysis
 */
class FeedbackLearningService {
  constructor(options = {}) {
    this.continuousLearningService = options.continuousLearningService;
    this.longTermMemoryService = options.longTermMemoryService;
    this.vectorSearchService = options.vectorSearchService;
    this.openAIService = options.openAIService;
    
    // Configuration for feedback learning
    this.config = {
      minSamplesForLearning: 5,
      feedbackWeightDecay: 0.95, // Weight decay factor for older feedback
      positiveFeedbackThreshold: 4, // Ratings >= 4 are considered positive
      negativeFeedbackThreshold: 2, // Ratings <= 2 are considered negative
      confidenceThreshold: 0.7, // Minimum confidence for applying learned patterns
      maxHistoricalSamples: 100, // Maximum number of historical feedback items to analyze
      learningRate: 0.05 // Rate at which new feedback influences existing patterns
    };
    
    // Initialize feedback pattern storage
    this.feedbackPatterns = new Map();
    this.userPreferencePatterns = new Map();
    
    logger.info('FeedbackLearningService initialized');
  }
  
  /**
   * Process explicit feedback from a user
   * @param {Object} feedback - Feedback details
   * @returns {Promise<Object>} - Processing result
   */
  async processFeedback(feedback) {
    try {
      logger.info(`Processing feedback for ${feedback.targetType} with rating ${feedback.rating}`);
      
      // Validate feedback
      this.validateFeedback(feedback);
      
      // Store feedback in the database
      const storedFeedback = await this.storeFeedback(feedback);
      
      // Learn from the feedback
      await this.learnFromFeedback(storedFeedback);
      
      // Update user preferences if appropriate
      if (this.shouldUpdatePreferences(storedFeedback)) {
        await this.updateUserPreferences(storedFeedback);
      }
      
      // Create a long-term memory record if the feedback is significant
      if (this.isSignificantFeedback(storedFeedback)) {
        await this.createLongTermMemory(storedFeedback);
      }
      
      // Mark feedback as processed
      await storedFeedback.markAsProcessed();
      
      return {
        success: true,
        feedbackId: storedFeedback.id,
        message: "Feedback processed successfully",
        patterns: this.extractLearnedPatterns(storedFeedback)
      };
    } catch (error) {
      logger.error(`Error processing feedback: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process implicit feedback based on user behavior
   * @param {Object} behavior - User behavior details
   * @returns {Promise<boolean>} - Success indicator
   */
  async processImplicitFeedback(behavior) {
    try {
      logger.debug(`Processing implicit feedback from ${behavior.type} behavior`);
      
      // Convert behavior to implicit feedback
      const implicitFeedback = this.convertBehaviorToFeedback(behavior);
      
      // Process the implicit feedback
      if (implicitFeedback) {
        await this.processFeedback(implicitFeedback);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error processing implicit feedback: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Enhance an agent response based on learned feedback patterns
   * @param {Object} baseResponse - Base response to enhance
   * @param {string} userId - User ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Enhanced response
   */
  async enhanceResponseWithLearning(baseResponse, userId, context) {
    try {
      logger.debug(`Enhancing response for user ${userId}`);
      
      // Get user preferences and feedback patterns
      const userPreferences = await this.getUserPreferences(userId);
      const relevantPatterns = await this.getRelevantFeedbackPatterns(userId, context);
      
      // Determine if we have enough data to enhance the response
      if (!userPreferences && relevantPatterns.length === 0) {
        logger.debug('No relevant patterns or preferences found for enhancement');
        return baseResponse;
      }
      
      // Apply personalization based on user preferences
      let enhancedResponse = this.applyPersonalization(baseResponse, userPreferences);
      
      // Apply learned patterns from feedback
      enhancedResponse = this.applyLearnedPatterns(enhancedResponse, relevantPatterns, context);
      
      // Apply semantic adjustments using OpenAI if available
      if (this.openAIService && relevantPatterns.length > 0) {
        enhancedResponse = await this.applySemanticAdjustments(enhancedResponse, relevantPatterns);
      }
      
      return enhancedResponse;
    } catch (error) {
      logger.error(`Error enhancing response: ${error.message}`);
      // Return the original response if enhancement fails
      return baseResponse;
    }
  }
  
  /**
   * Get user-specific response quality indicators
   * @param {string} userId - User ID
   * @param {string} responseType - Type of response
   * @returns {Promise<Object>} - Quality indicators
   */
  async getUserResponseQuality(userId, responseType = null) {
    try {
      // Query parameters
      const params = { userId };
      if (responseType) {
        params.targetType = responseType;
      }
      
      // Get user feedback for the specified type
      const feedback = await Feedback.query()
        .where(params)
        .orderBy('receivedAt', 'desc')
        .limit(50);
      
      if (!feedback || feedback.length === 0) {
        return {
          averageRating: null,
          totalFeedback: 0,
          feedbackDistribution: {},
          trendDirection: null
        };
      }
      
      // Calculate metrics
      const averageRating = feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length;
      
      // Calculate distribution
      const distribution = feedback.reduce((dist, item) => {
        dist[item.rating] = (dist[item.rating] || 0) + 1;
        return dist;
      }, {});
      
      // Calculate trend (comparing first half to second half)
      const midpoint = Math.floor(feedback.length / 2);
      const recentAvg = feedback.slice(0, midpoint).reduce((sum, item) => sum + item.rating, 0) / midpoint;
      const olderAvg = feedback.slice(midpoint).reduce((sum, item) => sum + item.rating, 0) / (feedback.length - midpoint);
      
      const trend = recentAvg > olderAvg ? 'improving' : 
                   recentAvg < olderAvg ? 'declining' : 'stable';
      
      return {
        averageRating,
        totalFeedback: feedback.length,
        feedbackDistribution: distribution,
        trendDirection: trend
      };
    } catch (error) {
      logger.error(`Error getting user response quality: ${error.message}`);
      return {
        averageRating: null,
        totalFeedback: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Get global application feedback metrics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Global metrics
   */
  async getGlobalFeedbackMetrics(options = {}) {
    try {
      const { timeframe = 30, targetType = null } = options;
      
      // Calculate date threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - timeframe);
      
      // Build query
      let query = Feedback.query()
        .where('receivedAt', '>=', thresholdDate.toISOString());
      
      if (targetType) {
        query = query.where('targetType', targetType);
      }
      
      // Execute query
      const feedback = await query;
      
      if (!feedback || feedback.length === 0) {
        return {
          timeframe,
          totalFeedback: 0,
          averageRating: null
        };
      }
      
      // Calculate metrics
      const averageRating = feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length;
      
      // Calculate distribution by type
      const typeDistribution = feedback.reduce((dist, item) => {
        dist[item.targetType] = dist[item.targetType] || { count: 0, totalRating: 0 };
        dist[item.targetType].count++;
        dist[item.targetType].totalRating += item.rating;
        return dist;
      }, {});
      
      // Calculate averages by type
      Object.keys(typeDistribution).forEach(type => {
        typeDistribution[type].averageRating = 
          typeDistribution[type].totalRating / typeDistribution[type].count;
      });
      
      return {
        timeframe,
        totalFeedback: feedback.length,
        averageRating,
        typeDistribution
      };
    } catch (error) {
      logger.error(`Error getting global feedback metrics: ${error.message}`);
      return {
        timeframe: options.timeframe || 30,
        error: error.message,
        totalFeedback: 0
      };
    }
  }
  
  /**
   * Store feedback in the database
   * @param {Object} feedback - Feedback to store
   * @returns {Promise<Object>} - Stored feedback record
   * @private
   */
  async storeFeedback(feedback) {
    try {
      // Create feedback record
      const feedbackRecord = await Feedback.query().insert({
        targetType: feedback.targetType,
        targetId: feedback.targetId,
        userId: feedback.userId,
        rating: feedback.rating,
        feedbackText: feedback.comment || null,
        metadata: feedback.metadata || {}
      });
      
      logger.debug(`Stored feedback with ID ${feedbackRecord.id}`);
      return feedbackRecord;
    } catch (error) {
      logger.error(`Error storing feedback: ${error.message}`);
      throw new Error(`Failed to store feedback: ${error.message}`);
    }
  }
  
  /**
   * Learn from feedback by updating feedback patterns
   * @param {Object} feedback - Feedback to learn from
   * @returns {Promise<void>}
   * @private
   */
  async learnFromFeedback(feedback) {
    try {
      // Get historical feedback for this user and target type
      const historicalFeedback = await Feedback.query()
        .where('userId', feedback.userId)
        .where('targetType', feedback.targetType)
        .orderBy('receivedAt', 'desc')
        .limit(this.config.maxHistoricalSamples);
      
      // Skip learning if we don't have enough samples
      if (historicalFeedback.length < this.config.minSamplesForLearning) {
        logger.debug(`Not enough historical feedback for learning (${historicalFeedback.length} samples)`);
        return;
      }
      
      // Extract patterns based on feedback type
      switch (feedback.targetType) {
        case 'response':
          await this.learnFromResponseFeedback(feedback, historicalFeedback);
          break;
        case 'insight':
          await this.learnFromInsightFeedback(feedback, historicalFeedback);
          break;
        case 'visualization':
          await this.learnFromVisualizationFeedback(feedback, historicalFeedback);
          break;
        case 'recommendation':
          await this.learnFromRecommendationFeedback(feedback, historicalFeedback);
          break;
        default:
          logger.debug(`No specialized learning for feedback type: ${feedback.targetType}`);
      }
      
      // If continuous learning service is available, submit for deeper analysis
      if (this.continuousLearningService) {
        await this.continuousLearningService.submitFeedback({
          ...feedback,
          source: 'explicit'
        });
      }
    } catch (error) {
      logger.error(`Error learning from feedback: ${error.message}`);
      // Continue without throwing - learning should not break feedback processing
    }
  }
  
  /**
   * Learn patterns from response feedback
   * @param {Object} feedback - Current feedback
   * @param {Array} historicalFeedback - Historical feedback
   * @returns {Promise<void>}
   * @private
   */
  async learnFromResponseFeedback(feedback, historicalFeedback) {
    const userId = feedback.userId;
    const userKey = `user:${userId}:response`;
    
    // Get or initialize user patterns
    let patterns = this.feedbackPatterns.get(userKey) || {
      responseStyle: {},
      contentPreferences: {},
      detailLevel: {},
      lastUpdated: new Date().toISOString()
    };
    
    // Analyze feedback
    if (feedback.metadata) {
      // Learn about response style preferences
      if (feedback.metadata.responseStyle) {
        const style = feedback.metadata.responseStyle;
        patterns.responseStyle[style] = patterns.responseStyle[style] || { count: 0, totalRating: 0 };
        patterns.responseStyle[style].count++;
        patterns.responseStyle[style].totalRating += feedback.rating;
      }
      
      // Learn about content preferences
      if (feedback.metadata.contentType) {
        const contentType = feedback.metadata.contentType;
        patterns.contentPreferences[contentType] = patterns.contentPreferences[contentType] || { count: 0, totalRating: 0 };
        patterns.contentPreferences[contentType].count++;
        patterns.contentPreferences[contentType].totalRating += feedback.rating;
      }
      
      // Learn about detail level preferences
      if (feedback.metadata.detailLevel) {
        const detailLevel = feedback.metadata.detailLevel;
        patterns.detailLevel[detailLevel] = patterns.detailLevel[detailLevel] || { count: 0, totalRating: 0 };
        patterns.detailLevel[detailLevel].count++;
        patterns.detailLevel[detailLevel].totalRating += feedback.rating;
      }
    }
    
    // Calculate preferred patterns
    patterns.preferredStyle = this.calculatePreference(patterns.responseStyle);
    patterns.preferredContent = this.calculatePreference(patterns.contentPreferences);
    patterns.preferredDetailLevel = this.calculatePreference(patterns.detailLevel);
    patterns.lastUpdated = new Date().toISOString();
    
    // Store updated patterns
    this.feedbackPatterns.set(userKey, patterns);
  }
  
  /**
   * Learn patterns from insight feedback
   * @param {Object} feedback - Current feedback
   * @param {Array} historicalFeedback - Historical feedback
   * @returns {Promise<void>}
   * @private
   */
  async learnFromInsightFeedback(feedback, historicalFeedback) {
    const userId = feedback.userId;
    const userKey = `user:${userId}:insight`;
    
    // Get or initialize user patterns
    let patterns = this.feedbackPatterns.get(userKey) || {
      insightCategories: {},
      insightPriorities: {},
      lastUpdated: new Date().toISOString()
    };
    
    // Analyze feedback
    if (feedback.metadata) {
      // Learn about insight category preferences
      if (feedback.metadata.category) {
        const category = feedback.metadata.category;
        patterns.insightCategories[category] = patterns.insightCategories[category] || { count: 0, totalRating: 0 };
        patterns.insightCategories[category].count++;
        patterns.insightCategories[category].totalRating += feedback.rating;
      }
      
      // Learn about priority level preferences
      if (feedback.metadata.priority) {
        const priority = feedback.metadata.priority;
        patterns.insightPriorities[priority] = patterns.insightPriorities[priority] || { count: 0, totalRating: 0 };
        patterns.insightPriorities[priority].count++;
        patterns.insightPriorities[priority].totalRating += feedback.rating;
      }
    }
    
    // Calculate preferred patterns
    patterns.preferredCategories = this.rankPreferences(patterns.insightCategories, 3);
    patterns.preferredPriorities = this.rankPreferences(patterns.insightPriorities, 3);
    patterns.lastUpdated = new Date().toISOString();
    
    // Store updated patterns
    this.feedbackPatterns.set(userKey, patterns);
  }
  
  /**
   * Learn patterns from visualization feedback
   * @param {Object} feedback - Current feedback
   * @param {Array} historicalFeedback - Historical feedback
   * @returns {Promise<void>}
   * @private
   */
  async learnFromVisualizationFeedback(feedback, historicalFeedback) {
    const userId = feedback.userId;
    const userKey = `user:${userId}:visualization`;
    
    // Get or initialize user patterns
    let patterns = this.feedbackPatterns.get(userKey) || {
      visualizationTypes: {},
      colorSchemes: {},
      dataGranularity: {},
      lastUpdated: new Date().toISOString()
    };
    
    // Analyze feedback
    if (feedback.metadata) {
      // Learn about visualization type preferences
      if (feedback.metadata.visualType) {
        const visualType = feedback.metadata.visualType;
        patterns.visualizationTypes[visualType] = patterns.visualizationTypes[visualType] || { count: 0, totalRating: 0 };
        patterns.visualizationTypes[visualType].count++;
        patterns.visualizationTypes[visualType].totalRating += feedback.rating;
      }
      
      // Learn about color scheme preferences
      if (feedback.metadata.colorScheme) {
        const colorScheme = feedback.metadata.colorScheme;
        patterns.colorSchemes[colorScheme] = patterns.colorSchemes[colorScheme] || { count: 0, totalRating: 0 };
        patterns.colorSchemes[colorScheme].count++;
        patterns.colorSchemes[colorScheme].totalRating += feedback.rating;
      }
      
      // Learn about data granularity preferences
      if (feedback.metadata.dataGranularity) {
        const dataGranularity = feedback.metadata.dataGranularity;
        patterns.dataGranularity[dataGranularity] = patterns.dataGranularity[dataGranularity] || { count: 0, totalRating: 0 };
        patterns.dataGranularity[dataGranularity].count++;
        patterns.dataGranularity[dataGranularity].totalRating += feedback.rating;
      }
    }
    
    // Calculate preferred patterns
    patterns.preferredVisualType = this.calculatePreference(patterns.visualizationTypes);
    patterns.preferredColorScheme = this.calculatePreference(patterns.colorSchemes);
    patterns.preferredDataGranularity = this.calculatePreference(patterns.dataGranularity);
    patterns.lastUpdated = new Date().toISOString();
    
    // Store updated patterns
    this.feedbackPatterns.set(userKey, patterns);
  }
  
  /**
   * Learn patterns from recommendation feedback
   * @param {Object} feedback - Current feedback
   * @param {Array} historicalFeedback - Historical feedback
   * @returns {Promise<void>}
   * @private
   */
  async learnFromRecommendationFeedback(feedback, historicalFeedback) {
    const userId = feedback.userId;
    const userKey = `user:${userId}:recommendation`;
    
    // Get or initialize user patterns
    let patterns = this.feedbackPatterns.get(userKey) || {
      recommendationTypes: {},
      actionCategories: {},
      implementationDifficulty: {},
      lastUpdated: new Date().toISOString()
    };
    
    // Analyze feedback
    if (feedback.metadata) {
      // Learn about recommendation type preferences
      if (feedback.metadata.recommendationType) {
        const recType = feedback.metadata.recommendationType;
        patterns.recommendationTypes[recType] = patterns.recommendationTypes[recType] || { count: 0, totalRating: 0 };
        patterns.recommendationTypes[recType].count++;
        patterns.recommendationTypes[recType].totalRating += feedback.rating;
      }
      
      // Learn about action category preferences
      if (feedback.metadata.actionCategory) {
        const actionCat = feedback.metadata.actionCategory;
        patterns.actionCategories[actionCat] = patterns.actionCategories[actionCat] || { count: 0, totalRating: 0 };
        patterns.actionCategories[actionCat].count++;
        patterns.actionCategories[actionCat].totalRating += feedback.rating;
      }
      
      // Learn about implementation difficulty preferences
      if (feedback.metadata.difficulty) {
        const difficulty = feedback.metadata.difficulty;
        patterns.implementationDifficulty[difficulty] = patterns.implementationDifficulty[difficulty] || { count: 0, totalRating: 0 };
        patterns.implementationDifficulty[difficulty].count++;
        patterns.implementationDifficulty[difficulty].totalRating += feedback.rating;
      }
    }
    
    // Calculate preferred patterns
    patterns.preferredRecTypes = this.rankPreferences(patterns.recommendationTypes, 3);
    patterns.preferredActionCategories = this.rankPreferences(patterns.actionCategories, 3);
    patterns.preferredDifficulty = this.calculatePreference(patterns.implementationDifficulty);
    patterns.lastUpdated = new Date().toISOString();
    
    // Store updated patterns
    this.feedbackPatterns.set(userKey, patterns);
  }
  
  /**
   * Update user preferences based on feedback
   * @param {Object} feedback - Feedback data
   * @returns {Promise<boolean>} - Success indicator
   * @private
   */
  async updateUserPreferences(feedback) {
    try {
      // Get current user preferences
      let userPreference = await UserPreference.query().findById(feedback.userId);
      
      // Create if doesn't exist
      if (!userPreference) {
        userPreference = await UserPreference.query().insert({
          userId: feedback.userId,
          preferences: {}
        });
      }
      
      // Extract preference updates from feedback
      const preferenceUpdates = this.extractPreferenceUpdates(feedback);
      
      // If we have updates, apply them
      if (Object.keys(preferenceUpdates).length > 0) {
        await userPreference.updatePreferences(preferenceUpdates);
        logger.debug(`Updated preferences for user ${feedback.userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error updating user preferences: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Create a long-term memory record from significant feedback
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} - Created memory record
   * @private
   */
  async createLongTermMemory(feedback) {
    try {
      // Only create memory for significant feedback
      if (!this.isSignificantFeedback(feedback)) {
        return null;
      }
      
      // Determine memory type and importance
      const memoryType = feedback.rating >= 4 ? 'positive_feedback' : 'negative_feedback';
      const importance = feedback.rating === 5 || feedback.rating === 1 ? 'high' : 'medium';
      
      // Create memory content
      let content = feedback.feedbackText || '';
      
      if (!content) {
        content = feedback.rating >= 4 
          ? `User liked the ${feedback.targetType} with ID ${feedback.targetId}`
          : `User disliked the ${feedback.targetType} with ID ${feedback.targetId}`;
      }
      
      // Add metadata context
      if (feedback.metadata && Object.keys(feedback.metadata).length > 0) {
        content += `. Context: ${JSON.stringify(feedback.metadata)}`;
      }
      
      // Create memory record
      const memory = await LongTermMemory.query().insert({
        userId: feedback.userId,
        memoryType,
        importance,
        content,
        metadata: {
          targetType: feedback.targetType,
          targetId: feedback.targetId,
          rating: feedback.rating,
          originalFeedbackId: feedback.id
        }
      });
      
      logger.debug(`Created long-term memory ${memory.id} from feedback`);
      return memory;
    } catch (error) {
      logger.error(`Error creating long-term memory: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get user preferences for enhancing responses
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User preferences
   * @private
   */
  async getUserPreferences(userId) {
    try {
      const userPreference = await UserPreference.query().findById(userId);
      
      if (!userPreference) {
        return null;
      }
      
      return userPreference.preferences;
    } catch (error) {
      logger.error(`Error getting user preferences: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get relevant feedback patterns for the current context
   * @param {string} userId - User ID
   * @param {Object} context - Request context
   * @returns {Promise<Array>} - Relevant patterns
   * @private
   */
  async getRelevantFeedbackPatterns(userId, context) {
    const relevantPatterns = [];
    
    // Get user-specific patterns for different target types
    const targetTypes = ['response', 'insight', 'visualization', 'recommendation'];
    
    for (const type of targetTypes) {
      const userKey = `user:${userId}:${type}`;
      const patterns = this.feedbackPatterns.get(userKey);
      
      if (patterns) {
        relevantPatterns.push({
          type,
          patterns
        });
      }
    }
    
    // Get global patterns if available and we don't have enough user-specific patterns
    if (relevantPatterns.length < 2 && this.continuousLearningService) {
      try {
        const globalPatterns = await this.continuousLearningService.getInsights({
          limit: 5
        });
        
        if (globalPatterns && globalPatterns.length > 0) {
          relevantPatterns.push({
            type: 'global',
            patterns: globalPatterns
          });
        }
      } catch (error) {
        logger.debug(`Error getting global patterns: ${error.message}`);
      }
    }
    
    return relevantPatterns;
  }
  
  /**
   * Apply personalization to a response based on user preferences
   * @param {Object} response - Base response
   * @param {Object} preferences - User preferences
   * @returns {Object} - Personalized response
   * @private
   */
  applyPersonalization(response, preferences) {
    // If no preferences, return original response
    if (!preferences) {
      return response;
    }
    
    // Clone the response to avoid modifying the original
    const enhancedResponse = { ...response };
    
    // Apply data presentation preference
    if (preferences.dataPresentation && enhancedResponse.visualizations) {
      // Adjust visualization order based on preference
      if (preferences.dataPresentation === 'chart' && enhancedResponse.visualizations.length > 0) {
        // Move charts to the beginning
        const charts = enhancedResponse.visualizations.filter(v => 
          v.type === 'barChart' || v.type === 'lineChart' || v.type === 'pieChart');
        const others = enhancedResponse.visualizations.filter(v => 
          v.type !== 'barChart' && v.type !== 'lineChart' && v.type !== 'pieChart');
        
        enhancedResponse.visualizations = [...charts, ...others];
      } else if (preferences.dataPresentation === 'table' && enhancedResponse.visualizations.length > 0) {
        // Move tables to the beginning
        const tables = enhancedResponse.visualizations.filter(v => v.type === 'table');
        const others = enhancedResponse.visualizations.filter(v => v.type !== 'table');
        
        enhancedResponse.visualizations = [...tables, ...others];
      }
    }
    
    // Apply advanced mode preference if available
    if (preferences.advancedMode !== undefined && enhancedResponse.rawData) {
      enhancedResponse.showRawData = preferences.advancedMode;
    }
    
    return enhancedResponse;
  }
  
  /**
   * Apply learned patterns to enhance a response
   * @param {Object} response - Base response
   * @param {Array} patterns - Learned patterns
   * @param {Object} context - Request context
   * @returns {Object} - Enhanced response
   * @private
   */
  applyLearnedPatterns(response, patterns, context) {
    // If no patterns, return original response
    if (!patterns || patterns.length === 0) {
      return response;
    }
    
    // Clone the response to avoid modifying the original
    const enhancedResponse = { ...response };
    
    // Apply visualization preferences if applicable
    const vizPatterns = patterns.find(p => p.type === 'visualization');
    if (vizPatterns && enhancedResponse.visualizations && enhancedResponse.visualizations.length > 0) {
      // Select preferred visualization type if available
      if (vizPatterns.patterns.preferredVisualType) {
        const preferredType = this.mapVisualizationType(vizPatterns.patterns.preferredVisualType);
        
        // Find if we have a visualization of the preferred type
        const hasPreferred = enhancedResponse.visualizations.some(v => v.type === preferredType);
        
        // If we have a preferred visualization, move it to the top
        if (hasPreferred) {
          const preferred = enhancedResponse.visualizations.filter(v => v.type === preferredType);
          const others = enhancedResponse.visualizations.filter(v => v.type !== preferredType);
          
          enhancedResponse.visualizations = [...preferred, ...others];
        }
      }
    }
    
    // Apply response preferences if applicable
    const responsePatterns = patterns.find(p => p.type === 'response');
    if (responsePatterns && responsePatterns.patterns.preferredDetailLevel) {
      enhancedResponse.metadata = enhancedResponse.metadata || {};
      enhancedResponse.metadata.preferredDetailLevel = responsePatterns.patterns.preferredDetailLevel;
    }
    
    return enhancedResponse;
  }
  
  /**
   * Apply semantic adjustments to response text based on patterns
   * @param {Object} response - Base response
   * @param {Array} patterns - Learned patterns
   * @returns {Promise<Object>} - Semantically adjusted response
   * @private
   */
  async applySemanticAdjustments(response, patterns) {
    // Clone the response to avoid modifying the original
    const enhancedResponse = { ...response };
    
    // Only proceed if we have a response text and OpenAI service
    if (!enhancedResponse.text || !this.openAIService) {
      return enhancedResponse;
    }
    
    // Extract most relevant patterns
    const responsePatterns = patterns.find(p => p.type === 'response');
    
    // Skip if no response patterns found
    if (!responsePatterns) {
      return enhancedResponse;
    }
    
    try {
      // Create a prompt for adjusting the response
      const prompt = `
      Original response: "${enhancedResponse.text}"
      
      User preferences: ${JSON.stringify({
        responseStyle: responsePatterns.patterns.preferredStyle || 'informative',
        detailLevel: responsePatterns.patterns.preferredDetailLevel || 'balanced'
      })}
      
      Adjust the response to better match the user's preferred style and detail level, while
      preserving all factual information. Keep the same meaning and information, but
      adapt the tone, structure, and level of detail.
      
      Adjusted response:
      `;
      
      // Get the adjusted response from OpenAI
      const result = await this.openAIService.processQuery(prompt);
      
      if (result && result.text) {
        enhancedResponse.text = result.text.trim();
        
        // Add metadata to show an adjustment was made
        enhancedResponse.metadata = enhancedResponse.metadata || {};
        enhancedResponse.metadata.semanticallyAdjusted = true;
      }
    } catch (error) {
      logger.error(`Error applying semantic adjustments: ${error.message}`);
      // Return the original response text if adjustment fails
    }
    
    return enhancedResponse;
  }
  
  /**
   * Check if feedback is significant enough to create a long-term memory
   * @param {Object} feedback - Feedback to check
   * @returns {boolean} - True if significant
   * @private
   */
  isSignificantFeedback(feedback) {
    // Consider feedback significant if it's very positive or negative
    if (feedback.rating === 5 || feedback.rating === 1) {
      return true;
    }
    
    // Also significant if it contains text feedback
    if (feedback.feedbackText && feedback.feedbackText.length > 10) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if we should update user preferences based on feedback
   * @param {Object} feedback - Feedback to check
   * @returns {boolean} - True if should update
   * @private
   */
  shouldUpdatePreferences(feedback) {
    // Update preferences for very positive feedback (ratings 4-5)
    return feedback.rating >= 4 && feedback.metadata && Object.keys(feedback.metadata).length > 0;
  }
  
  /**
   * Extract preference updates from feedback
   * @param {Object} feedback - Feedback data
   * @returns {Object} - Preference updates
   * @private
   */
  extractPreferenceUpdates(feedback) {
    const updates = {};
    
    // Only extract from metadata
    if (!feedback.metadata) {
      return updates;
    }
    
    // Extract standard preference fields
    const preferenceFields = [
      'theme', 'defaultAirport', 'defaultTimeHorizon', 'dataPresentation'
    ];
    
    for (const field of preferenceFields) {
      if (feedback.metadata[field]) {
        updates[field] = feedback.metadata[field];
      }
    }
    
    // Only update for positive feedback
    if (feedback.rating <= 3) {
      return {};
    }
    
    // Special mapping for visualization preferences
    if (feedback.targetType === 'visualization' && feedback.metadata.visualType) {
      updates.dataPresentation = this.visualTypeToDataPresentation(feedback.metadata.visualType);
    }
    
    return updates;
  }
  
  /**
   * Map visualization type to data presentation preference
   * @param {string} visualType - Visualization type
   * @returns {string} - Data presentation preference
   * @private
   */
  visualTypeToDataPresentation(visualType) {
    switch (visualType) {
      case 'barChart':
      case 'lineChart':
      case 'pieChart':
        return 'chart';
      case 'table':
        return 'table';
      case 'map':
        return 'map';
      default:
        return 'chart';
    }
  }
  
  /**
   * Map preferred visualization type to actual type
   * @param {string} preferred - Preferred type name
   * @returns {string} - Actual visualization type
   * @private
   */
  mapVisualizationType(preferred) {
    // Map from preference names to actual visualization types
    const typeMap = {
      'bar': 'barChart',
      'bars': 'barChart',
      'barchart': 'barChart',
      'line': 'lineChart',
      'lines': 'lineChart',
      'linechart': 'lineChart',
      'pie': 'pieChart',
      'piechart': 'pieChart',
      'table': 'table',
      'datatable': 'table',
      'map': 'map'
    };
    
    return typeMap[preferred.toLowerCase()] || preferred;
  }
  
  /**
   * Calculate the most preferred option from a set of options
   * @param {Object} options - Options with counts and ratings
   * @returns {string|null} - Preferred option or null
   * @private
   */
  calculatePreference(options) {
    if (!options || Object.keys(options).length === 0) {
      return null;
    }
    
    let bestOption = null;
    let bestScore = -Infinity;
    
    for (const [option, data] of Object.entries(options)) {
      if (data.count < 2) continue; // Need at least 2 samples
      
      const averageRating = data.totalRating / data.count;
      const score = averageRating * Math.log(data.count + 1); // Weight by count logarithmically
      
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
    
    return bestOption;
  }
  
  /**
   * Rank preferences by score
   * @param {Object} options - Options with counts and ratings
   * @param {number} limit - Maximum items to return
   * @returns {Array} - Ranked preferences
   * @private
   */
  rankPreferences(options, limit = 3) {
    if (!options || Object.keys(options).length === 0) {
      return [];
    }
    
    const scores = [];
    
    for (const [option, data] of Object.entries(options)) {
      if (data.count < 2) continue; // Need at least 2 samples
      
      const averageRating = data.totalRating / data.count;
      const score = averageRating * Math.log(data.count + 1); // Weight by count logarithmically
      
      scores.push({ option, score });
    }
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    // Return top N options
    return scores.slice(0, limit).map(item => item.option);
  }
  
  /**
   * Extract learned patterns from feedback
   * @param {Object} feedback - Feedback data
   * @returns {Object} - Extracted patterns
   * @private
   */
  extractLearnedPatterns(feedback) {
    const userId = feedback.userId;
    const userKey = `user:${userId}:${feedback.targetType}`;
    
    // Get patterns for this user and target type
    const patterns = this.feedbackPatterns.get(userKey);
    
    if (!patterns) {
      return {
        hasPatterns: false,
        message: 'Not enough feedback to establish patterns'
      };
    }
    
    // Return relevant patterns based on feedback type
    switch (feedback.targetType) {
      case 'response':
        return {
          hasPatterns: true,
          preferredStyle: patterns.preferredStyle,
          preferredDetailLevel: patterns.preferredDetailLevel
        };
      case 'insight':
        return {
          hasPatterns: true,
          preferredCategories: patterns.preferredCategories,
          preferredPriorities: patterns.preferredPriorities
        };
      case 'visualization':
        return {
          hasPatterns: true,
          preferredVisualType: patterns.preferredVisualType,
          preferredColorScheme: patterns.preferredColorScheme
        };
      case 'recommendation':
        return {
          hasPatterns: true,
          preferredRecTypes: patterns.preferredRecTypes,
          preferredDifficulty: patterns.preferredDifficulty
        };
      default:
        return {
          hasPatterns: false,
          message: 'No patterns available for this feedback type'
        };
    }
  }
  
  /**
   * Convert user behavior to implicit feedback
   * @param {Object} behavior - User behavior
   * @returns {Object|null} - Implicit feedback or null
   * @private
   */
  convertBehaviorToFeedback(behavior) {
    // Skip if essential information is missing
    if (!behavior.type || !behavior.targetId || !behavior.userId) {
      return null;
    }
    
    // Convert behavior type to implicit rating
    let implicitRating = 3; // Default neutral
    
    switch (behavior.type) {
      case 'click':
        implicitRating = 3.5; // Slightly positive
        break;
      case 'save':
        implicitRating = 4; // Positive
        break;
      case 'share':
        implicitRating = 4.5; // Very positive
        break;
      case 'implement':
        implicitRating = 5; // Extremely positive
        break;
      case 'dismiss':
        implicitRating = 2; // Negative
        break;
      case 'ignore':
        implicitRating = 2.5; // Slightly negative
        break;
    }
    
    // Create implicit feedback
    return {
      targetType: behavior.targetType || 'unknown',
      targetId: behavior.targetId,
      userId: behavior.userId,
      rating: implicitRating,
      metadata: {
        ...behavior.metadata,
        behaviorType: behavior.type,
        implicit: true
      }
    };
  }
  
  /**
   * Validate feedback object
   * @param {Object} feedback - Feedback to validate
   * @throws {Error} If feedback is invalid
   * @private
   */
  validateFeedback(feedback) {
    if (!feedback.targetType) {
      throw new Error('Target type is required');
    }
    
    if (!feedback.targetId) {
      throw new Error('Target ID is required');
    }
    
    if (!feedback.userId) {
      throw new Error('User ID is required');
    }
    
    if (feedback.rating === undefined || feedback.rating < 1 || feedback.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  }
}

module.exports = FeedbackLearningService;