/**
 * Tests for QueryFeedbackService
 * 
 * This focuses on testing the QueryFeedbackService as a singleton instance,
 * not as a class, since that's how it's exported from the module.
 */

// Import the module - it's a singleton instance
const QueryFeedbackService = require('../../../src/services/agent/QueryFeedbackService');

// Mock the dependencies
jest.mock('../../../src/services/agent/WorkingMemoryService');
jest.mock('../../../src/services/agent/OpenAIService');
jest.mock('../../../src/services/agent/QueryVariationHandlerService');
jest.mock('../../../src/services/agent/IntentClassifierService');
jest.mock('../../../src/services/agent/QueryParserService');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('QueryFeedbackService', () => {
  // Before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset service internal state
    QueryFeedbackService.options = {
      learningEnabled: true,
      feedbackHistoryLimit: 10,
      feedbackAggregationThreshold: 10,
      minFeedbackConfidence: 0.7,
      syncInterval: 24 * 60 * 60 * 1000
    };
    
    QueryFeedbackService.metrics = {
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
    
    QueryFeedbackService.feedbackMemory = {
      variations: [],
      intents: [],
      entities: [],
      lastSyncTime: null
    };
    
    // Mock the internal methods
    QueryFeedbackService._storeFeedback = jest.fn().mockResolvedValue();
    QueryFeedbackService._processFeedbackForLearning = jest.fn().mockResolvedValue();
    QueryFeedbackService._getAllFeedback = jest.fn().mockResolvedValue([]);
    QueryFeedbackService._applyVariationLearning = jest.fn().mockResolvedValue({ applied: 0 });
    QueryFeedbackService._applyIntentLearning = jest.fn().mockResolvedValue({ applied: 0 });
    QueryFeedbackService._applyEntityLearning = jest.fn().mockResolvedValue({ applied: 0 });
    QueryFeedbackService._saveFeedbackData = jest.fn().mockResolvedValue();
    QueryFeedbackService._loadFeedbackData = jest.fn().mockResolvedValue();
    QueryFeedbackService._identifyCommonIssues = jest.fn().mockReturnValue([]);
    QueryFeedbackService._calculateImprovementTrend = jest.fn().mockReturnValue([]);
  });
  
  describe('submitFeedback', () => {
    it('should successfully submit feedback', async () => {
      // Prepare test data
      const feedbackData = {
        queryId: 'test-query-1',
        query: 'What is the airport capacity?',
        parsedQuery: { intent: 'get.capacity', entities: {} },
        rating: 4,
        feedbackType: 'intent',
        comments: 'Great answer'
      };
      
      const context = { sessionId: 'test-session' };
      
      // Call the method
      const result = await QueryFeedbackService.submitFeedback(feedbackData, context);
      
      // Verify results
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('feedbackId');
      expect(result.feedbackId).toContain('feedback-');
      expect(result).toHaveProperty('message', 'Feedback submitted successfully');
      
      // Verify internal methods were called
      expect(QueryFeedbackService._storeFeedback).toHaveBeenCalled();
      expect(QueryFeedbackService._processFeedbackForLearning).toHaveBeenCalled();
    });
    
    it('should reject feedback with missing required fields', async () => {
      const invalidFeedback = {
        query: 'What is the airport capacity?',
        rating: 4
        // Missing queryId
      };
      
      const result = await QueryFeedbackService.submitFeedback(invalidFeedback);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Missing required feedback fields');
    });
    
    it('should not process feedback for learning when disabled', async () => {
      // Disable learning
      QueryFeedbackService.options.learningEnabled = false;
      
      const feedbackData = {
        queryId: 'test-query-1',
        query: 'What is the airport capacity?',
        parsedQuery: { intent: 'get.capacity', entities: {} },
        rating: 4
      };
      
      await QueryFeedbackService.submitFeedback(feedbackData, { sessionId: 'test-session' });
      
      // Processing should not be called when learning is disabled
      expect(QueryFeedbackService._processFeedbackForLearning).not.toHaveBeenCalled();
    });
  });
  
  describe('applyFeedbackLearning', () => {
    it('should apply learning to all components', async () => {
      // Set up mocks for the apply methods
      QueryFeedbackService._applyVariationLearning.mockResolvedValue({ applied: 1 });
      QueryFeedbackService._applyIntentLearning.mockResolvedValue({ applied: 2 });
      QueryFeedbackService._applyEntityLearning.mockResolvedValue({ applied: 3 });
      
      const result = await QueryFeedbackService.applyFeedbackLearning('test-session');
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveProperty('variations', { applied: 1 });
      expect(result.results).toHaveProperty('intents', { applied: 2 });
      expect(result.results).toHaveProperty('entities', { applied: 3 });
      
      // Metrics should be updated
      expect(QueryFeedbackService.metrics.appliedLearning).toBe(1);
      
      // Feedback data should be saved
      expect(QueryFeedbackService._saveFeedbackData).toHaveBeenCalled();
    });
    
    it('should not apply learning when disabled', async () => {
      // Disable learning
      QueryFeedbackService.options.learningEnabled = false;
      
      const result = await QueryFeedbackService.applyFeedbackLearning('test-session');
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Feedback learning is not enabled');
      
      // Apply methods should not be called
      expect(QueryFeedbackService._applyVariationLearning).not.toHaveBeenCalled();
      expect(QueryFeedbackService._applyIntentLearning).not.toHaveBeenCalled();
      expect(QueryFeedbackService._applyEntityLearning).not.toHaveBeenCalled();
    });
  });
  
  describe('getFeedbackStatistics', () => {
    it('should calculate basic statistics', async () => {
      // Mock feedback data
      QueryFeedbackService._getAllFeedback.mockResolvedValue([
        { rating: 5, feedbackType: 'intent', timestamp: Date.now() },
        { rating: 4, feedbackType: 'intent', timestamp: Date.now() },
        { rating: 3, feedbackType: 'entity', timestamp: Date.now() },
        { rating: 2, feedbackType: 'variation', timestamp: Date.now() },
        { rating: 1, feedbackType: 'general', timestamp: Date.now() }
      ]);
      
      // Mock the analysis methods
      QueryFeedbackService._identifyCommonIssues.mockReturnValue([
        { type: 'intent', description: 'Common intent issue' }
      ]);
      
      QueryFeedbackService._calculateImprovementTrend.mockReturnValue([
        { period: '2023-Q1W1', averageRating: 3.5 }
      ]);
      
      const stats = await QueryFeedbackService.getFeedbackStatistics();
      
      expect(stats).toHaveProperty('totalFeedback', 5);
      expect(stats).toHaveProperty('ratingDistribution');
      expect(stats.ratingDistribution).toHaveProperty('positive', 2); // Ratings 4-5
      expect(stats.ratingDistribution).toHaveProperty('negative', 2); // Ratings 1-2
      expect(stats.ratingDistribution).toHaveProperty('neutral', 1); // Rating 3
      expect(stats).toHaveProperty('averageRating', 3);
      expect(stats).toHaveProperty('byType');
      expect(stats.byType).toHaveProperty('intent', 2);
      expect(stats).toHaveProperty('commonIssues');
      expect(stats).toHaveProperty('improvementTrend');
    });
  });
  
  describe('_updateMetrics', () => {
    it('should update metrics based on feedback', () => {
      const initialTotal = QueryFeedbackService.metrics.totalFeedback;
      const initialPositive = QueryFeedbackService.metrics.positiveFeedback;
      
      // Positive feedback
      QueryFeedbackService._updateMetrics({
        rating: 5,
        feedbackType: 'intent'
      });
      
      expect(QueryFeedbackService.metrics.totalFeedback).toBe(initialTotal + 1);
      expect(QueryFeedbackService.metrics.positiveFeedback).toBe(initialPositive + 1);
      expect(QueryFeedbackService.metrics.intentFeedback).toBe(1);
      
      // Negative feedback
      QueryFeedbackService._updateMetrics({
        rating: 2,
        feedbackType: 'entity'
      });
      
      expect(QueryFeedbackService.metrics.totalFeedback).toBe(initialTotal + 2);
      expect(QueryFeedbackService.metrics.negativeFeedback).toBe(1);
      expect(QueryFeedbackService.metrics.entityFeedback).toBe(1);
      
      // Average rating should be calculated
      expect(QueryFeedbackService.metrics.averageFeedbackScore).toBe(3.5);
    });
  });
  
  describe('_determineFeedbackType', () => {
    it('should identify intent feedback', () => {
      const parsedQuery = { intent: 'get.info', entities: {} };
      const correction = { intent: 'get.capacity' };
      
      const type = QueryFeedbackService._determineFeedbackType(parsedQuery, correction);
      
      expect(type).toBe('intent');
    });
    
    it('should identify entity feedback', () => {
      const parsedQuery = { intent: 'get.capacity', entities: { terminal: 'A' } };
      const correction = { entities: { terminal: 'Terminal A' } };
      
      const type = QueryFeedbackService._determineFeedbackType(parsedQuery, correction);
      
      expect(type).toBe('entity');
    });
    
    it('should identify variation feedback', () => {
      const parsedQuery = { query: 'Whats the capacity', intent: 'get.capacity', entities: {} };
      const correction = { query: 'What is the capacity?' };
      
      const type = QueryFeedbackService._determineFeedbackType(parsedQuery, correction);
      
      expect(type).toBe('variation');
    });
    
    it('should default to general feedback', () => {
      const parsedQuery = { intent: 'get.capacity', entities: {} };
      const correction = {}; // No specific corrections
      
      const type = QueryFeedbackService._determineFeedbackType(parsedQuery, correction);
      
      expect(type).toBe('general');
    });
  });
  
  describe('getMetrics and resetMetrics', () => {
    it('should get current metrics', () => {
      // Set some metrics
      QueryFeedbackService.metrics = {
        totalFeedback: 10,
        positiveFeedback: 6,
        negativeFeedback: 2,
        averageFeedbackScore: 4.2,
        intentFeedback: 5,
        entityFeedback: 3,
        variationFeedback: 2,
        appliedLearning: 3
      };
      
      const metrics = QueryFeedbackService.getMetrics();
      
      expect(metrics).toEqual(QueryFeedbackService.metrics);
      expect(metrics.totalFeedback).toBe(10);
      expect(metrics.positiveFeedback).toBe(6);
    });
    
    it('should reset metrics', () => {
      // Set some metrics
      QueryFeedbackService.metrics = {
        totalFeedback: 10,
        positiveFeedback: 6,
        negativeFeedback: 2,
        averageFeedbackScore: 4.2
      };
      
      QueryFeedbackService.resetMetrics();
      
      expect(QueryFeedbackService.metrics.totalFeedback).toBe(0);
      expect(QueryFeedbackService.metrics.positiveFeedback).toBe(0);
      expect(QueryFeedbackService.metrics.negativeFeedback).toBe(0);
      expect(QueryFeedbackService.metrics.averageFeedbackScore).toBe(0);
    });
  });
  
  describe('updateConfig', () => {
    it('should update configuration options', () => {
      const initialOptions = { ...QueryFeedbackService.options };
      
      QueryFeedbackService.updateConfig({
        learningEnabled: false,
        feedbackHistoryLimit: 50
      });
      
      expect(QueryFeedbackService.options.learningEnabled).toBe(false);
      expect(QueryFeedbackService.options.feedbackHistoryLimit).toBe(50);
      expect(QueryFeedbackService.options.minFeedbackConfidence).toBe(initialOptions.minFeedbackConfidence); // Unchanged
    });
  });
});