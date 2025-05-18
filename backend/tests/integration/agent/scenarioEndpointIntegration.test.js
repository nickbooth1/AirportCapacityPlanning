/**
 * Integration tests for scenario API endpoints with database interaction
 * Tests the complete workflow between API endpoints and database
 */
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../../src/index');
const db = require('../../../src/db');
const { Scenario, ScenarioCalculation, ScenarioTemplate } = require('../../../src/models/agent');
const scenarioService = require('../../../src/services/agent/ScenarioService');
const nlpService = require('../../../src/services/agent/NLPService');

// Create transaction for test isolation
let transaction;

describe('Scenario API Endpoint Integration Tests', () => {
  // Test user data
  const testUserId = uuidv4();
  const testUser = {
    id: testUserId,
    email: 'api-test@example.com',
    role: 'analyst'
  };
  
  // Test JWT token
  const testToken = 'integration-test-token';
  
  beforeAll(async () => {
    // Setup transaction for test isolation
    transaction = await db.transaction();
    
    // Mock authentication
    jest.spyOn(app.request, 'isAuthenticated').mockImplementation(function() {
      return this.headers && this.headers.authorization === `Bearer ${testToken}`;
    });
    
    jest.spyOn(app.request, 'user', 'get').mockImplementation(function() {
      return this.isAuthenticated() ? testUser : null;
    });
    
    // Seed template data
    await ScenarioTemplate.query(transaction).insert([
      {
        id: uuidv4(),
        name: 'Add Terminal Stands',
        description: 'Add additional stands to a terminal',
        category: 'infrastructure',
        isSystem: true,
        requiredParameters: ['terminal', 'standType', 'count'],
        defaultParameters: {
          standType: 'narrow_body',
          count: 3
        }
      },
      {
        id: uuidv4(),
        name: 'Optimize Terminal Allocation',
        description: 'Optimize allocation of flights to terminals',
        category: 'operations',
        isSystem: true,
        requiredParameters: ['terminalPreference', 'timeFrame'],
        defaultParameters: {
          terminalPreference: 'balanced',
          timeFrame: 'all_day'
        }
      }
    ]);
  });
  
  afterAll(async () => {
    // Roll back transaction to clean up
    await transaction.rollback();
    await db.destroy();
  });
  
  describe('Template-based scenario creation API flow', () => {
    let templateId;
    let scenarioId;
    
    test('should retrieve available templates', async () => {
      // Get templates
      const response = await request(app)
        .get('/api/agent/scenarios/templates')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('category');
      
      // Save template ID for next tests
      templateId = response.body[0].id;
    });
    
    test('should create scenario from template', async () => {
      // Skip if template ID wasn't found
      if (!templateId) {
        return;
      }
      
      // Create scenario from template
      const response = await request(app)
        .post(`/api/agent/scenarios/templates/${templateId}/create`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Terminal Expansion',
          description: 'Adding 5 wide-body stands to Terminal 2',
          parameters: {
            terminal: 'T2',
            standType: 'wide_body',
            count: 5
          }
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId');
      expect(response.body).toHaveProperty('title', 'Test Terminal Expansion');
      expect(response.body).toHaveProperty('parameters');
      expect(response.body.parameters).toEqual(expect.objectContaining({
        terminal: 'T2',
        standType: 'wide_body',
        count: 5
      }));
      
      // Save scenario ID for next tests
      scenarioId = response.body.scenarioId;
      
      // Verify scenario was created in database
      const dbScenario = await Scenario.query(transaction).findById(scenarioId);
      expect(dbScenario).toBeDefined();
      expect(dbScenario.title).toBe('Test Terminal Expansion');
      expect(dbScenario.parameters).toEqual(expect.objectContaining({
        terminal: 'T2',
        standType: 'wide_body',
        count: 5
      }));
    });
    
    test('should update created scenario', async () => {
      // Skip if scenario wasn't created
      if (!scenarioId) {
        return;
      }
      
      // Update scenario
      const response = await request(app)
        .put(`/api/agent/scenarios/${scenarioId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Updated Terminal Expansion',
          parameters: {
            terminal: 'T2',
            standType: 'wide_body',
            count: 8  // Increased from 5 to 8
          }
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Updated Terminal Expansion');
      expect(response.body.parameters).toEqual(expect.objectContaining({
        count: 8
      }));
      
      // Verify update in database
      const dbScenario = await Scenario.query(transaction).findById(scenarioId);
      expect(dbScenario.title).toBe('Updated Terminal Expansion');
      expect(dbScenario.parameters.count).toBe(8);
    });
    
    test('should start calculation for scenario', async () => {
      // Skip if scenario wasn't created
      if (!scenarioId) {
        return;
      }
      
      // Start calculation
      const response = await request(app)
        .post(`/api/agent/scenarios/${scenarioId}/calculate`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          options: {
            timeHorizon: 'day',
            date: new Date().toISOString().split('T')[0]
          }
        });
      
      // Assertions
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('calculationId');
      expect(response.body).toHaveProperty('status', 'processing');
      
      // Verify calculation was created in database
      const calculationId = response.body.calculationId;
      const dbCalculation = await ScenarioCalculation.query(transaction).findById(calculationId);
      expect(dbCalculation).toBeDefined();
      expect(dbCalculation.scenarioId).toBe(scenarioId);
      expect(dbCalculation.status).toBe('processing');
    });
  });
  
  describe('Natural language scenario API flow', () => {
    let baselineId;
    let whatIfId;
    
    test('should create baseline scenario', async () => {
      // Create baseline
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Current Airport Setup',
          description: 'Baseline airport configuration for natural language tests',
          type: 'baseline',
          parameters: {
            totalStands: 45,
            wideBodyStands: 15,
            narrowBodyStands: 30,
            terminals: ['T1', 'T2']
          }
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId');
      
      // Save baseline ID
      baselineId = response.body.scenarioId;
      
      // Verify in database
      const dbScenario = await Scenario.query(transaction).findById(baselineId);
      expect(dbScenario).toBeDefined();
      expect(dbScenario.type).toBe('baseline');
    });
    
    test('should create what-if scenario using natural language', async () => {
      // Skip if baseline wasn't created
      if (!baselineId) {
        return;
      }
      
      // Setup NLP service mock
      const parsedIntent = {
        intent: 'add_stands',
        confidence: 0.95,
        parameters: {
          standType: 'wide_body',
          count: 5,
          terminal: 'T2',
          operation: 'add'
        }
      };
      
      // Mock the NLP service
      nlpService.parseScenarioIntent = jest.fn().mockResolvedValue(parsedIntent);
      
      // Create what-if scenario
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'What if we add 5 wide-body stands to Terminal 2?',
          baselineId: baselineId
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId');
      expect(response.body).toHaveProperty('parameters');
      expect(response.body.parameters).toEqual(expect.objectContaining({
        standType: 'wide_body',
        count: 5,
        terminal: 'T2'
      }));
      
      // Save what-if ID
      whatIfId = response.body.scenarioId;
      
      // Verify NLP service was called
      expect(nlpService.parseScenarioIntent).toHaveBeenCalledWith(
        'What if we add 5 wide-body stands to Terminal 2?'
      );
      
      // Verify scenario in database
      const dbScenario = await Scenario.query(transaction).findById(whatIfId);
      expect(dbScenario).toBeDefined();
      expect(dbScenario.type).toBe('what-if');
      expect(dbScenario.baselineId).toBe(baselineId);
    });
    
    test('should handle ambiguous natural language input', async () => {
      // Setup NLP service mock for ambiguous input
      const ambiguousResult = {
        intent: 'unknown',
        confidence: 0.3,
        needsClarification: true,
        clarificationQuestions: [
          'Which terminal do you want to modify?',
          'What type of stands do you want to add?',
          'How many stands do you want to add?'
        ]
      };
      
      // Mock the NLP service
      nlpService.parseScenarioIntent = jest.fn().mockResolvedValue(ambiguousResult);
      
      // Create scenario with ambiguous description
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'What if we change the stand configuration?',
          baselineId: baselineId
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('clarificationQuestions');
      expect(response.body.clarificationQuestions).toEqual(expect.arrayContaining([
        'Which terminal do you want to modify?',
        'What type of stands do you want to add?',
        'How many stands do you want to add?'
      ]));
    });
    
    test('should list scenarios with filtering', async () => {
      // Get scenarios with filter
      const response = await request(app)
        .get('/api/agent/scenarios?type=what-if')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body).toHaveProperty('total');
      
      // Should contain our what-if scenario
      const scenarios = response.body.scenarios;
      const foundScenario = scenarios.find(s => s.id === whatIfId);
      expect(foundScenario).toBeDefined();
      expect(foundScenario.type).toBe('what-if');
      
      // Shouldn't contain baseline scenarios
      const baselineScenario = scenarios.find(s => s.id === baselineId);
      expect(baselineScenario).toBeUndefined();
    });
  });
});