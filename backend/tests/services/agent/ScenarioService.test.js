const ScenarioService = require('../../../src/services/agent/ScenarioService');
const Scenario = require('../../../src/models/agent/Scenario');
const ScenarioCalculation = require('../../../src/models/agent/ScenarioCalculation');
const ScenarioComparison = require('../../../src/models/agent/ScenarioComparison');
const nlpService = require('../../../src/services/agent/NLPService');
const standCapacityService = require('../../../src/services/standCapacityService');
const logger = require('../../../src/utils/logger');

// Mock the imports
jest.mock('../../../src/models/agent/Scenario');
jest.mock('../../../src/models/agent/ScenarioCalculation');
jest.mock('../../../src/models/agent/ScenarioComparison');
jest.mock('../../../src/services/agent/NLPService');
jest.mock('../../../src/services/standCapacityService');
jest.mock('../../../src/utils/logger');

// Mock uuid generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

describe('ScenarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createFromNaturalLanguage', () => {
    it('should create a scenario from natural language description', async () => {
      // Mock NLP service parameter extraction
      nlpService.extractParametersFromDescription.mockResolvedValue({
        terminal: 'Terminal 2',
        standType: 'wide_body',
        count: 3
      });
      
      // Mock Scenario.query().insert()
      Scenario.query.mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({
          id: 'mock-uuid',
          userId: 'test-user',
          title: 'Test Scenario',
          description: 'What if we add 3 more wide-body stands at Terminal 2?',
          parameters: {
            terminal: 'Terminal 2',
            standType: 'wide_body',
            count: 3
          },
          type: 'what-if',
          status: 'created'
        })
      }));
      
      const userId = 'test-user';
      const title = 'Test Scenario';
      const description = 'What if we add 3 more wide-body stands at Terminal 2?';
      
      const result = await ScenarioService.createFromNaturalLanguage(userId, title, description);
      
      // Check that NLP service was called
      expect(nlpService.extractParametersFromDescription).toHaveBeenCalledWith(description);
      
      // Verify scenario creation
      expect(Scenario.query).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'mock-uuid');
      expect(result).toHaveProperty('title', title);
      expect(result).toHaveProperty('parameters.terminal', 'Terminal 2');
      expect(result).toHaveProperty('parameters.standType', 'wide_body');
      expect(result).toHaveProperty('parameters.count', 3);
    });
    
    it('should handle errors during parameter extraction', async () => {
      // Mock NLP service error
      nlpService.extractParametersFromDescription.mockRejectedValue(new Error('NLP Error'));
      
      // Mock Scenario.query().insert() to ensure it's still called with empty parameters
      Scenario.query.mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({
          id: 'mock-uuid',
          userId: 'test-user',
          title: 'Error Scenario',
          description: 'Problematic description',
          parameters: {},
          type: 'what-if',
          status: 'created'
        })
      }));
      
      const userId = 'test-user';
      const title = 'Error Scenario';
      const description = 'Problematic description';
      
      // Should not throw but log the error and create with empty parameters
      const result = await ScenarioService.createFromNaturalLanguage(userId, title, description);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Parameter extraction error'));
      
      // Verify scenario was still created with empty parameters
      expect(Scenario.query).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'mock-uuid');
      expect(result).toHaveProperty('parameters', {});
    });
  });
  
  describe('validateAndNormalizeParameters', () => {
    it('should convert numeric strings to numbers', () => {
      const rawParameters = {
        count: '3',
        utilization: '0.85',
        isActive: 'true'
      };
      
      const result = ScenarioService.validateAndNormalizeParameters(rawParameters);
      
      expect(result.count).toBe(3);
      expect(result.utilization).toBe(0.85);
      expect(result.isActive).toBe(true);
    });
    
    it('should handle mixed parameter types', () => {
      const rawParameters = {
        terminal: 'Terminal 2',
        count: '5',
        types: ['narrow_body', 'wide_body'],
        isOptimized: 'false'
      };
      
      const result = ScenarioService.validateAndNormalizeParameters(rawParameters);
      
      expect(result.terminal).toBe('Terminal 2');
      expect(result.count).toBe(5);
      expect(result.types).toEqual(['narrow_body', 'wide_body']);
      expect(result.isOptimized).toBe(false);
    });
  });
  
  describe('determineScenarioType', () => {
    it('should identify what-if scenarios', () => {
      const description = 'What if we add 3 more stands?';
      const parameters = { terminal: 'T1', count: 3 };
      const baselineId = null;
      
      const result = ScenarioService.determineScenarioType(description, parameters, baselineId);
      
      expect(result).toBe('what-if');
    });
    
    it('should identify forecast scenarios', () => {
      const description = 'Forecast capacity for the next 5 years with 3% growth';
      const parameters = { years: 5, growthRate: 0.03 };
      const baselineId = null;
      
      const result = ScenarioService.determineScenarioType(description, parameters, baselineId);
      
      expect(result).toBe('forecast');
    });
    
    it('should identify optimization scenarios', () => {
      const description = 'Optimize stand allocation to maximize efficiency';
      const parameters = { targetUtilization: 0.85 };
      const baselineId = null;
      
      const result = ScenarioService.determineScenarioType(description, parameters, baselineId);
      
      expect(result).toBe('optimization');
    });
    
    it('should use what-if for scenarios with a baseline', () => {
      const description = 'Some random description';
      const parameters = {};
      const baselineId = 'some-baseline-id';
      
      const result = ScenarioService.determineScenarioType(description, parameters, baselineId);
      
      expect(result).toBe('what-if');
    });
    
    it('should use manual for scenarios with no parameters and no keywords', () => {
      const description = 'Just a simple scenario';
      const parameters = {};
      const baselineId = null;
      
      const result = ScenarioService.determineScenarioType(description, parameters, baselineId);
      
      expect(result).toBe('manual');
    });
  });
  
  describe('queueCalculationJob', () => {
    it('should process a calculation job successfully', async () => {
      // Mock Scenario.query().findById()
      Scenario.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-id',
          parameters: { terminal: 'T1', standCount: 3 },
          type: 'what-if'
        })
      }));
      
      // Mock ScenarioCalculation.query().findById()
      ScenarioCalculation.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'calculation-id',
          scenarioId: 'scenario-id',
          startProcessing: jest.fn().mockResolvedValue({}),
          complete: jest.fn().mockResolvedValue({})
        })
      }));
      
      // Mock performCalculation
      jest.spyOn(ScenarioService, 'performCalculation').mockResolvedValue({
        capacity: { total: 200 },
        utilizationMetrics: { overallUtilization: 0.8 }
      });
      
      await ScenarioService.queueCalculationJob('scenario-id', 'calculation-id');
      
      // Verify scenario and calculation were retrieved
      expect(Scenario.query().findById).toHaveBeenCalledWith('scenario-id');
      expect(ScenarioCalculation.query().findById).toHaveBeenCalledWith('calculation-id');
      
      // Verify calculation was started
      expect(ScenarioCalculation.query().findById().startProcessing).toHaveBeenCalled();
      
      // Verify calculation was performed
      expect(ScenarioService.performCalculation).toHaveBeenCalled();
      
      // Verify calculation was completed
      expect(ScenarioCalculation.query().findById().complete).toHaveBeenCalled();
    });
    
    it('should handle calculation errors', async () => {
      // Mock Scenario.query().findById()
      Scenario.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'scenario-id',
          parameters: { terminal: 'T1', standCount: 3 },
          type: 'what-if'
        })
      }));
      
      // Mock ScenarioCalculation.query().findById()
      ScenarioCalculation.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'calculation-id',
          scenarioId: 'scenario-id',
          startProcessing: jest.fn().mockResolvedValue({}),
          fail: jest.fn().mockResolvedValue({})
        })
      }));
      
      // Mock performCalculation to throw error
      jest.spyOn(ScenarioService, 'performCalculation').mockRejectedValue(
        new Error('Calculation failed')
      );
      
      await ScenarioService.queueCalculationJob('scenario-id', 'calculation-id');
      
      // Verify calculation was started
      expect(ScenarioCalculation.query().findById().startProcessing).toHaveBeenCalled();
      
      // Verify calculation error was handled
      expect(ScenarioCalculation.query().findById().fail).toHaveBeenCalledWith(
        'Calculation failed'
      );
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Calculation failed for scenario')
      );
    });
  });
  
  describe('performCalculation', () => {
    beforeEach(() => {
      // Mock standCapacityService methods
      standCapacityService.calculateCapacity.mockResolvedValue({
        narrowBodyCapacity: 100,
        wideBodyCapacity: 50,
        totalCapacity: 150,
        utilizationMetrics: {
          overallUtilization: 0.75,
          peakUtilization: 0.9,
          offPeakUtilization: 0.6
        },
        hourlyCapacity: [
          { hour: 6, narrowBodyCapacity: 10, wideBodyCapacity: 5, totalCapacity: 15, utilization: 0.7 },
          { hour: 7, narrowBodyCapacity: 12, wideBodyCapacity: 6, totalCapacity: 18, utilization: 0.8 }
        ]
      });
    });
    
    it('should calculate a what-if scenario', async () => {
      // Mock getDefaultBaseline
      jest.spyOn(ScenarioService, 'getDefaultBaseline').mockResolvedValue({
        terminals: [{ id: 'T1', name: 'Terminal 1' }],
        stands: [{ id: 'S1', terminalId: 'T1', type: 'narrow_body' }],
        aircraftTypes: [{ id: 'A320', category: 'narrow_body' }],
        operationalSettings: { bufferTime: 15 },
        capacity: {
          narrowBodyCapacity: 80,
          wideBodyCapacity: 40,
          totalCapacity: 120
        }
      });
      
      // Mock applyParametersToBaseline
      jest.spyOn(ScenarioService, 'applyParametersToBaseline').mockReturnValue({
        terminals: [{ id: 'T1', name: 'Terminal 1' }],
        stands: [
          { id: 'S1', terminalId: 'T1', type: 'narrow_body' },
          { id: 'T1-1', terminalId: 'T1', type: 'wide_body' },
          { id: 'T1-2', terminalId: 'T1', type: 'wide_body' },
          { id: 'T1-3', terminalId: 'T1', type: 'wide_body' }
        ],
        aircraftTypes: [{ id: 'A320', category: 'narrow_body' }],
        operationalSettings: { bufferTime: 15 }
      });
      
      const scenario = {
        type: 'what-if',
        parameters: {
          terminal: 'Terminal 1',
          standType: 'wide_body',
          count: 3
        },
        baselineId: null
      };
      
      const options = { timeHorizon: 'day' };
      
      const result = await ScenarioService.performCalculation(scenario, options);
      
      // Verify baseline was fetched
      expect(ScenarioService.getDefaultBaseline).toHaveBeenCalled();
      
      // Verify parameters were applied to baseline
      expect(ScenarioService.applyParametersToBaseline).toHaveBeenCalledWith(
        expect.anything(),
        scenario.parameters
      );
      
      // Verify capacity was calculated
      expect(standCapacityService.calculateCapacity).toHaveBeenCalled();
      
      // Verify result structure
      expect(result).toHaveProperty('capacity');
      expect(result).toHaveProperty('baseline.capacity');
      expect(result).toHaveProperty('comparison.capacityDelta');
      expect(result).toHaveProperty('capacityByHour');
      expect(result).toHaveProperty('utilizationMetrics');
      expect(result).toHaveProperty('impactSummary');
      
      // Check capacity delta calculation
      expect(result.comparison.capacityDelta).toEqual({
        narrowBody: 20,  // 100 - 80
        wideBody: 10,    // 50 - 40
        total: 30        // 150 - 120
      });
    });
    
    it('should calculate a forecast scenario', async () => {
      // Mock getDefaultBaseline
      jest.spyOn(ScenarioService, 'getDefaultBaseline').mockResolvedValue({
        terminals: [{ id: 'T1', name: 'Terminal 1' }],
        stands: [{ id: 'S1', terminalId: 'T1', type: 'narrow_body' }],
        aircraftTypes: [{ id: 'A320', category: 'narrow_body' }],
        operationalSettings: { bufferTime: 15 },
        capacity: {
          narrowBodyCapacity: 80,
          wideBodyCapacity: 40,
          totalCapacity: 120
        }
      });
      
      // Mock applyGrowthToBaseline
      jest.spyOn(ScenarioService, 'applyGrowthToBaseline').mockReturnValue({
        terminals: [{ id: 'T1', name: 'Terminal 1' }],
        stands: [
          { id: 'S1', terminalId: 'T1', type: 'narrow_body' },
          { id: 'T1-1', terminalId: 'T1', type: 'narrow_body' }
        ],
        aircraftTypes: [{ id: 'A320', category: 'narrow_body' }],
        operationalSettings: { bufferTime: 15, peakDemandFactor: 1.15 }
      });
      
      const scenario = {
        type: 'forecast',
        parameters: {
          annualGrowthRate: 0.03,
          forecastYears: [1, 5],
          addStands: true
        }
      };
      
      const options = { timeHorizon: 'day' };
      
      const result = await ScenarioService.calculateForecastScenario(scenario.parameters, options);
      
      // Verify baseline was fetched
      expect(ScenarioService.getDefaultBaseline).toHaveBeenCalled();
      
      // Verify growth was applied
      expect(ScenarioService.applyGrowthToBaseline).toHaveBeenCalled();
      
      // Verify capacity was calculated
      expect(standCapacityService.calculateCapacity).toHaveBeenCalled();
      
      // Verify forecast structure
      expect(result).toHaveProperty('baseline');
      expect(result).toHaveProperty('forecasts');
      expect(result.forecasts).toHaveLength(2); // For years 1 and 5
      expect(result).toHaveProperty('growthParameters');
      expect(result).toHaveProperty('forecastSummary');
    });
  });
  
  describe('queueComparisonJob', () => {
    it('should process a comparison job successfully', async () => {
      // Mock ScenarioComparison.query().findById()
      ScenarioComparison.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'comparison-id',
          scenarioIds: ['scenario-1', 'scenario-2'],
          startProcessing: jest.fn().mockResolvedValue({}),
          complete: jest.fn().mockResolvedValue({})
        })
      }));
      
      // Mock performComparison
      jest.spyOn(ScenarioService, 'performComparison').mockResolvedValue({
        metrics: ['capacity', 'utilization'],
        results: { capacity: {}, utilization: {} },
        visualizations: []
      });
      
      await ScenarioService.queueComparisonJob('comparison-id');
      
      // Verify comparison was retrieved
      expect(ScenarioComparison.query().findById).toHaveBeenCalledWith('comparison-id');
      
      // Verify comparison was started
      expect(ScenarioComparison.query().findById().startProcessing).toHaveBeenCalled();
      
      // Verify comparison was performed
      expect(ScenarioService.performComparison).toHaveBeenCalled();
      
      // Verify comparison was completed
      expect(ScenarioComparison.query().findById().complete).toHaveBeenCalled();
    });
    
    it('should handle comparison errors', async () => {
      // Mock ScenarioComparison.query().findById()
      ScenarioComparison.query.mockImplementation(() => ({
        findById: jest.fn().mockResolvedValue({
          id: 'comparison-id',
          scenarioIds: ['scenario-1', 'scenario-2'],
          startProcessing: jest.fn().mockResolvedValue({}),
          fail: jest.fn().mockResolvedValue({})
        })
      }));
      
      // Mock performComparison to throw error
      jest.spyOn(ScenarioService, 'performComparison').mockRejectedValue(
        new Error('Comparison failed')
      );
      
      await ScenarioService.queueComparisonJob('comparison-id');
      
      // Verify comparison was started
      expect(ScenarioComparison.query().findById().startProcessing).toHaveBeenCalled();
      
      // Verify comparison error was handled
      expect(ScenarioComparison.query().findById().fail).toHaveBeenCalledWith(
        'Comparison failed'
      );
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Comparison failed for comparison')
      );
    });
  });
  
  describe('utility functions', () => {
    describe('calculateCapacityDelta', () => {
      it('should calculate differences between two capacity results', () => {
        const baseline = {
          narrowBodyCapacity: 80,
          wideBodyCapacity: 40,
          totalCapacity: 120
        };
        
        const scenario = {
          narrowBodyCapacity: 100,
          wideBodyCapacity: 50,
          totalCapacity: 150
        };
        
        const result = ScenarioService.calculateCapacityDelta(baseline, scenario);
        
        expect(result).toEqual({
          narrowBody: 20,
          wideBody: 10,
          total: 30
        });
      });
      
      it('should handle missing or zero values', () => {
        const baseline = {
          narrowBodyCapacity: 0,
          totalCapacity: 50
        };
        
        const scenario = {
          narrowBodyCapacity: 20,
          wideBodyCapacity: 40,
          totalCapacity: 60
        };
        
        const result = ScenarioService.calculateCapacityDelta(baseline, scenario);
        
        expect(result).toEqual({
          narrowBody: 20,
          wideBody: 40,  // baseline had no wideBodyCapacity
          total: 10
        });
      });
    });
    
    describe('generateImpactSummary', () => {
      it('should generate summary text for positive impact', () => {
        const capacityDelta = {
          narrowBody: 10,
          wideBody: 5,
          total: 15
        };
        
        const parameters = { terminal: 'T1', standCount: 3 };
        
        const summary = ScenarioService.generateImpactSummary(capacityDelta, parameters);
        
        expect(summary).toContain('Increases total capacity by 15 aircraft per day');
        expect(summary).toContain('Increases narrow-body capacity by 10 aircraft per day');
        expect(summary).toContain('Increases wide-body capacity by 5 aircraft per day');
      });
      
      it('should generate summary text for negative impact', () => {
        const capacityDelta = {
          narrowBody: -5,
          wideBody: 0,
          total: -5
        };
        
        const parameters = { terminal: 'T1', standCount: -2 };
        
        const summary = ScenarioService.generateImpactSummary(capacityDelta, parameters);
        
        expect(summary).toContain('Decreases total capacity by 5 aircraft per day');
        expect(summary).toContain('Decreases narrow-body capacity by 5 aircraft per day');
        expect(summary).not.toContain('wide-body capacity'); // No change to wide-body
      });
      
      it('should handle no change in capacity', () => {
        const capacityDelta = {
          narrowBody: 5,
          wideBody: -5,
          total: 0
        };
        
        const parameters = { operationalSettings: { bufferTime: 10 } };
        
        const summary = ScenarioService.generateImpactSummary(capacityDelta, parameters);
        
        expect(summary).toContain('No change in total capacity');
        expect(summary).toContain('Increases narrow-body capacity by 5 aircraft per day');
        expect(summary).toContain('Decreases wide-body capacity by 5 aircraft per day');
      });
    });
  });
});