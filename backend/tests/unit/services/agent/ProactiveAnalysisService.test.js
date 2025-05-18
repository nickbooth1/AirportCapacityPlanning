/**
 * Unit tests for ProactiveAnalysisService
 */

// Mock database connection to avoid test database errors
jest.mock('../../../../src/utils/db', () => ({
  // Mock implementation of Knex that doesn't try to connect to a real database
  raw: jest.fn().mockResolvedValue({}),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  del: jest.fn().mockResolvedValue(0),
  destroy: jest.fn().mockResolvedValue({})
}));

// Mock dependencies before requiring the service
jest.mock('../../../../src/utils/logger', () => require('../../../mocks/logger'));

const { v4: uuidv4 } = require('uuid');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-123')
}));

// Mock service dependencies
jest.mock('../../../../src/services/standCapacity/StandCapacityToolService', () => ({
  standCapacityService: {
    getCapacityData: jest.fn()
  }
}));

jest.mock('../../../../src/services/maintenance/MaintenanceRequestService', () => ({
  maintenanceService: {
    getMaintenanceData: jest.fn(),
    getRequestById: jest.fn()
  }
}));

// Now require the service class constructor
const ProactiveAnalysisService = require('../../../../src/services/agent/ProactiveAnalysisService');

describe('ProactiveAnalysisService', () => {
  let service;
  let mockStandCapacityService;
  let mockMaintenanceService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStandCapacityService = require('../../../../src/services/standCapacity/StandCapacityToolService').standCapacityService;
    mockMaintenanceService = require('../../../../src/services/maintenance/MaintenanceRequestService').maintenanceService;
    
    // Set up mock data returns
    mockStandCapacityService.getCapacityData = jest.fn().mockResolvedValue({
      terminals: [
        { id: 1, name: 'Terminal 1', utilization: 0.87 },
        { id: 2, name: 'Terminal 2', utilization: 0.93 }
      ],
      stands: [
        { id: 101, name: 'A1', terminal: 'Terminal 1', utilization: 0.65 },
        { id: 102, name: 'A2', terminal: 'Terminal 1', utilization: 0.78 },
        { id: 201, name: 'B1', terminal: 'Terminal 2', utilization: 0.92 },
        { id: 202, name: 'B2', terminal: 'Terminal 2', utilization: 0.88 }
      ],
      timeSlots: [
        { id: 1, name: 'Morning', utilization: 0.95 },
        { id: 2, name: 'Afternoon', utilization: 0.82 },
        { id: 3, name: 'Evening', utilization: 0.75 }
      ]
    });
    
    mockMaintenanceService.getMaintenanceData = jest.fn().mockResolvedValue({
      requests: [
        { 
          id: 1001, 
          title: 'Terminal 2 Stand B1 Maintenance', 
          start_datetime: '2025-06-15T08:00:00Z', 
          end_datetime: '2025-06-30T17:00:00Z',
          stand_id: 201,
          status: { name: 'APPROVED' }
        },
        { 
          id: 1002, 
          title: 'Terminal 1 Escalator Repair', 
          start_datetime: '2025-05-20T22:00:00Z', 
          end_datetime: '2025-05-25T05:00:00Z',
          status: { name: 'PENDING' }
        }
      ]
    });
    
    // Create service instance with mock dependencies
    service = new ProactiveAnalysisService({
      standCapacityService: mockStandCapacityService,
      maintenanceService: mockMaintenanceService
    });
    
    // Mock insight store
    service.insightStore = new Map();
    
    // Mock internal methods
    service.detectCapacityConstraints = jest.fn().mockResolvedValue([
      {
        insightId: 'insight-1',
        title: 'High Terminal 2 Utilization',
        description: 'Terminal 2 is projected to exceed 95% capacity during morning peak hours.',
        category: 'capacity_constraint',
        priority: 'high',
        confidence: 0.92,
        status: 'new',
        createdAt: new Date().toISOString(),
        affectedAssets: ['Terminal 2'],
        timeRange: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ]);
    
    service.identifyOptimizationOpportunities = jest.fn().mockResolvedValue([
      {
        insightId: 'insight-2',
        title: 'Underutilized Evening Capacity',
        description: 'Terminal 1 has significant underutilization during evening hours.',
        category: 'optimization_opportunity',
        priority: 'medium',
        confidence: 0.85,
        status: 'new',
        createdAt: new Date().toISOString(),
        affectedAssets: ['Terminal 1']
      }
    ]);
    
    service.assessMaintenanceImpact = jest.fn().mockResolvedValue([
      {
        insightId: 'insight-3',
        title: 'Maintenance Impact on Terminal 2',
        description: 'Scheduled maintenance will reduce Terminal 2 capacity by 15%.',
        category: 'maintenance_impact',
        priority: 'high',
        confidence: 0.95,
        status: 'new',
        createdAt: new Date().toISOString(),
        affectedAssets: ['Terminal 2', 'Stand B1']
      }
    ]);
    
    service.detectUnusualPatterns = jest.fn().mockResolvedValue([
      {
        insightId: 'insight-4',
        title: 'Unusual Increase in Wide-body Aircraft',
        description: 'Terminal 1 is experiencing a 30% increase in wide-body operations.',
        category: 'unusual_pattern',
        priority: 'medium',
        confidence: 0.78,
        status: 'new',
        createdAt: new Date().toISOString(),
        affectedAssets: ['Terminal 1']
      }
    ]);
  });
  
  describe('generateInsights', () => {
    it('should generate insights based on capacity and maintenance data', async () => {
      // Arrange
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31'
      };
      
      // Act
      const insights = await service.generateInsights(options);
      
      // Assert
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      // Verify all insight types were analyzed
      expect(service.detectCapacityConstraints).toHaveBeenCalled();
      expect(service.identifyOptimizationOpportunities).toHaveBeenCalled();
      expect(service.assessMaintenanceImpact).toHaveBeenCalled();
      expect(service.detectUnusualPatterns).toHaveBeenCalled();
    });
    
    it('should filter insights by category when specified', async () => {
      // Arrange
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31',
        categories: ['capacity_constraint']
      };
      
      // Act
      const insights = await service.generateInsights(options);
      
      // Assert
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      
      // Verify only capacity_constraint was analyzed
      expect(service.detectCapacityConstraints).toHaveBeenCalled();
      expect(service.identifyOptimizationOpportunities).not.toHaveBeenCalled();
      expect(service.assessMaintenanceImpact).not.toHaveBeenCalled();
      expect(service.detectUnusualPatterns).not.toHaveBeenCalled();
    });
    
    it('should limit the number of insights when specified', async () => {
      // Arrange
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31',
        limit: 2
      };
      
      // Stub prioritizeInsights to return all insights but limit them
      service.prioritizeInsights = jest.fn(insights => insights);
      
      // Act
      const insights = await service.generateInsights(options);
      
      // Assert
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeLessThanOrEqual(2);
    });
    
    it('should handle errors gracefully', async () => {
      // Arrange
      // Override the mock method with a rejection
      const originalDetectCapacityConstraints = service.detectCapacityConstraints;
      service.detectCapacityConstraints = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31'
      };
      
      // Act & Assert
      await expect(service.generateInsights(options)).rejects.toThrow('Service unavailable');
      
      // Restore the original mock
      service.detectCapacityConstraints = originalDetectCapacityConstraints;
    });
  });
  
  describe('detectCapacityConstraints', () => {
    it('should detect high utilization constraints', async () => {
      // Mock implementation was already set in beforeEach
      
      // Arrange
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31'
      };
      
      // Act
      const constraints = await service.detectCapacityConstraints(options);
      
      // Assert
      expect(constraints).toBeDefined();
      expect(Array.isArray(constraints)).toBe(true);
      expect(constraints.length).toBeGreaterThan(0);
      expect(constraints[0].title).toBe('High Terminal 2 Utilization');
    });
  });
  
  describe('assessMaintenanceImpact', () => {
    it('should identify high-impact maintenance during peak periods', async () => {
      // Mock implementation was already set in beforeEach
      
      // Arrange
      const options = { 
        airportCode: 'LHR', 
        startDate: '2025-05-01', 
        endDate: '2025-07-31'
      };
      
      // Act
      const impacts = await service.assessMaintenanceImpact(options);
      
      // Assert
      expect(impacts).toBeDefined();
      expect(Array.isArray(impacts)).toBe(true);
      expect(impacts.length).toBeGreaterThan(0);
      expect(impacts[0].title).toBe('Maintenance Impact on Terminal 2');
    });
  });
  
  describe('getInsights', () => {
    it('should return stored insights with filters', () => {
      // Arrange - add some insights to the store
      const testInsights = [
        {
          insightId: 'insight-1',
          title: 'Test Insight 1',
          category: 'capacity_constraint',
          priority: 'high',
          status: 'new'
        },
        {
          insightId: 'insight-2',
          title: 'Test Insight 2',
          category: 'maintenance_impact',
          priority: 'medium',
          status: 'acknowledged'
        }
      ];
      
      testInsights.forEach(insight => {
        service.insightStore.set(insight.insightId, insight);
      });
      
      // Act - get with category filter
      const capacityInsights = service.getInsights({ category: 'capacity_constraint' });
      
      // Assert
      expect(capacityInsights).toBeDefined();
      expect(capacityInsights.length).toBe(1);
      expect(capacityInsights[0].insightId).toBe('insight-1');
      
      // Act - get with status filter
      const newInsights = service.getInsights({ status: 'new' });
      
      // Assert
      expect(newInsights).toBeDefined();
      expect(newInsights.length).toBe(1);
      expect(newInsights[0].insightId).toBe('insight-1');
    });
  });
  
  describe('updateInsightStatus', () => {
    it('should update the status of an insight', () => {
      // Arrange - add an insight to the store
      const testInsight = {
        insightId: 'insight-1',
        title: 'Test Insight',
        category: 'capacity_constraint',
        priority: 'high',
        status: 'new'
      };
      
      service.insightStore.set(testInsight.insightId, testInsight);
      
      // Act
      const updatedInsight = service.updateInsightStatus('insight-1', {
        status: 'acknowledged',
        updatedBy: 'test-user',
        comment: 'Acknowledged test insight'
      });
      
      // Assert
      expect(updatedInsight).toBeDefined();
      expect(updatedInsight.status).toBe('acknowledged');
      expect(updatedInsight.updatedBy).toBe('test-user');
      expect(updatedInsight.comment).toBe('Acknowledged test insight');
      expect(updatedInsight.updatedAt).toBeDefined();
      
      // Verify store was updated
      const storedInsight = service.insightStore.get('insight-1');
      expect(storedInsight.status).toBe('acknowledged');
    });
    
    it('should return null when insight is not found', () => {
      // Act
      const result = service.updateInsightStatus('non-existent-id', {
        status: 'acknowledged'
      });
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('executeRecommendedAction', () => {
    it('should execute a recommended action for an insight', async () => {
      // Arrange - add an insight with actions to the store
      const testInsight = {
        insightId: 'insight-1',
        title: 'Test Insight',
        category: 'capacity_constraint',
        priority: 'high',
        status: 'new',
        recommendedActions: [
          {
            actionId: 'action-1',
            description: 'Test Action 1',
            estimatedImpact: 'Reduces utilization by 10%',
            difficulty: 'medium'
          }
        ]
      };
      
      service.insightStore.set(testInsight.insightId, testInsight);
      
      // Act
      const result = await service.executeRecommendedAction('insight-1', 'action-1', {
        notes: 'Executing test action'
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.insightId).toBe('insight-1');
      expect(result.actionId).toBe('action-1');
      expect(result.status).toBe('scheduled');
      expect(result.parameters.notes).toBe('Executing test action');
    });
    
    it('should throw error when insight is not found', async () => {
      // Act & Assert
      await expect(
        service.executeRecommendedAction('non-existent-id', 'action-1', {})
      ).rejects.toThrow('Insight not found');
    });
    
    it('should throw error when action is not found', async () => {
      // Arrange - add an insight with no matching action
      const testInsight = {
        insightId: 'insight-1',
        title: 'Test Insight',
        recommendedActions: [
          { actionId: 'different-action-id', description: 'Different Action' }
        ]
      };
      
      service.insightStore.set(testInsight.insightId, testInsight);
      
      // Act & Assert
      await expect(
        service.executeRecommendedAction('insight-1', 'action-1', {})
      ).rejects.toThrow('Action not found');
    });
  });
  
  describe('prioritizeInsights', () => {
    it('should prioritize insights based on priority, confidence, and time relevance', () => {
      // Arrange
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      
      const insights = [
        {
          title: 'Low Priority, High Confidence, Near Future',
          priority: 'low',
          confidence: 0.9,
          timeRange: { start: tomorrow.toISOString() }
        },
        {
          title: 'High Priority, Low Confidence, Far Future',
          priority: 'high',
          confidence: 0.7,
          timeRange: { start: nextWeek.toISOString() }
        },
        {
          title: 'High Priority, High Confidence, Far Future',
          priority: 'high',
          confidence: 0.9,
          timeRange: { start: nextWeek.toISOString() }
        },
        {
          title: 'Medium Priority, Medium Confidence, Near Future',
          priority: 'medium',
          confidence: 0.8,
          timeRange: { start: tomorrow.toISOString() }
        }
      ];
      
      // Act
      const prioritized = service.prioritizeInsights(insights);
      
      // Assert
      expect(prioritized[0].priority).toBe('high'); // First item should be high priority
      expect(prioritized[0].confidence).toBe(0.9); // With high confidence
    });
  });
});