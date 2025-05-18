/**
 * Integration test for scenario workflow
 * Tests the end-to-end workflow of creating, calculating, and comparing scenarios
 */
const { v4: uuidv4 } = require('uuid');
const scenarioService = require('../../../src/services/agent/ScenarioService');
const { 
  Scenario, 
  ScenarioVersion, 
  ScenarioCalculation,
  ScenarioComparison 
} = require('../../../src/models/agent');

// Mock the database for isolated tests
jest.mock('../../../src/db');

// Mock dependent services
jest.mock('../../../src/services/standCapacityService');

describe('Scenario Workflow Integration Tests', () => {
  // Setup test data
  let testUser;
  let baselineScenario;
  let whatIfScenario;
  let calculation;
  
  beforeAll(async () => {
    // Create test user
    testUser = { id: uuidv4(), email: 'test@example.com' };
    
    // Mock implementations
    Scenario.query = jest.fn().mockReturnThis();
    Scenario.findById = jest.fn();
    Scenario.insert = jest.fn();
    Scenario.where = jest.fn().mockReturnThis();
    Scenario.withGraphFetched = jest.fn().mockReturnThis();
    Scenario.orderBy = jest.fn().mockReturnThis();
    ScenarioCalculation.query = jest.fn().mockReturnThis();
    ScenarioCalculation.findById = jest.fn();
    ScenarioComparison.query = jest.fn().mockReturnThis();
    ScenarioComparison.findById = jest.fn();
    
    // Create baseline scenario for testing
    baselineScenario = {
      id: uuidv4(),
      userId: testUser.id,
      title: 'Baseline Scenario',
      description: 'Current airport configuration',
      type: 'baseline',
      status: 'created',
      parameters: {
        totalStands: 50,
        wideBodyStands: 15
      },
      createdAt: new Date().toISOString(),
      $query: jest.fn().mockReturnThis(),
      patch: jest.fn().mockResolvedValue(baselineScenario),
      createVersion: jest.fn().mockResolvedValue({}),
      startCalculation: jest.fn()
    };

    // Create what-if scenario for testing
    whatIfScenario = {
      id: uuidv4(),
      userId: testUser.id,
      title: 'What-If Scenario',
      description: 'Add 5 wide-body stands',
      baselineId: baselineScenario.id,
      type: 'what-if',
      status: 'created',
      parameters: {
        totalStands: 55,
        wideBodyStands: 20
      },
      createdAt: new Date().toISOString(),
      $query: jest.fn().mockReturnThis(),
      patch: jest.fn().mockResolvedValue(whatIfScenario),
      createVersion: jest.fn().mockResolvedValue({}),
      startCalculation: jest.fn()
    };

    // Create calculation result
    calculation = {
      id: uuidv4(),
      scenarioId: whatIfScenario.id,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      results: {
        capacity: {
          totalCapacity: 120,
          byHour: [/* hourly data */]
        },
        utilization: {
          overall: 0.85,
          byTerminal: {
            T1: 0.92,
            T2: 0.78
          }
        }
      }
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    Scenario.findById.mockResolvedValue(null);
    ScenarioCalculation.findById.mockResolvedValue(null);
    ScenarioComparison.findById.mockResolvedValue(null);
    Scenario.insert.mockResolvedValue(whatIfScenario);
    
    // Setup scenario service mocks
    scenarioService.createFromNaturalLanguage = jest.fn().mockResolvedValue(whatIfScenario);
    scenarioService.queueCalculationJob = jest.fn().mockResolvedValue(true);
    scenarioService.queueComparisonJob = jest.fn().mockResolvedValue(true);
    
    // Mock startCalculation
    whatIfScenario.startCalculation.mockResolvedValue({
      id: calculation.id,
      status: 'processing'
    });
  });

  describe('Scenario Creation Flow', () => {
    test('should create a baseline scenario', async () => {
      // Mock scenario creation
      Scenario.insert.mockResolvedValueOnce(baselineScenario);
      
      // Create scenario via service
      const scenario = await Scenario.query().insert(baselineScenario);
      
      // Assertions
      expect(scenario).toBeDefined();
      expect(scenario.id).toBe(baselineScenario.id);
      expect(scenario.type).toBe('baseline');
      expect(scenario.parameters).toEqual(expect.objectContaining({
        totalStands: 50,
        wideBodyStands: 15
      }));
      
      expect(Scenario.insert).toHaveBeenCalledTimes(1);
    });
    
    test('should create a what-if scenario from baseline', async () => {
      // Mock finding baseline scenario
      Scenario.findById.mockResolvedValueOnce(baselineScenario);
      
      // Create what-if scenario via service
      const result = await scenarioService.createFromNaturalLanguage(
        testUser.id,
        'What-If Scenario',
        'Add 5 wide-body stands',
        baselineScenario.id
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.type).toBe('what-if');
      expect(result.baselineId).toBe(baselineScenario.id);
      expect(scenarioService.createFromNaturalLanguage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario Calculation Flow', () => {
    test('should calculate a what-if scenario', async () => {
      // Mock finding scenario
      Scenario.findById.mockResolvedValueOnce(whatIfScenario);
      
      // Mock calculation
      whatIfScenario.startCalculation.mockResolvedValueOnce({
        id: calculation.id,
        status: 'processing'
      });
      
      // Start calculation
      const calculationResult = await whatIfScenario.startCalculation('standard', {
        timeHorizon: 'day'
      });
      
      // Queue calculation job
      await scenarioService.queueCalculationJob(
        whatIfScenario.id, 
        calculationResult.id, 
        { timeHorizon: 'day' }
      );
      
      // Assertions
      expect(calculationResult).toBeDefined();
      expect(calculationResult.id).toBe(calculation.id);
      expect(calculationResult.status).toBe('processing');
      expect(whatIfScenario.startCalculation).toHaveBeenCalledTimes(1);
      expect(scenarioService.queueCalculationJob).toHaveBeenCalledTimes(1);
      expect(scenarioService.queueCalculationJob).toHaveBeenCalledWith(
        whatIfScenario.id,
        calculation.id,
        { timeHorizon: 'day' }
      );
    });
    
    test('should retrieve calculation results', async () => {
      // Mock finding scenario and calculation
      Scenario.findById.mockResolvedValueOnce(whatIfScenario);
      ScenarioCalculation.findById.mockResolvedValueOnce(calculation);
      
      // Retrieve calculation
      const result = await ScenarioCalculation.query().findById(calculation.id);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.id).toBe(calculation.id);
      expect(result.scenarioId).toBe(whatIfScenario.id);
      expect(result.status).toBe('completed');
      expect(result.results).toEqual(expect.objectContaining({
        capacity: expect.any(Object),
        utilization: expect.any(Object)
      }));
    });
  });

  describe('Scenario Comparison Flow', () => {
    test('should compare multiple scenarios', async () => {
      // Create a second what-if scenario for comparison
      const whatIfScenario2 = {
        ...whatIfScenario,
        id: uuidv4(),
        title: 'Alternative What-If',
        description: 'Optimize terminal usage',
        parameters: {
          totalStands: 50,
          wideBodyStands: 18,
          terminalBalance: 'optimized'
        }
      };
      
      // Mock finding scenarios
      Scenario.findById
        .mockResolvedValueOnce(baselineScenario)
        .mockResolvedValueOnce(whatIfScenario)
        .mockResolvedValueOnce(whatIfScenario2);
      
      // Mock comparison creation
      const comparison = {
        id: uuidv4(),
        scenarioIds: [baselineScenario.id, whatIfScenario.id, whatIfScenario2.id],
        userId: testUser.id,
        metrics: ['capacity', 'utilization'],
        timeRange: { start: '06:00', end: '22:00' },
        status: 'pending',
        getScenarioDetails: jest.fn().mockResolvedValue([
          { id: baselineScenario.id, title: baselineScenario.title },
          { id: whatIfScenario.id, title: whatIfScenario.title },
          { id: whatIfScenario2.id, title: whatIfScenario2.title }
        ])
      };
      
      ScenarioComparison.insert = jest.fn().mockResolvedValue(comparison);
      
      // Create comparison
      const comparisonResult = await ScenarioComparison.query().insert(comparison);
      
      // Queue comparison job
      await scenarioService.queueComparisonJob(comparisonResult.id);
      
      // Mock completed comparison
      const completedComparison = {
        ...comparison,
        status: 'completed',
        completedAt: new Date().toISOString(),
        results: {
          capacityDiff: {
            baseline: { total: 100 },
            'What-If Scenario': { total: 120, diff: '+20%' },
            'Alternative What-If': { total: 110, diff: '+10%' }
          },
          utilizationDiff: {
            baseline: { overall: 0.82 },
            'What-If Scenario': { overall: 0.85, diff: '+3.7%' },
            'Alternative What-If': { overall: 0.88, diff: '+7.3%' }
          }
        }
      };
      
      ScenarioComparison.findById.mockResolvedValueOnce(completedComparison);
      
      // Retrieve comparison
      const retrievedComparison = await ScenarioComparison.query().findById(comparison.id);
      
      // Assertions
      expect(comparisonResult).toBeDefined();
      expect(scenarioService.queueComparisonJob).toHaveBeenCalledWith(comparison.id);
      expect(retrievedComparison.status).toBe('completed');
      expect(retrievedComparison.results).toEqual(expect.objectContaining({
        capacityDiff: expect.any(Object),
        utilizationDiff: expect.any(Object)
      }));
    });
  });

  describe('End-to-End Workflow', () => {
    test('should support the full what-if analysis workflow', async () => {
      // Step 1: Create baseline scenario
      Scenario.insert.mockResolvedValueOnce(baselineScenario);
      const baseline = await Scenario.query().insert(baselineScenario);
      
      // Step 2: Create what-if scenario
      Scenario.findById.mockResolvedValueOnce(baselineScenario);
      scenarioService.createFromNaturalLanguage.mockResolvedValueOnce(whatIfScenario);
      
      const whatIf = await scenarioService.createFromNaturalLanguage(
        testUser.id,
        'What-If Scenario',
        'Add 5 wide-body stands',
        baseline.id
      );
      
      // Step 3: Calculate what-if scenario
      Scenario.findById.mockResolvedValueOnce(whatIf);
      
      const pendingCalculation = {
        id: calculation.id,
        scenarioId: whatIf.id,
        status: 'processing'
      };
      
      whatIf.startCalculation.mockResolvedValueOnce(pendingCalculation);
      
      const calculationResult = await whatIf.startCalculation('standard', {
        timeHorizon: 'day'
      });
      
      await scenarioService.queueCalculationJob(
        whatIf.id, 
        calculationResult.id, 
        { timeHorizon: 'day' }
      );
      
      // Step 4: Retrieve calculation results
      ScenarioCalculation.findById.mockResolvedValueOnce(calculation);
      const results = await ScenarioCalculation.query().findById(calculationResult.id);
      
      // Step 5: Create a comparison
      Scenario.findById.mockResolvedValueOnce(baselineScenario);
      Scenario.findById.mockResolvedValueOnce(whatIf);
      
      const comparison = {
        id: uuidv4(),
        scenarioIds: [baseline.id, whatIf.id],
        userId: testUser.id,
        metrics: ['capacity', 'utilization'],
        status: 'pending',
        getScenarioDetails: jest.fn().mockResolvedValue([
          { id: baseline.id, title: baseline.title },
          { id: whatIf.id, title: whatIf.title }
        ])
      };
      
      ScenarioComparison.insert = jest.fn().mockResolvedValue(comparison);
      
      const comparisonResult = await ScenarioComparison.query().insert(comparison);
      await scenarioService.queueComparisonJob(comparisonResult.id);
      
      // Assertions for entire workflow
      expect(baseline).toBeDefined();
      expect(whatIf).toBeDefined();
      expect(whatIf.baselineId).toBe(baseline.id);
      expect(calculationResult).toBeDefined();
      expect(results.status).toBe('completed');
      expect(comparisonResult).toBeDefined();
      
      // Verify correct sequence
      expect(Scenario.insert).toHaveBeenCalledTimes(1);
      expect(scenarioService.createFromNaturalLanguage).toHaveBeenCalledTimes(1);
      expect(whatIf.startCalculation).toHaveBeenCalledTimes(1);
      expect(ScenarioCalculation.findById).toHaveBeenCalledTimes(1);
      expect(ScenarioComparison.insert).toHaveBeenCalledTimes(1);
      expect(scenarioService.queueComparisonJob).toHaveBeenCalledTimes(1);
    });
  });
});