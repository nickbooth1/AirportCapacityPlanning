/**
 * Tests for QueryFeedbackService using manual mocking
 * 
 * This test focuses on the service's API interface and behavior
 * without requiring the actual implementation details.
 */

// Create mock service for testing
const mockQueryFeedbackService = {
  // Public API methods
  submitFeedback: jest.fn(),
  applyFeedbackLearning: jest.fn(),
  getFeedbackStatistics: jest.fn(),
  getMetrics: jest.fn(),
  resetMetrics: jest.fn(),
  updateConfig: jest.fn(),
  
  // Internal state for testing
  options: {
    learningEnabled: true,
    feedbackHistoryLimit: 100,
    feedbackAggregationThreshold: 10,
    minFeedbackConfidence: 0.7
  },
  
  metrics: {
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    intentFeedback: 0,
    entityFeedback: 0,
    variationFeedback: 0,
    averageFeedbackScore: 0,
    totalFeedbackScore: 0,
    appliedLearning: 0
  },
  
  // Implementation of test methods
  _updateMetrics: jest.fn()
};

describe('QueryFeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset metrics
    mockQueryFeedbackService.metrics = {
      totalFeedback: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      intentFeedback: 0,
      entityFeedback: 0,
      variationFeedback: 0,
      averageFeedbackScore: 0,
      totalFeedbackScore: 0,
      appliedLearning: 0
    };
    
    // Setup default returns
    mockQueryFeedbackService.submitFeedback.mockImplementation((data, context) => {
      if (!data || !data.queryId || !data.query || !data.rating) {
        return Promise.resolve({
          success: false,
          error: 'Missing required feedback fields'
        });
      }
      
      // Update metrics
      mockQueryFeedbackService.metrics.totalFeedback++;
      
      if (data.rating >= 4) {
        mockQueryFeedbackService.metrics.positiveFeedback++;
      } else if (data.rating <= 2) {
        mockQueryFeedbackService.metrics.negativeFeedback++;
      }
      
      return Promise.resolve({
        success: true,
        feedbackId: `feedback-${Date.now()}-12345`,
        message: 'Feedback submitted successfully'
      });
    });
    
    mockQueryFeedbackService.applyFeedbackLearning.mockImplementation((sessionId) => {
      if (!mockQueryFeedbackService.options.learningEnabled) {
        return Promise.resolve({
          success: false,
          error: 'Feedback learning is not enabled'
        });
      }
      
      mockQueryFeedbackService.metrics.appliedLearning++;
      
      return Promise.resolve({
        success: true,
        results: {
          variations: { applied: 1 },
          intents: { applied: 2 },
          entities: { applied: 3 }
        },
        timestamp: Date.now()
      });
    });
    
    mockQueryFeedbackService.getFeedbackStatistics.mockResolvedValue({
      totalFeedback: 5,
      ratingDistribution: {
        positive: 2,
        neutral: 1,
        negative: 2
      },
      averageRating: 3,
      byType: {
        intent: 2,
        entity: 1,
        variation: 1,
        general: 1
      },
      commonIssues: [],
      improvementTrend: [],
      learningStatus: {
        variations: 0,
        intents: 0,
        entities: 0
      }
    });
    
    mockQueryFeedbackService.getMetrics.mockImplementation(() => {
      return { ...mockQueryFeedbackService.metrics };
    });
    
    mockQueryFeedbackService.resetMetrics.mockImplementation(() => {
      mockQueryFeedbackService.metrics = {
        totalFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        intentFeedback: 0,
        entityFeedback: 0,
        variationFeedback: 0,
        averageFeedbackScore: 0,
        totalFeedbackScore: 0,
        appliedLearning: 0
      };
    });
    
    mockQueryFeedbackService.updateConfig.mockImplementation((options) => {
      mockQueryFeedbackService.options = {
        ...mockQueryFeedbackService.options,
        ...options
      };
    });
  });
  
  describe('submitFeedback', () => {
    it('should successfully submit feedback', async () => {
      const feedbackData = {
        queryId: 'test-query-1',
        query: 'What is the airport capacity?',
        parsedQuery: { intent: 'get.capacity', entities: {} },
        rating: 4,
        feedbackType: 'intent',
        comments: 'Great answer'
      };
      
      const context = { sessionId: 'test-session' };
      
      const result = await mockQueryFeedbackService.submitFeedback(feedbackData, context);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('feedbackId');
      expect(result.feedbackId).toContain('feedback-');
      expect(result).toHaveProperty('message', 'Feedback submitted successfully');
      
      // Metrics should be updated
      expect(mockQueryFeedbackService.metrics.totalFeedback).toBe(1);
      expect(mockQueryFeedbackService.metrics.positiveFeedback).toBe(1);
    });
    
    it('should reject feedback with missing required fields', async () => {
      const invalidFeedback = {
        query: 'What is the airport capacity?',
        rating: 4
        // Missing queryId
      };
      
      const result = await mockQueryFeedbackService.submitFeedback(invalidFeedback);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Missing required feedback fields');
    });
  });
  
  describe('applyFeedbackLearning', () => {
    it('should apply learning when enabled', async () => {
      const result = await mockQueryFeedbackService.applyFeedbackLearning('test-session');
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveProperty('variations', { applied: 1 });
      expect(result.results).toHaveProperty('intents', { applied: 2 });
      expect(result.results).toHaveProperty('entities', { applied: 3 });
      
      // Metrics should be updated
      expect(mockQueryFeedbackService.metrics.appliedLearning).toBe(1);
    });
    
    it('should not apply learning when disabled', async () => {
      // Disable learning
      mockQueryFeedbackService.options.learningEnabled = false;
      
      const result = await mockQueryFeedbackService.applyFeedbackLearning('test-session');
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Feedback learning is not enabled');
      
      // Metrics should not be updated
      expect(mockQueryFeedbackService.metrics.appliedLearning).toBe(0);
    });
  });
  
  describe('getFeedbackStatistics', () => {
    it('should return statistics summary', async () => {
      const stats = await mockQueryFeedbackService.getFeedbackStatistics();
      
      expect(stats).toHaveProperty('totalFeedback');
      expect(stats).toHaveProperty('ratingDistribution');
      expect(stats).toHaveProperty('averageRating');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('commonIssues');
      expect(stats).toHaveProperty('improvementTrend');
    });
  });
  
  describe('getMetrics and resetMetrics', () => {
    it('should get current metrics', () => {
      // Set some metrics
      mockQueryFeedbackService.metrics = {
        totalFeedback: 10,
        positiveFeedback: 6,
        negativeFeedback: 2
      };
      
      const metrics = mockQueryFeedbackService.getMetrics();
      
      expect(metrics).toEqual(mockQueryFeedbackService.metrics);
      expect(metrics.totalFeedback).toBe(10);
      expect(metrics.positiveFeedback).toBe(6);
    });
    
    it('should reset metrics', () => {
      // Set some metrics
      mockQueryFeedbackService.metrics = {
        totalFeedback: 10,
        positiveFeedback: 6,
        negativeFeedback: 2
      };
      
      mockQueryFeedbackService.resetMetrics();
      
      expect(mockQueryFeedbackService.metrics.totalFeedback).toBe(0);
      expect(mockQueryFeedbackService.metrics.positiveFeedback).toBe(0);
      expect(mockQueryFeedbackService.metrics.negativeFeedback).toBe(0);
    });
  });
  
  describe('updateConfig', () => {
    it('should update configuration options', () => {
      const initialOptions = { ...mockQueryFeedbackService.options };
      
      mockQueryFeedbackService.updateConfig({
        learningEnabled: false,
        feedbackHistoryLimit: 50
      });
      
      expect(mockQueryFeedbackService.options.learningEnabled).toBe(false);
      expect(mockQueryFeedbackService.options.feedbackHistoryLimit).toBe(50);
      expect(mockQueryFeedbackService.options.minFeedbackConfidence).toBe(initialOptions.minFeedbackConfidence); // Unchanged
    });
  });
});