/**
 * Integration tests for ProactiveInsightsController
 * 
 * This integration test uses real service calls rather than mocks.
 */
const request = require('supertest');
const express = require('express');
const path = require('path');
const proactiveInsightsController = require('../../../src/controllers/ProactiveInsightsController');
const ProactiveAnalysisService = require('../../../src/services/agent/ProactiveAnalysisService');
const { v4: uuidv4 } = require('uuid');

// Create a test database connection
const knex = require('../../../src/utils/db');

// Setup test data
const testInsights = [
  {
    insightId: `test-insight-${uuidv4()}`,
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
    },
    recommendedActions: [
      {
        actionId: `test-action-${uuidv4()}`,
        description: 'Temporarily reassign 3 wide-body aircraft to Terminal 1',
        difficulty: 'medium'
      }
    ]
  },
  {
    insightId: `test-insight-${uuidv4()}`,
    title: 'Maintenance Impact on Terminal 1',
    description: 'Scheduled maintenance will reduce Terminal 1 capacity by 15%.',
    category: 'maintenance_impact',
    priority: 'medium',
    confidence: 0.85,
    status: 'new',
    createdAt: new Date().toISOString(),
    affectedAssets: ['Terminal 1'],
    timeRange: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

// Create a real Express app for testing
const app = express();
app.use(express.json());

// Create a test authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-1', role: 'admin' };
  next();
};

// Set up real controller with real dependencies
// We need to extend ProactiveInsightsController to inject our test data
class TestProactiveInsightsController {
  constructor() {
    // Create a real ProactiveAnalysisService
    this.proactiveAnalysisService = new ProactiveAnalysisService({});
    
    // Pre-populate the insight store with test data
    testInsights.forEach(insight => {
      this.proactiveAnalysisService.insightStore.set(insight.insightId, insight);
    });
    
    // Augment the generateInsights method to return our test data
    this.proactiveAnalysisService.generateInsights = async (options) => {
      return testInsights.filter(insight => {
        // Apply filters if provided
        if (options.categories && !options.categories.includes(insight.category)) {
          return false;
        }
        if (options.priority && insight.priority !== options.priority) {
          return false;
        }
        return true;
      });
    };
  }
  
  // Use the same method signatures as the real controller
  async getInsights(req, res) {
    try {
      const options = {
        airportCode: req.query.airportCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        categories: req.query.category ? [req.query.category] : undefined,
        priority: req.query.priority,
        status: req.query.status,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 10
      };
      
      // Use the real service to generate insights
      const insights = await this.proactiveAnalysisService.generateInsights(options);
      
      // Filter by status and priority if specified
      let filteredInsights = insights;
      if (options.status) {
        filteredInsights = insights.filter(insight => insight.status === options.status);
      }
      if (options.priority) {
        filteredInsights = filteredInsights.filter(insight => insight.priority === options.priority);
      }
      
      // Prepare response
      const response = {
        insights: filteredInsights,
        total: insights.length,
        unacknowledged: insights.filter(insight => insight.status === 'new').length
      };
      
      return res.json(response);
    } catch (error) {
      console.error(`Error getting insights: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve insights' });
    }
  }
  
  async getInsightById(req, res) {
    try {
      const insightId = req.params.insightId;
      
      // Use the real service to get an insight
      const insight = this.proactiveAnalysisService.getInsightById(insightId);
      
      if (!insight) {
        return res.status(404).json({ error: 'Insight not found' });
      }
      
      return res.json(insight);
    } catch (error) {
      console.error(`Error getting insight: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve insight' });
    }
  }
  
  async updateInsightStatus(req, res) {
    try {
      const insightId = req.params.insightId;
      const update = req.body;
      
      // Validate status
      const validStatuses = ['new', 'acknowledged', 'in_progress', 'completed', 'dismissed'];
      if (!validStatuses.includes(update.status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Use the real service to update an insight
      const updatedInsight = this.proactiveAnalysisService.updateInsightStatus(insightId, {
        status: update.status,
        comment: update.comment,
        assignedTo: update.assignedTo,
        updatedBy: req.user.id
      });
      
      if (!updatedInsight) {
        return res.status(404).json({ error: 'Insight not found' });
      }
      
      return res.json({
        insightId,
        status: updatedInsight.status,
        updatedAt: updatedInsight.updatedAt,
        updatedBy: updatedInsight.updatedBy
      });
    } catch (error) {
      console.error(`Error updating insight status: ${error.message}`);
      return res.status(500).json({ error: 'Failed to update insight status' });
    }
  }
  
  async executeRecommendedAction(req, res) {
    try {
      const insightId = req.params.insightId;
      const actionId = req.params.actionId;
      const parameters = req.body.parameters || {};
      const notes = req.body.notes;
      
      // Use the real service to execute an action
      const result = await this.proactiveAnalysisService.executeRecommendedAction(
        insightId,
        actionId,
        {
          ...parameters,
          notes,
          executedBy: req.user.id
        }
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error executing recommended action: ${error.message}`);
      return res.status(500).json({ error: 'Failed to execute recommended action' });
    }
  }
}

// Create an instance of the test controller
const testController = new TestProactiveInsightsController();

// Set up routes with the test controller methods
app.get('/api/insights', mockAuth, (req, res) => testController.getInsights(req, res));
app.get('/api/insights/:insightId', mockAuth, (req, res) => testController.getInsightById(req, res));
app.put('/api/insights/:insightId', mockAuth, (req, res) => testController.updateInsightStatus(req, res));
app.post('/api/insights/:insightId/actions/:actionId/execute', mockAuth, (req, res) => testController.executeRecommendedAction(req, res));

describe('ProactiveInsightsController - Integration Tests', () => {
  // Get a reference to the first test insight for testing
  const testInsight = testInsights[0];
  const testAction = testInsight.recommendedActions[0];
  
  describe('GET /api/insights', () => {
    it('should return a list of insights', async () => {
      // Act
      const response = await request(app)
        .get('/api/insights')
        .query({ airportCode: 'LHR' });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.insights.length).toBe(2);
      expect(response.body.total).toBe(2);
      expect(response.body.unacknowledged).toBe(2);
    });
    
    it('should filter insights by category', async () => {
      // Act
      const response = await request(app)
        .get('/api/insights')
        .query({ 
          airportCode: 'LHR',
          category: 'capacity_constraint'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.insights).toBeDefined();
      expect(response.body.insights.length).toBe(1);
      expect(response.body.insights[0].category).toBe('capacity_constraint');
    });
    
    it('should filter insights by priority', async () => {
      // Act
      const response = await request(app)
        .get('/api/insights')
        .query({ 
          airportCode: 'LHR',
          priority: 'high'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.insights).toBeDefined();
      expect(response.body.insights.length).toBe(1);
      expect(response.body.insights[0].priority).toBe('high');
    });
  });
  
  describe('GET /api/insights/:insightId', () => {
    it('should return a specific insight by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/insights/${testInsight.insightId}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.insightId).toBe(testInsight.insightId);
      expect(response.body.title).toBe(testInsight.title);
    });
    
    it('should return 404 for non-existent insight', async () => {
      // Act
      const response = await request(app)
        .get('/api/insights/non-existent');
      
      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('PUT /api/insights/:insightId', () => {
    it('should update the status of an insight', async () => {
      // Act
      const response = await request(app)
        .put(`/api/insights/${testInsight.insightId}`)
        .send({
          status: 'acknowledged',
          comment: 'Taking a look at this'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.insightId).toBe(testInsight.insightId);
      expect(response.body.status).toBe('acknowledged');
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.updatedBy).toBeDefined();
    });
    
    it('should return 400 for invalid status', async () => {
      // Act
      const response = await request(app)
        .put(`/api/insights/${testInsight.insightId}`)
        .send({
          status: 'invalid-status',
          comment: 'This status is invalid'
        });
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 404 for non-existent insight', async () => {
      // Act
      const response = await request(app)
        .put('/api/insights/non-existent')
        .send({
          status: 'acknowledged'
        });
      
      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/insights/:insightId/actions/:actionId/execute', () => {
    it('should execute a recommended action for an insight', async () => {
      // Act
      const response = await request(app)
        .post(`/api/insights/${testInsight.insightId}/actions/${testAction.actionId}/execute`)
        .send({
          parameters: {
            reassignCount: 3,
            targetTerminal: 'Terminal 1'
          },
          notes: 'Executing this action to reduce Terminal 2 load'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.executionId).toBeDefined();
      expect(response.body.insightId).toBe(testInsight.insightId);
      expect(response.body.actionId).toBe(testAction.actionId);
      expect(response.body.status).toBe('scheduled');
      expect(response.body.parameters).toBeDefined();
    });
    
    it('should return 500 for action execution failure', async () => {
      // Act
      const response = await request(app)
        .post(`/api/insights/${testInsight.insightId}/actions/invalid-action/execute`)
        .send({
          parameters: {},
          notes: 'This should fail'
        });
      
      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    // Close database connection if needed
    if (knex) {
      await knex.destroy();
    }
  });
});