/**
 * Integration tests for complete scenario workflow
 * Tests the full lifecycle from creation through calculation and result generation
 */
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../../src/index');
const db = require('../../../src/db');
const { Scenario, ScenarioVersion, ScenarioCalculation, ScenarioComparison } = require('../../../src/models/agent');
const standCapacityService = require('../../../src/services/standCapacityService');

// Use a test database for integration testing
describe('Full Scenario Workflow Integration Tests', () => {
  // JWT for authentication
  let authToken;
  let testUser;
  
  // Track created entities for cleanup
  let baselineScenarioId;
  let whatIfScenarioId;
  let calculationId;
  let comparisonId;
  
  beforeAll(async () => {
    // Create test user and generate auth token
    testUser = {
      id: uuidv4(),
      email: 'integration-test@example.com',
      role: 'analyst'
    };
    
    // Setup JWT token for authentication
    authToken = generateTestToken(testUser);
    
    // Mock authentication middleware
    jest.spyOn(app.request, 'isAuthenticated').mockImplementation(function() {
      return this.headers && this.headers.authorization === `Bearer ${authToken}`;
    });
    
    jest.spyOn(app.request, 'user', 'get').mockImplementation(function() {
      return this.isAuthenticated() ? testUser : null;
    });
  });
  
  afterAll(async () => {
    // Clean up created entities
    await cleanup();
    await db.destroy();
  });
  
  describe('End-to-End Scenario Workflow', () => {
    test('should complete the full scenario lifecycle', async () => {
      // Step 1: Create a baseline scenario
      const baselineResponse = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Baseline',
          description: 'Current airport configuration for integration testing',
          type: 'baseline',
          parameters: {
            totalStands: 40,
            wideBodyStands: 12,
            narrowBodyStands: 28,
            terminals: ['T1', 'T2']
          }
        });
      
      expect(baselineResponse.status).toBe(201);
      expect(baselineResponse.body).toHaveProperty('scenarioId');
      baselineScenarioId = baselineResponse.body.scenarioId;
      
      // Step 2: Calculate baseline scenario
      const baselineCalculationResponse = await request(app)
        .post(`/api/agent/scenarios/${baselineScenarioId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          options: {
            timeHorizon: 'day',
            date: new Date().toISOString().split('T')[0]
          }
        });
      
      expect(baselineCalculationResponse.status).toBe(202);
      expect(baselineCalculationResponse.body).toHaveProperty('calculationId');
      
      const baselineCalculationId = baselineCalculationResponse.body.calculationId;
      
      // Wait for calculation to complete
      await waitForCalculationCompletion(baselineScenarioId, baselineCalculationId);
      
      // Step 3: Create a what-if scenario using natural language
      const whatIfResponse = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'What if we add 5 wide-body stands to Terminal 2?',
          baselineId: baselineScenarioId
        });
      
      expect(whatIfResponse.status).toBe(201);
      expect(whatIfResponse.body).toHaveProperty('scenarioId');
      expect(whatIfResponse.body).toHaveProperty('parameters');
      whatIfScenarioId = whatIfResponse.body.scenarioId;
      
      // Verify the scenario was properly created with parsed parameters
      expect(whatIfResponse.body.parameters).toEqual(expect.objectContaining({
        standType: 'wide_body',
        count: 5,
        terminal: 'T2'
      }));
      
      // Step 4: Calculate what-if scenario
      const whatIfCalculationResponse = await request(app)
        .post(`/api/agent/scenarios/${whatIfScenarioId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          options: {
            timeHorizon: 'day',
            date: new Date().toISOString().split('T')[0]
          }
        });
      
      expect(whatIfCalculationResponse.status).toBe(202);
      expect(whatIfCalculationResponse.body).toHaveProperty('calculationId');
      calculationId = whatIfCalculationResponse.body.calculationId;
      
      // Wait for calculation to complete
      await waitForCalculationCompletion(whatIfScenarioId, calculationId);
      
      // Step 5: Get calculation results
      const calculationResultsResponse = await request(app)
        .get(`/api/agent/scenarios/${whatIfScenarioId}/calculations/${calculationId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(calculationResultsResponse.status).toBe(200);
      expect(calculationResultsResponse.body).toHaveProperty('status', 'completed');
      expect(calculationResultsResponse.body).toHaveProperty('results');
      
      const results = calculationResultsResponse.body.results;
      
      // Verify calculation results structure
      expect(results).toHaveProperty('capacity');
      expect(results).toHaveProperty('utilization');
      expect(results.capacity).toHaveProperty('total');
      expect(results.capacity).toHaveProperty('byStandType');
      expect(results.capacity).toHaveProperty('byHour');
      expect(results.utilization).toHaveProperty('overall');
      
      // Step 6: Create a comparison between baseline and what-if scenarios
      const comparisonResponse = await request(app)
        .post('/api/agent/scenarios/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenarioIds: [baselineScenarioId, whatIfScenarioId],
          metrics: ['capacity', 'utilization'],
          timeRange: { start: '06:00', end: '22:00' }
        });
      
      expect(comparisonResponse.status).toBe(202);
      expect(comparisonResponse.body).toHaveProperty('comparisonId');
      comparisonId = comparisonResponse.body.comparisonId;
      
      // Wait for comparison to complete
      await waitForComparisonCompletion(comparisonId);
      
      // Step 7: Get comparison results
      const comparisonResultsResponse = await request(app)
        .get(`/api/agent/scenarios/comparisons/${comparisonId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(comparisonResultsResponse.status).toBe(200);
      expect(comparisonResultsResponse.body).toHaveProperty('status', 'completed');
      expect(comparisonResultsResponse.body).toHaveProperty('results');
      expect(comparisonResultsResponse.body).toHaveProperty('scenarios');
      
      const comparisonResults = comparisonResultsResponse.body.results;
      
      // Verify comparison results structure
      expect(comparisonResults).toHaveProperty('capacityDiff');
      expect(comparisonResults).toHaveProperty('utilizationDiff');
      
      // Step 8: Update the what-if scenario
      const updateResponse = await request(app)
        .put(`/api/agent/scenarios/${whatIfScenarioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated What-If Scenario',
          parameters: {
            standType: 'wide_body',
            count: 8, // Changed from 5 to 8
            terminal: 'T2'
          }
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('title', 'Updated What-If Scenario');
      expect(updateResponse.body.parameters).toEqual(expect.objectContaining({
        count: 8  // Verify parameter was updated
      }));
      
      // Step 9: Calculate updated scenario
      const updatedCalculationResponse = await request(app)
        .post(`/api/agent/scenarios/${whatIfScenarioId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          options: {
            timeHorizon: 'day',
            date: new Date().toISOString().split('T')[0]
          }
        });
      
      expect(updatedCalculationResponse.status).toBe(202);
      
      // Verify we have a new calculation ID
      const newCalculationId = updatedCalculationResponse.body.calculationId;
      expect(newCalculationId).not.toBe(calculationId);
      
      // Wait for updated calculation to complete
      await waitForCalculationCompletion(whatIfScenarioId, newCalculationId);
      
      // Step 10: Get scenario versions
      const versionsResponse = await request(app)
        .get(`/api/agent/scenarios/${whatIfScenarioId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(versionsResponse.status).toBe(200);
      expect(versionsResponse.body).toBeInstanceOf(Array);
      expect(versionsResponse.body.length).toBeGreaterThanOrEqual(2); // At least 2 versions (original + update)
    });
  });
  
  // Helper functions
  async function waitForCalculationCompletion(scenarioId, calculationId) {
    const maxAttempts = 10;
    let attempts = 0;
    let completed = false;
    
    while (!completed && attempts < maxAttempts) {
      const response = await request(app)
        .get(`/api/agent/scenarios/${scenarioId}/calculations/${calculationId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      if (response.body.status === 'completed' || response.body.status === 'failed') {
        completed = true;
      } else {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before checking again
      }
    }
    
    if (!completed) {
      throw new Error(`Calculation ${calculationId} did not complete within expected time`);
    }
  }
  
  async function waitForComparisonCompletion(comparisonId) {
    const maxAttempts = 10;
    let attempts = 0;
    let completed = false;
    
    while (!completed && attempts < maxAttempts) {
      const response = await request(app)
        .get(`/api/agent/scenarios/comparisons/${comparisonId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      if (response.body.status === 'completed' || response.body.status === 'failed') {
        completed = true;
      } else {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before checking again
      }
    }
    
    if (!completed) {
      throw new Error(`Comparison ${comparisonId} did not complete within expected time`);
    }
  }
  
  function generateTestToken(user) {
    // Mock function to generate JWT token for testing
    // In a real application, you would use a proper JWT library
    return 'mock-jwt-token-for-testing';
  }
  
  async function cleanup() {
    // Clean up test data
    if (comparisonId) {
      await ScenarioComparison.query().deleteById(comparisonId);
    }
    
    if (calculationId) {
      await ScenarioCalculation.query().deleteById(calculationId);
    }
    
    if (whatIfScenarioId) {
      await ScenarioVersion.query().delete().where('scenarioId', whatIfScenarioId);
      await Scenario.query().deleteById(whatIfScenarioId);
    }
    
    if (baselineScenarioId) {
      await ScenarioVersion.query().delete().where('scenarioId', baselineScenarioId);
      await Scenario.query().deleteById(baselineScenarioId);
    }
  }
});