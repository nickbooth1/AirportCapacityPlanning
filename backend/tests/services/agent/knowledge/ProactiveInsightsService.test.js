/**
 * Tests for ProactiveInsightsService
 */

const ProactiveInsightsService = require('../../../../src/services/agent/knowledge/ProactiveInsightsService');
const KnowledgeRetrievalService = require('../../../../src/services/agent/knowledge/KnowledgeRetrievalService');

// Mock the OpenAI service
jest.mock('../../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn()
}));

// Mock the OpenAIService
const mockOpenAIService = require('../../../../src/services/agent/OpenAIService');

// Mock the logger
jest.mock('../../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock the other services
jest.mock('../../../../src/services/agent/knowledge/KnowledgeRetrievalService');

describe('ProactiveInsightsService', () => {
  let service;
  let mockStandDataService;
  let mockMaintenanceDataService;
  let mockAirportConfigService;
  let mockFlightDataService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset OpenAI mock to default behavior
    mockOpenAIService.processQuery.mockReset();
    
    // Create mock services
    mockStandDataService = {
      getStands: jest.fn().mockResolvedValue([
        { id: 'A1', status: 'active', terminal: 'T1' },
        { id: 'A2', status: 'maintenance', terminal: 'T1' },
        { id: 'B1', status: 'active', terminal: 'T2' }
      ]),
      getStandUtilization: jest.fn().mockResolvedValue([
        { standId: 'A1', utilization: 0.85 },
        { standId: 'A2', utilization: 0 },
        { standId: 'B1', utilization: 0.65 }
      ])
    };
    
    mockMaintenanceDataService = {
      getUpcomingMaintenanceEvents: jest.fn().mockResolvedValue([
        {
          id: 'M1',
          standId: 'A2',
          startDate: '2025-05-20',
          endDate: '2025-05-25',
          status: 'scheduled'
        }
      ])
    };
    
    mockAirportConfigService = {
      getOperationalSettings: jest.fn().mockResolvedValue({
        maxStands: 10,
        maxTerminals: 2,
        capacityBuffer: 0.1
      }),
      getTerminals: jest.fn().mockResolvedValue([
        { id: 'T1', name: 'Terminal 1' },
        { id: 'T2', name: 'Terminal 2' }
      ]),
      getPiers: jest.fn().mockResolvedValue([
        { id: 'P1', name: 'Pier A', terminal: 'T1' },
        { id: 'P2', name: 'Pier B', terminal: 'T2' }
      ])
    };
    
    mockFlightDataService = {
      getFlights: jest.fn().mockResolvedValue([
        { id: 'F1', standId: 'A1', arrivalTime: '2025-05-19T10:00:00Z', departureTime: '2025-05-19T12:00:00Z' },
        { id: 'F2', standId: 'B1', arrivalTime: '2025-05-19T11:00:00Z', departureTime: '2025-05-19T13:00:00Z' }
      ])
    };
    
    // Initialize service with mocks
    service = new ProactiveInsightsService({
      openAIService: mockOpenAIService,
      standDataService: mockStandDataService,
      maintenanceDataService: mockMaintenanceDataService,
      airportConfigService: mockAirportConfigService,
      flightDataService: mockFlightDataService
    }, {
      insightGenerationFrequency: 60000, // 1 minute for testing
      enabledScheduledInsights: false // Disable scheduled generation for testing
    });
  });
  
  afterEach(() => {
    // Clean up any intervals or timers
    service.cleanup();
  });
  
  describe('generateScheduledInsights', () => {
    it('should generate scheduled insights based on collected data', async () => {
      // Mock the OpenAI response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            title: 'High Terminal 1 Utilization',
            description: 'Terminal 1 stands are showing above average utilization',
            type: 'utilization_anomaly',
            confidence: 0.85,
            evidence: ['Stand A1 has 85% utilization'],
            recommendations: ['Consider redistributing load'],
            impact: 'Potential delays during peak hours',
            timeRelevance: 'short-term'
          },
          {
            title: 'Maintenance Impact on Capacity',
            description: 'Upcoming maintenance on Stand A2 will reduce Terminal 1 capacity',
            type: 'maintenance_impact',
            confidence: 0.92,
            evidence: ['Stand A2 maintenance from May 20-25'],
            recommendations: ['Adjust allocation strategy for affected period'],
            impact: 'Reduced capacity by 10% in Terminal 1',
            timeRelevance: 'immediate'
          }
        ]),
        usage: {}
      });
      
      // Generate insights
      const insights = await service.generateScheduledInsights();
      
      // Verify insights were generated
      expect(insights).toHaveLength(2);
      
      // Verify the insights have correct properties
      expect(insights[0]).toHaveProperty('title');
      expect(insights[0]).toHaveProperty('description');
      expect(insights[0]).toHaveProperty('type');
      expect(insights[0]).toHaveProperty('confidence');
      expect(insights[0]).toHaveProperty('priority');
      expect(insights[0]).toHaveProperty('generatedAt');
      expect(insights[0]).toHaveProperty('source', 'scheduled');
      
      // Verify priority assignment (high confidence gets high priority)
      expect(insights[1].priority).toBe('high');
      
      // Verify metrics were updated
      expect(service.metrics.scheduledInsightsGenerated).toBe(2);
      expect(service.metrics.totalInsightsGenerated).toBe(2);
      
      // Verify data collection
      expect(mockStandDataService.getStands).toHaveBeenCalled();
      expect(mockMaintenanceDataService.getUpcomingMaintenanceEvents).toHaveBeenCalled();
    });
    
    it('should filter out low confidence insights', async () => {
      // Mock the OpenAI response with varying confidence levels
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            title: 'High confidence insight',
            type: 'capacity_bottleneck',
            confidence: 0.9
          },
          {
            title: 'Low confidence insight',
            type: 'utilization_anomaly',
            confidence: 0.4 // Below threshold
          }
        ]),
        usage: {}
      });
      
      // Generate insights
      const insights = await service.generateScheduledInsights();
      
      // Should only include the high confidence insight
      expect(insights).toHaveLength(1);
      expect(insights[0].title).toBe('High confidence insight');
    });
    
    it('should handle errors in data collection', async () => {
      // Make one of the services throw an error
      mockStandDataService.getStands.mockRejectedValueOnce(new Error('Test error'));
      
      // Mock a fallback response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            title: 'Limited data insight',
            type: 'operational_efficiency',
            confidence: 0.8
          }
        ]),
        usage: {}
      });
      
      // Generate insights
      const insights = await service.generateScheduledInsights();
      
      // Should still generate insights from partial data
      expect(insights).toHaveLength(1);
      
      // Other services should still have been called
      expect(mockMaintenanceDataService.getUpcomingMaintenanceEvents).toHaveBeenCalled();
    });
  });
  
  describe('generateEventTriggeredInsights', () => {
    it('should generate insights triggered by events', async () => {
      // Mock the OpenAI response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            title: 'New Maintenance Impact',
            description: 'The newly created maintenance event will impact capacity',
            type: 'maintenance_impact',
            confidence: 0.94,
            timeRelevance: 'immediate'
          }
        ]),
        usage: {}
      });
      
      // Event data
      const eventType = 'maintenance_created';
      const eventData = {
        maintenanceId: 'M2',
        standId: 'B2',
        startDate: '2025-06-01',
        endDate: '2025-06-05'
      };
      
      // Generate event-triggered insights
      const insights = await service.generateEventTriggeredInsights(eventType, eventData);
      
      // Verify insights
      expect(insights).toHaveLength(1);
      expect(insights[0].title).toBe('New Maintenance Impact');
      expect(insights[0].source).toBe('event-maintenance_created');
      
      // Verify metrics
      expect(service.metrics.eventTriggeredInsightsGenerated).toBe(1);
      
      // Should collect only relevant data sources for maintenance events
      expect(mockStandDataService.getStands).toHaveBeenCalled();
      expect(mockMaintenanceDataService.getUpcomingMaintenanceEvents).toHaveBeenCalled();
      // Flight data not needed for maintenance events
      expect(mockFlightDataService.getFlights).not.toHaveBeenCalled();
    });
    
    it('should handle disabled event-triggered insights', async () => {
      // Create service with disabled event insights
      const disabledService = new ProactiveInsightsService({}, {
        enabledEventTriggeredInsights: false
      });
      
      // Generate event-triggered insights
      const insights = await disabledService.generateEventTriggeredInsights('test_event', {});
      
      // Should return empty array
      expect(insights).toEqual([]);
      // Should not call OpenAI
      expect(mockOpenAIService.processQuery).not.toHaveBeenCalled();
    });
  });
  
  describe('generateFocusedInsights', () => {
    it('should generate insights focused on a specific area', async () => {
      // Mock the OpenAI response
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            title: 'Capacity Optimization Opportunity',
            description: 'Terminal allocation could be optimized for better capacity',
            type: 'allocation_optimization',
            confidence: 0.88,
            timeRelevance: 'short-term'
          }
        ]),
        usage: {}
      });
      
      // Generate focused insights
      const insights = await service.generateFocusedInsights('capacity', { 
        user: 'test-user',
        timeframe: 'next-week'
      });
      
      // Verify insights
      expect(insights).toHaveLength(1);
      expect(insights[0].title).toBe('Capacity Optimization Opportunity');
      
      // Should have used capacity-specific data sources
      expect(mockStandDataService.getStands).toHaveBeenCalled();
      expect(mockAirportConfigService.getOperationalSettings).toHaveBeenCalled();
    });
    
    it('should allow limiting the number of insights', async () => {
      // Mock response with multiple insights
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: JSON.stringify([
          { title: 'Insight 1', confidence: 0.9, type: 'capacity_bottleneck' },
          { title: 'Insight 2', confidence: 0.88, type: 'utilization_anomaly' },
          { title: 'Insight 3', confidence: 0.85, type: 'resource_availability' }
        ]),
        usage: {}
      });
      
      // Generate with limit option
      const insights = await service.generateFocusedInsights('utilization', {}, { maxInsights: 2 });
      
      // Should respect the limit
      expect(insights).toHaveLength(2);
    });
  });
  
  describe('insight storage and retrieval', () => {
    it('should store and retrieve insights', async () => {
      // Mock insights
      const mockInsights = [
        { 
          id: 'test-insight-1',
          title: 'Test Insight 1',
          type: 'capacity_bottleneck',
          priority: 'high',
          generatedAt: new Date().toISOString(),
          source: 'test'
        }
      ];
      
      // Store insights
      service._storeInsights(mockInsights, 'test');
      
      // Get recent insights
      const insights = service.getRecentInsights();
      
      // Should contain our test insight
      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('test-insight-1');
    });
    
    it('should filter insights by criteria', async () => {
      // Mock multiple insights
      const mockInsights = [
        { 
          id: 'insight-1',
          title: 'High Priority',
          type: 'capacity_bottleneck',
          priority: 'high',
          source: 'scheduled',
          generatedAt: new Date().toISOString()
        },
        { 
          id: 'insight-2',
          title: 'Medium Priority',
          type: 'utilization_anomaly',
          priority: 'medium', 
          source: 'focused',
          generatedAt: new Date().toISOString()
        },
        { 
          id: 'insight-3',
          title: 'Another High Priority',
          type: 'maintenance_impact',
          priority: 'high',
          source: 'event-triggered',
          generatedAt: new Date().toISOString()
        }
      ];
      
      // Store insights
      service._storeInsights(mockInsights, 'test');
      
      // Filter by priority
      const highPriorityInsights = service.getRecentInsights({ priority: 'high' });
      expect(highPriorityInsights).toHaveLength(2);
      
      // Filter by type
      const capacityInsights = service.getRecentInsights({ type: 'capacity_bottleneck' });
      expect(capacityInsights).toHaveLength(1);
      expect(capacityInsights[0].title).toBe('High Priority');
      
      // Filter by source
      const scheduledInsights = service.getRecentInsights({ source: 'scheduled' });
      expect(scheduledInsights).toHaveLength(1);
    });
    
    it('should get insight by ID', async () => {
      // Mock insights
      const mockInsights = [
        { id: 'insight-1', title: 'Test Insight 1' },
        { id: 'insight-2', title: 'Test Insight 2' }
      ];
      
      // Store insights
      service._storeInsights(mockInsights, 'test');
      
      // Get by ID
      const insight = service.getInsightById('insight-2');
      
      // Should find the right insight
      expect(insight).toBeDefined();
      expect(insight.title).toBe('Test Insight 2');
      
      // Should return null for non-existent ID
      const nonExistent = service.getInsightById('non-existent');
      expect(nonExistent).toBeNull();
    });
    
    it('should move excess insights to history', async () => {
      // Create service with small max recent size for testing
      const smallService = new ProactiveInsightsService({}, {
        maxRecentInsights: 3
      });
      
      // Generate 5 insights (exceeds the max of 3)
      const mockInsights = Array.from({ length: 5 }, (_, i) => ({
        id: `insight-${i}`,
        title: `Test Insight ${i}`
      }));
      
      // Store insights
      smallService._storeInsights(mockInsights, 'test');
      
      // Check recent insights
      expect(smallService.recentInsights).toHaveLength(3);
      // Check history (should have the 2 excess insights)
      expect(smallService.insightHistory).toHaveLength(2);
    });
  });
  
  describe('insight feedback', () => {
    it('should add user feedback to insights', async () => {
      // Mock insight
      const mockInsight = {
        id: 'feedback-test',
        title: 'Test Insight'
      };
      
      // Store insight
      service._storeInsights([mockInsight], 'test');
      
      // Provide feedback
      const feedbackResult = service.provideFeedback('feedback-test', 'helpful', { comment: 'Great insight!' });
      
      // Verify feedback was stored
      expect(feedbackResult).toBe(true);
      
      // Get the insight
      const updatedInsight = service.getInsightById('feedback-test');
      
      // Verify feedback data
      expect(updatedInsight.feedback).toHaveLength(1);
      expect(updatedInsight.feedback[0].type).toBe('helpful');
      expect(updatedInsight.feedback[0].details.comment).toBe('Great insight!');
      expect(updatedInsight.lastFeedbackType).toBe('helpful');
    });
    
    it('should handle feedback for non-existent insights', async () => {
      // Provide feedback for non-existent insight
      const result = service.provideFeedback('non-existent', 'helpful');
      
      // Should return false
      expect(result).toBe(false);
    });
  });
  
  describe('daily summary', () => {
    it('should generate a daily summary of insights', async () => {
      // Mock some insights with different dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const mockInsights = [
        {
          id: 'today-1',
          title: 'Today Insight 1',
          priority: 'high',
          type: 'capacity_bottleneck',
          generatedAt: today.toISOString()
        },
        {
          id: 'today-2',
          title: 'Today Insight 2',
          priority: 'medium',
          type: 'utilization_anomaly',
          generatedAt: today.toISOString()
        },
        {
          id: 'yesterday-1',
          title: 'Yesterday Insight',
          priority: 'high',
          type: 'maintenance_impact',
          generatedAt: yesterday.toISOString(),
          feedback: [{ type: 'implemented', timestamp: today.toISOString() }]
        }
      ];
      
      // Store insights
      service._storeInsights(mockInsights, 'test');
      
      // Mock OpenAI response for summary
      mockOpenAIService.processQuery.mockResolvedValueOnce({
        text: 'Summary of 3 insights generated in the last 24 hours',
        usage: {}
      });
      
      // Generate summary
      const summary = await service.generateDailySummary();
      
      // Verify summary
      expect(summary).toHaveProperty('text');
      expect(summary).toHaveProperty('data');
      expect(summary).toHaveProperty('timestamp');
      
      // Verify data
      expect(summary.data.totalInsights).toBe(3);
      expect(summary.data.highPriorityCount).toBe(2);
      expect(summary.data.implementedCount).toBe(1);
    });
  });
  
  describe('metrics', () => {
    it('should track and provide metrics', async () => {
      // Mock insight generation results
      service.metrics.totalInsightsGenerated = 10;
      service.metrics.scheduledInsightsGenerated = 5;
      service.metrics.eventTriggeredInsightsGenerated = 3;
      service.metrics.insightsByType = {
        'capacity_bottleneck': 4,
        'maintenance_impact': 3,
        'utilization_anomaly': 3
      };
      service.metrics.insightsByPriority = {
        high: 3,
        medium: 5,
        low: 2
      };
      
      // Add some insights to recent list
      service._storeInsights([
        { id: 'metric-test-1', title: 'Metric Test 1' },
        { id: 'metric-test-2', title: 'Metric Test 2' }
      ], 'test');
      
      // Get metrics
      const metrics = service.getMetrics();
      
      // Verify metrics
      expect(metrics.totalInsightsGenerated).toBe(10);
      expect(metrics.scheduledInsightsGenerated).toBe(5);
      expect(metrics.eventTriggeredInsightsGenerated).toBe(3);
      expect(metrics.recentInsightCount).toBe(2);
      expect(metrics.insightsByType).toHaveProperty('capacity_bottleneck', 4);
      expect(metrics.insightsByPriority).toHaveProperty('high', 3);
      
      // Reset metrics
      service.resetMetrics();
      
      // Verify reset
      const resetMetrics = service.getMetrics();
      expect(resetMetrics.totalInsightsGenerated).toBe(0);
      expect(resetMetrics.scheduledInsightsGenerated).toBe(0);
    });
  });
  
  describe('scheduling and cleanup', () => {
    it('should schedule and stop insight generation', () => {
      // Create service with scheduling enabled
      const scheduledService = new ProactiveInsightsService({}, {
        insightGenerationFrequency: 60000, // 1 minute
        enabledScheduledInsights: true
      });
      
      // Verify interval is set
      expect(scheduledService.insightGenerationInterval).toBeDefined();
      
      // Stop scheduling
      scheduledService.stopScheduledInsightGeneration();
      
      // Verify interval is cleared
      expect(scheduledService.insightGenerationInterval).toBeNull();
    });
    
    it('should clean up resources properly', () => {
      // Create service with scheduling enabled
      const scheduledService = new ProactiveInsightsService({}, {
        enabledScheduledInsights: true
      });
      
      // Spy on stopScheduledInsightGeneration
      jest.spyOn(scheduledService, 'stopScheduledInsightGeneration');
      
      // Call cleanup
      scheduledService.cleanup();
      
      // Verify stopScheduledInsightGeneration was called
      expect(scheduledService.stopScheduledInsightGeneration).toHaveBeenCalled();
    });
  });
});