/**
 * Integration test for scenario API endpoints
 * Tests the API endpoints for scenarios
 */
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../../src/index');
const scenarioController = require('../../../src/controllers/agent/ScenarioController');
const scenarioService = require('../../../src/services/agent/ScenarioService');
const { Scenario, ScenarioCalculation, ScenarioComparison, ScenarioTemplate } = require('../../../src/models/agent');

// Mock the models
jest.mock('../../../src/models/agent');

// Mock the services
jest.mock('../../../src/services/agent/ScenarioService');

describe('Scenario API Endpoints', () => {
  // Test tokens for authorization
  const testToken = 'test-jwt-token';
  const invalidToken = 'invalid-jwt-token';
  
  // Test data
  const testUserId = uuidv4();
  const testScenarioId = uuidv4();
  const testCalculationId = uuidv4();
  const testComparisonId = uuidv4();
  const testTemplateId = uuidv4();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to provide test user
    jest.spyOn(app.request, 'isAuthenticated').mockImplementation(function() {
      return this.headers && this.headers.authorization === `Bearer ${testToken}`;
    });
    
    jest.spyOn(app.request, 'user', 'get').mockImplementation(function() {
      return this.isAuthenticated() ? { id: testUserId, email: 'test@example.com' } : null;
    });
    
    // Setup mock Scenario functions
    Scenario.query = jest.fn().mockReturnThis();
    Scenario.insert = jest.fn();
    Scenario.findById = jest.fn();
    Scenario.where = jest.fn().mockReturnThis();
    Scenario.andWhere = jest.fn().mockReturnThis();
    Scenario.withGraphFetched = jest.fn().mockReturnThis();
    Scenario.orderBy = jest.fn().mockReturnThis();
    Scenario.limit = jest.fn().mockReturnThis();
    Scenario.offset = jest.fn().mockReturnThis();
    Scenario.first = jest.fn();
    Scenario.count = jest.fn().mockReturnThis();
    
    // Setup mock ScenarioCalculation functions
    ScenarioCalculation.query = jest.fn().mockReturnThis();
    ScenarioCalculation.findById = jest.fn();
    
    // Setup mock ScenarioComparison functions
    ScenarioComparison.query = jest.fn().mockReturnThis();
    ScenarioComparison.insert = jest.fn();
    ScenarioComparison.findById = jest.fn();
    
    // Setup mock ScenarioTemplate functions
    ScenarioTemplate.query = jest.fn().mockReturnThis();
    ScenarioTemplate.findById = jest.fn();
    
    // Setup mock scenarioService functions
    scenarioService.createFromNaturalLanguage = jest.fn();
    scenarioService.queueCalculationJob = jest.fn().mockResolvedValue(true);
    scenarioService.queueComparisonJob = jest.fn().mockResolvedValue(true);
  });
  
  describe('POST /api/agent/scenarios', () => {
    test('should create a scenario with valid data', async () => {
      // Mock scenario creation
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario description',
        status: 'created',
        parameters: {},
        type: 'manual',
        baselineId: null
      };
      
      Scenario.insert.mockResolvedValue(mockScenario);
      
      // Send request
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'Test scenario description',
          title: 'Test Scenario'
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId', testScenarioId);
      expect(response.body).toHaveProperty('description', 'Test scenario description');
      expect(Scenario.insert).toHaveBeenCalledTimes(1);
    });
    
    test('should create a scenario using NLP with valid data', async () => {
      // Mock NLP scenario creation
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'What if we add 5 wide-body stands',
        description: 'What if we add 5 wide-body stands to Terminal 2?',
        status: 'created',
        parameters: { terminal: 'T2', standType: 'wide_body', count: 5 },
        type: 'what-if',
        baselineId: null
      };
      
      scenarioService.createFromNaturalLanguage.mockResolvedValue(mockScenario);
      
      // Send request
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'What if we add 5 wide-body stands to Terminal 2?'
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId', testScenarioId);
      expect(response.body).toHaveProperty('parameters');
      expect(scenarioService.createFromNaturalLanguage).toHaveBeenCalledWith(
        testUserId,
        expect.any(String),
        'What if we add 5 wide-body stands to Terminal 2?',
        null
      );
    });
    
    test('should return 400 for missing description', async () => {
      // Send request without description
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Scenario'
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Description is required');
      expect(Scenario.insert).not.toHaveBeenCalled();
      expect(scenarioService.createFromNaturalLanguage).not.toHaveBeenCalled();
    });
    
    test('should return 401 with invalid token', async () => {
      // Send request with invalid token
      const response = await request(app)
        .post('/api/agent/scenarios')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          description: 'Test scenario description',
          title: 'Test Scenario'
        });
      
      // Assertions
      expect(response.status).toBe(401);
      expect(Scenario.insert).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/agent/scenarios/:scenarioId', () => {
    test('should retrieve a scenario by ID', async () => {
      // Mock scenario retrieval
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario description',
        status: 'created',
        parameters: {},
        type: 'manual',
        baselineId: null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        lastCalculatedAt: null,
        calculations: [],
        tags: []
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scenarioId', testScenarioId);
      expect(response.body).toHaveProperty('description', 'Test scenario description');
      expect(Scenario.findById).toHaveBeenCalledWith(testScenarioId);
    });
    
    test('should return 404 for non-existent scenario', async () => {
      // Mock scenario not found
      Scenario.findById.mockResolvedValue(null);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Scenario not found');
    });
    
    test('should return 403 for unauthorized access', async () => {
      // Mock scenario with different user
      const mockScenario = {
        id: testScenarioId,
        userId: uuidv4(), // Different user
        title: 'Test Scenario',
        description: 'Test scenario description',
        status: 'created',
        parameters: {},
        isPublic: false
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Unauthorized access to scenario');
    });
  });
  
  describe('PUT /api/agent/scenarios/:scenarioId', () => {
    test('should update a scenario', async () => {
      // Mock scenario retrieval
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario description',
        status: 'created',
        parameters: {},
        $query: jest.fn().mockReturnThis(),
        patch: jest.fn().mockImplementation(updates => ({
          ...mockScenario,
          ...updates
        })),
        createVersion: jest.fn().mockResolvedValue({})
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      
      // Send update request
      const response = await request(app)
        .put(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'Updated description',
          parameters: { terminal: 'T2', standCount: 5 }
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('description', 'Updated description');
      expect(mockScenario.createVersion).toHaveBeenCalledTimes(1);
      expect(mockScenario.$query).toHaveBeenCalledTimes(1);
      expect(mockScenario.patch).toHaveBeenCalledWith({
        description: 'Updated description',
        parameters: { terminal: 'T2', standCount: 5 }
      });
    });
    
    test('should return 404 for non-existent scenario', async () => {
      // Mock scenario not found
      Scenario.findById.mockResolvedValue(null);
      
      // Send request
      const response = await request(app)
        .put(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'Updated description'
        });
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Scenario not found');
    });
    
    test('should return 403 for unauthorized update', async () => {
      // Mock scenario with different user
      const mockScenario = {
        id: testScenarioId,
        userId: uuidv4(), // Different user
        title: 'Test Scenario',
        description: 'Test scenario description'
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      
      // Send request
      const response = await request(app)
        .put(`/api/agent/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'Updated description'
        });
      
      // Assertions
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Unauthorized to update scenario');
    });
  });
  
  describe('GET /api/agent/scenarios', () => {
    test('should list user scenarios', async () => {
      // Mock scenarios list
      const mockScenarios = [
        {
          id: testScenarioId,
          userId: testUserId,
          title: 'Test Scenario 1',
          description: 'Test scenario 1',
          status: 'created',
          type: 'manual',
          createdAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          userId: testUserId,
          title: 'Test Scenario 2',
          description: 'Test scenario 2',
          status: 'created',
          type: 'what-if',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Mock count result
      const mockCount = { total: '2' };
      
      Scenario.mockReturnValueOnce(mockScenarios);
      Scenario.first.mockResolvedValue(mockCount);
      
      // Send request
      const response = await request(app)
        .get('/api/agent/scenarios')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body.scenarios.length).toBe(2);
      expect(response.body).toHaveProperty('total', 2);
      expect(Scenario.where).toHaveBeenCalledWith('userId', testUserId);
      expect(Scenario.orderBy).toHaveBeenCalledWith('modifiedAt', 'desc');
    });
    
    test('should filter scenarios by type and status', async () => {
      // Mock filtered scenarios
      const mockScenarios = [
        {
          id: testScenarioId,
          userId: testUserId,
          title: 'Test What-If Scenario',
          description: 'Test what-if',
          status: 'completed',
          type: 'what-if',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Mock count result
      const mockCount = { total: '1' };
      
      Scenario.mockReturnValueOnce(mockScenarios);
      Scenario.first.mockResolvedValue(mockCount);
      
      // Send request with filters
      const response = await request(app)
        .get('/api/agent/scenarios?type=what-if&status=completed')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body.scenarios.length).toBe(1);
      expect(response.body.scenarios[0].type).toBe('what-if');
      expect(response.body.scenarios[0].status).toBe('completed');
      expect(Scenario.where).toHaveBeenCalledWith('userId', testUserId);
      expect(Scenario.where).toHaveBeenCalledWith('type', 'what-if');
      expect(Scenario.where).toHaveBeenCalledWith('status', 'completed');
    });
  });
  
  describe('POST /api/agent/scenarios/:scenarioId/calculate', () => {
    test('should start scenario calculation', async () => {
      // Mock scenario
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario',
        status: 'created',
        startCalculation: jest.fn().mockResolvedValue({
          id: testCalculationId,
          scenarioId: testScenarioId,
          status: 'processing'
        })
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      
      // Send calculation request
      const response = await request(app)
        .post(`/api/agent/scenarios/${testScenarioId}/calculate`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          options: {
            timeHorizon: 'day',
            compareWith: null
          }
        });
      
      // Assertions
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('calculationId', testCalculationId);
      expect(response.body).toHaveProperty('status', 'processing');
      expect(mockScenario.startCalculation).toHaveBeenCalledWith('standard', {
        timeHorizon: 'day',
        compareWith: null
      });
      expect(scenarioService.queueCalculationJob).toHaveBeenCalledTimes(1);
    });
    
    test('should return 404 for non-existent scenario', async () => {
      // Mock scenario not found
      Scenario.findById.mockResolvedValue(null);
      
      // Send request
      const response = await request(app)
        .post(`/api/agent/scenarios/${testScenarioId}/calculate`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          options: { timeHorizon: 'day' }
        });
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Scenario not found');
      expect(scenarioService.queueCalculationJob).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/agent/scenarios/:scenarioId/calculations/:calculationId', () => {
    test('should retrieve calculation results', async () => {
      // Mock scenario
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario'
      };
      
      // Mock calculation
      const mockCalculation = {
        id: testCalculationId,
        scenarioId: testScenarioId,
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: {
          capacity: { total: 120 },
          utilization: { overall: 0.85 }
        },
        errorMessage: null
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      ScenarioCalculation.findById.mockResolvedValue(mockCalculation);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/${testScenarioId}/calculations/${testCalculationId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('calculationId', testCalculationId);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toEqual({
        capacity: { total: 120 },
        utilization: { overall: 0.85 }
      });
    });
    
    test('should return 404 for non-existent calculation', async () => {
      // Mock scenario
      const mockScenario = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario',
        description: 'Test scenario'
      };
      
      Scenario.findById.mockResolvedValue(mockScenario);
      ScenarioCalculation.findById.mockResolvedValue(null);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/${testScenarioId}/calculations/${testCalculationId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Calculation not found');
    });
  });
  
  describe('POST /api/agent/scenarios/compare', () => {
    test('should create scenario comparison', async () => {
      // Mock scenarios
      const mockScenario1 = {
        id: testScenarioId,
        userId: testUserId,
        title: 'Test Scenario 1'
      };
      
      const mockScenario2 = {
        id: uuidv4(),
        userId: testUserId,
        title: 'Test Scenario 2'
      };
      
      // Mock comparison
      const mockComparison = {
        id: testComparisonId,
        scenarioIds: [mockScenario1.id, mockScenario2.id],
        userId: testUserId,
        metrics: ['capacity', 'utilization'],
        timeRange: { start: '06:00', end: '22:00' },
        status: 'pending'
      };
      
      Scenario.findById
        .mockResolvedValueOnce(mockScenario1)
        .mockResolvedValueOnce(mockScenario2);
      
      ScenarioComparison.insert.mockResolvedValue(mockComparison);
      
      // Send comparison request
      const response = await request(app)
        .post('/api/agent/scenarios/compare')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          scenarioIds: [mockScenario1.id, mockScenario2.id],
          metrics: ['capacity', 'utilization'],
          timeRange: { start: '06:00', end: '22:00' }
        });
      
      // Assertions
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('comparisonId', testComparisonId);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(ScenarioComparison.insert).toHaveBeenCalledWith(expect.objectContaining({
        scenarioIds: [mockScenario1.id, mockScenario2.id],
        userId: testUserId,
        metrics: ['capacity', 'utilization'],
        timeRange: { start: '06:00', end: '22:00' },
        status: 'pending'
      }));
      expect(scenarioService.queueComparisonJob).toHaveBeenCalledWith(testComparisonId);
    });
    
    test('should return 400 with invalid scenario IDs', async () => {
      // Send request with invalid data
      const response = await request(app)
        .post('/api/agent/scenarios/compare')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          scenarioIds: [testScenarioId], // Only one ID
          metrics: ['capacity', 'utilization']
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'At least two scenario IDs are required');
      expect(ScenarioComparison.insert).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/agent/scenarios/comparisons/:comparisonId', () => {
    test('should retrieve comparison results', async () => {
      // Mock comparison with results
      const mockComparison = {
        id: testComparisonId,
        scenarioIds: [testScenarioId, uuidv4()],
        userId: testUserId,
        metrics: ['capacity', 'utilization'],
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        results: {
          capacityDiff: { baseline: { total: 100 }, scenario1: { total: 120 } },
          utilizationDiff: { baseline: { overall: 0.80 }, scenario1: { overall: 0.85 } }
        },
        getScenarioDetails: jest.fn().mockResolvedValue([
          { id: testScenarioId, title: 'Baseline Scenario' },
          { id: uuidv4(), title: 'What-If Scenario' }
        ])
      };
      
      ScenarioComparison.findById.mockResolvedValue(mockComparison);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/comparisons/${testComparisonId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('comparisonId', testComparisonId);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('scenarios');
      expect(mockComparison.getScenarioDetails).toHaveBeenCalledTimes(1);
    });
    
    test('should return 404 for non-existent comparison', async () => {
      // Mock comparison not found
      ScenarioComparison.findById.mockResolvedValue(null);
      
      // Send request
      const response = await request(app)
        .get(`/api/agent/scenarios/comparisons/${testComparisonId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Comparison not found');
    });
  });
  
  describe('GET /api/agent/scenarios/templates', () => {
    test('should list available templates', async () => {
      // Mock templates
      const mockTemplates = [
        {
          id: testTemplateId,
          name: 'Add Stands',
          description: 'Add stands to a terminal',
          category: 'infrastructure',
          isSystem: true,
          requiredParameters: ['terminal', 'standType', 'count']
        },
        {
          id: uuidv4(),
          name: 'Optimize Terminal Allocation',
          description: 'Optimize airline allocation to terminals',
          category: 'operations',
          isSystem: true,
          requiredParameters: ['airlines', 'preferredTerminal']
        }
      ];
      
      ScenarioTemplate.mockReturnValueOnce(mockTemplates);
      
      // Send request
      const response = await request(app)
        .get('/api/agent/scenarios/templates')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name', 'Add Stands');
      expect(response.body[1]).toHaveProperty('category', 'operations');
    });
    
    test('should filter templates by category', async () => {
      // Mock filtered templates
      const mockTemplates = [
        {
          id: testTemplateId,
          name: 'Add Stands',
          description: 'Add stands to a terminal',
          category: 'infrastructure',
          isSystem: true,
          requiredParameters: ['terminal', 'standType', 'count']
        }
      ];
      
      ScenarioTemplate.mockReturnValueOnce(mockTemplates);
      
      // Send request with category filter
      const response = await request(app)
        .get('/api/agent/scenarios/templates?category=infrastructure')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('category', 'infrastructure');
      expect(ScenarioTemplate.where).toHaveBeenCalledWith('category', 'infrastructure');
    });
  });
  
  describe('POST /api/agent/scenarios/templates/:templateId/create', () => {
    test('should create scenario from template', async () => {
      // Mock template
      const mockTemplate = {
        id: testTemplateId,
        name: 'Add Stands',
        description: 'Add stands to a terminal',
        category: 'infrastructure',
        defaultParameters: { standType: 'narrow_body' },
        requiredParameters: ['terminal', 'standType', 'count'],
        isSystem: true,
        validateParameters: jest.fn().mockReturnValue({ isValid: true }),
        createScenario: jest.fn().mockResolvedValue({
          id: testScenarioId,
          title: 'New Stand Configuration',
          description: 'Adding 5 narrow-body stands to Terminal 2',
          status: 'created',
          parameters: { terminal: 'T2', standType: 'narrow_body', count: 5 }
        })
      };
      
      ScenarioTemplate.findById.mockResolvedValue(mockTemplate);
      
      // Send request
      const response = await request(app)
        .post(`/api/agent/scenarios/templates/${testTemplateId}/create`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'New Stand Configuration',
          description: 'Adding 5 narrow-body stands to Terminal 2',
          parameters: {
            terminal: 'T2',
            standType: 'narrow_body',
            count: 5
          }
        });
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('scenarioId', testScenarioId);
      expect(response.body).toHaveProperty('title', 'New Stand Configuration');
      expect(response.body).toHaveProperty('metadata.templateId', testTemplateId);
      expect(mockTemplate.validateParameters).toHaveBeenCalledWith({
        terminal: 'T2',
        standType: 'narrow_body',
        count: 5
      });
      expect(mockTemplate.createScenario).toHaveBeenCalledWith(
        testUserId,
        'New Stand Configuration',
        'Adding 5 narrow-body stands to Terminal 2',
        {
          terminal: 'T2',
          standType: 'narrow_body',
          count: 5
        }
      );
    });
    
    test('should return 400 for invalid parameters', async () => {
      // Mock template with validation failure
      const mockTemplate = {
        id: testTemplateId,
        name: 'Add Stands',
        description: 'Add stands to a terminal',
        isSystem: true,
        validateParameters: jest.fn().mockReturnValue({
          isValid: false,
          errors: ['terminal is required', 'count must be a number']
        })
      };
      
      ScenarioTemplate.findById.mockResolvedValue(mockTemplate);
      
      // Send request with invalid parameters
      const response = await request(app)
        .post(`/api/agent/scenarios/templates/${testTemplateId}/create`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'New Stand Configuration',
          description: 'Adding 5 narrow-body stands',
          parameters: {
            standType: 'narrow_body'
            // Missing terminal and count
          }
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid parameters');
      expect(response.body).toHaveProperty('details');
      expect(mockTemplate.validateParameters).toHaveBeenCalledTimes(1);
    });
  });
});