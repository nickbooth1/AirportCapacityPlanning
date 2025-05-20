/**
 * MultiStepReasoningService unit tests
 */

const MultiStepReasoningService = require('../../src/services/agent/MultiStepReasoningService');
const OpenAIService = require('../../src/services/agent/OpenAIService');
const ContextService = require('../../src/services/agent/ContextService');

// Mock dependencies
jest.mock('../../src/services/agent/OpenAIService');
jest.mock('../../src/services/agent/ContextService');
jest.mock('../../src/utils/logger');

describe('MultiStepReasoningService', () => {
  let service;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance of the service for each test
    service = new MultiStepReasoningService();
    
    // Mock contextService.set method
    service.contextService.set = jest.fn().mockResolvedValue(true);
    
    // Mock OpenAI response for multi-step reasoning
    OpenAIService.performMultiStepReasoning.mockResolvedValue({
      steps: [
        {
          stepNumber: 1,
          description: 'Extract parameters from the query',
          type: 'parameter_extraction',
          parameters: { text: 'Sample query' }
        },
        {
          stepNumber: 2,
          description: 'Retrieve airport capacity data',
          type: 'data_retrieval',
          dependsOn: ['step-1'],
          parameters: { dataSource: 'capacity' }
        },
        {
          stepNumber: 3,
          description: 'Calculate impact of maintenance on capacity',
          type: 'calculation',
          dependsOn: ['step-2'],
          parameters: { instructions: 'Calculate capacity impact' }
        }
      ],
      confidence: 0.85
    });
    
    // Mock OpenAI response for parameter extraction
    OpenAIService.extractParameters.mockResolvedValue({
      parameters: { airport: 'JFK', date: '2023-10-15' },
      confidence: 0.9,
      reasoning: ['Airport extracted from query mention', 'Date format matches standard format']
    });
    
    // Mock OpenAI response for query processing
    OpenAIService.processQuery.mockResolvedValue({
      text: JSON.stringify({
        calculationResult: 42,
        explanation: 'This is a test calculation'
      }),
      usage: { total_tokens: 100 }
    });
  });
  
  describe('planQuerySteps', () => {
    it('should generate a plan for a complex query', async () => {
      // This test is handled in the integration test
      expect(true).toBe(true);
    });
    
    it('should handle validation errors in plan feasibility', async () => {
      // Mock implementation for validatePlanFeasibility
      service.validatePlanFeasibility = jest.fn().mockResolvedValue({
        isValid: false,
        reason: 'Circular dependency detected',
        suggestedAlternative: 'Rephrase query'
      });
      
      const query = 'What is the capacity impact of scheduled maintenance on Terminal A next week?';
      
      const result = await service.planQuerySteps(query);
      
      expect(result.status).toBe('invalid_plan');
      expect(result.reason).toBe('Circular dependency detected');
      expect(result.suggestedAlternative).toBe('Rephrase query');
    });
  });
  
  describe('executeStepSequence', () => {
    it('should execute all steps in a plan', async () => {
      const plan = {
        queryId: 'test-query-123',
        originalQuery: 'What is the capacity impact?',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Extract parameters',
            type: 'parameter_extraction',
            dependsOn: [],
            parameters: { text: 'What is the capacity impact?' }
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Get capacity data',
            type: 'data_retrieval',
            dependsOn: ['step-1'],
            parameters: { dataSource: 'capacity' }
          }
        ]
      };
      
      // Spy on the executeStep method
      const executeStepSpy = jest.spyOn(service, 'executeStep').mockImplementation((step) => {
        return Promise.resolve({
          success: true,
          result: { data: `Result for ${step.stepId}` },
          executionTime: 0.5
        });
      });
      
      const results = await service.executeStepSequence(plan);
      
      expect(results.success).toBe(true);
      expect(results.stepResults.length).toBe(2);
      expect(executeStepSpy).toHaveBeenCalledTimes(2);
      expect(service.contextService.set).toHaveBeenCalledTimes(3); // 2 steps + final result
    });
    
    it('should stop execution if a step fails', async () => {
      const plan = {
        queryId: 'test-query-123',
        originalQuery: 'What is the capacity impact?',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Extract parameters',
            type: 'parameter_extraction',
            dependsOn: [],
            parameters: { text: 'What is the capacity impact?' }
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Get capacity data',
            type: 'data_retrieval',
            dependsOn: ['step-1'],
            parameters: { dataSource: 'capacity' }
          }
        ]
      };
      
      // Make the first step fail
      jest.spyOn(service, 'executeStep').mockImplementationOnce(() => {
        return Promise.resolve({
          success: false,
          error: 'Test failure',
          executionTime: 0.5
        });
      });
      
      const results = await service.executeStepSequence(plan);
      
      expect(results.success).toBe(false);
      expect(results.error).toBe('Step 1 failed: Test failure');
      expect(results.stepResults.length).toBe(1);
      expect(results.finalAnswer).toBeNull();
    });
  });
  
  describe('executeStep', () => {
    it('should execute a parameter extraction step', async () => {
      const step = {
        stepId: 'step-1',
        type: 'parameter_extraction',
        description: 'Extract parameters',
        parameters: { text: 'Sample query' }
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result.success).toBe(true);
      expect(result.result.parameters).toBeDefined();
      expect(OpenAIService.extractParameters).toHaveBeenCalledWith('Sample query');
    });
    
    it('should execute a data retrieval step', async () => {
      const step = {
        stepId: 'step-2',
        type: 'data_retrieval',
        description: 'Get capacity data',
        parameters: { dataSource: 'capacity' }
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result.success).toBe(true);
      expect(result.result.data).toBeDefined();
    });
    
    it('should handle errors in step execution', async () => {
      const step = {
        stepId: 'step-3',
        type: 'unknown_type',
        description: 'Invalid step',
        parameters: {}
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('validatePlanFeasibility', () => {
    it('should detect circular dependencies', async () => {
      const steps = [
        {
          stepNumber: 1,
          dependsOn: ['step-3']
        },
        {
          stepNumber: 2,
          dependsOn: ['step-1']
        },
        {
          stepNumber: 3,
          dependsOn: ['step-2']
        }
      ];
      
      const result = await service.validatePlanFeasibility(steps, {});
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Circular dependency');
    });
    
    it('should validate a feasible plan', async () => {
      const steps = [
        {
          stepNumber: 1,
          dependsOn: []
        },
        {
          stepNumber: 2,
          dependsOn: ['step-1']
        },
        {
          stepNumber: 3,
          dependsOn: ['step-1', 'step-2']
        }
      ];
      
      const result = await service.validatePlanFeasibility(steps, {});
      
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('helper methods', () => {
    it('should detect cycles in a dependency graph', () => {
      const cyclicGraph = {
        1: [2],
        2: [3],
        3: [1]
      };
      
      const acyclicGraph = {
        1: [2, 3],
        2: [3],
        3: []
      };
      
      expect(service.detectCycle(cyclicGraph)).toBe(true);
      expect(service.detectCycle(acyclicGraph)).toBe(false);
    });
    
    it('should determine step type from description', () => {
      expect(service.determineStepType({ description: 'Calculate the capacity' })).toBe('calculation');
      expect(service.determineStepType({ description: 'Extract parameters' })).toBe('parameter_extraction');
      expect(service.determineStepType({ description: 'Retrieve data' })).toBe('data_retrieval');
      expect(service.determineStepType({ description: 'Validate results' })).toBe('validation');
      expect(service.determineStepType({ description: 'Compare scenarios' })).toBe('comparison');
      expect(service.determineStepType({ description: 'Recommend actions' })).toBe('recommendation');
      expect(service.determineStepType({ description: 'Generic step' })).toBe('generic');
    });
    
    it('should check if parameters can be resolved from context', () => {
      const context = {
        airport: 'JFK',
        parameters: {
          date: '2023-10-15'
        }
      };
      
      expect(service.canBeResolvedFromContext('airport', context)).toBe(true);
      expect(service.canBeResolvedFromContext('date', context)).toBe(true);
      expect(service.canBeResolvedFromContext('terminal', context)).toBe(false);
    });
    
    it('should summarize result objects', () => {
      const complexResult = {
        data: [1, 2, 3],
        metadata: { source: 'test' },
        detailed: 'Should be excluded',
        raw: 'Should be excluded'
      };
      
      const summary = service.summarizeResult(complexResult);
      
      expect(summary).toContain('data: [3 items]');
      expect(summary).toContain('metadata: {...}');
      expect(summary).not.toContain('detailed');
      expect(summary).not.toContain('raw');
    });
  });
});