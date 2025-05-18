/**
 * Tests for MultiStepReasoningService
 */

const MultiStepReasoningService = require('../../../src/services/agent/MultiStepReasoningService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const ContextService = require('../../../src/services/agent/ContextService');

// Mock the dependencies
jest.mock('../../../src/services/agent/OpenAIService');
jest.mock('../../../src/services/agent/ContextService');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('MultiStepReasoningService', () => {
  let service;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create new instance for each test
    service = new MultiStepReasoningService();
    
    // Mock OpenAI responses
    OpenAIService.performMultiStepReasoning.mockResolvedValue({
      steps: [
        {
          stepNumber: 1,
          description: 'Analyze current capacity',
          type: 'data_retrieval',
          parameters: { dataSource: 'capacity' }
        },
        {
          stepNumber: 2,
          description: 'Calculate impact of additional stands',
          type: 'calculation',
          dependsOn: ['step-1'],
          parameters: { 
            dataSource: 'previous_step',
            stepId: 'step-1',
            instructions: 'Calculate the capacity increase'
          }
        }
      ],
      confidence: 0.85
    });
    
    OpenAIService.processQuery.mockImplementation((prompt) => {
      if (prompt.includes('calculation')) {
        return Promise.resolve({ text: JSON.stringify({ calculationResult: 42, explanation: 'Sample explanation' }) });
      } else if (prompt.includes('synthesis')) {
        return Promise.resolve({ text: 'The final answer is that capacity would increase by 10%.' });
      }
      return Promise.resolve({ text: 'Default response' });
    });
    
    OpenAIService.extractParameters.mockResolvedValue({
      parameters: {
        terminal: 'Terminal 1',
        standCount: 5
      },
      confidence: 0.9,
      reasoning: ['Terminal 1 is explicitly mentioned']
    });
  });

  describe('planQuerySteps', () => {
    it('should generate a valid reasoning plan', async () => {
      const query = 'What would happen if we added 5 more stands to Terminal 1?';
      const context = { currentCapacity: 50 };
      
      const plan = await service.planQuerySteps(query, context);
      
      expect(plan).toHaveProperty('queryId');
      expect(plan).toHaveProperty('originalQuery', query);
      expect(plan).toHaveProperty('steps');
      expect(plan.steps).toHaveLength(2);
      expect(plan).toHaveProperty('confidence', 0.85);
      expect(plan.steps[0]).toHaveProperty('stepId', 'step-1');
      expect(plan.steps[1]).toHaveProperty('stepId', 'step-2');
      expect(plan.steps[1]).toHaveProperty('dependsOn', ['step-1']);
      
      // Verify OpenAI service was called
      expect(OpenAIService.performMultiStepReasoning).toHaveBeenCalledWith(query, context);
      
      // Verify context service was used to store the plan
      expect(service.contextService.set).toHaveBeenCalled();
    });
    
    it('should handle errors during plan generation', async () => {
      // Mock an error
      OpenAIService.performMultiStepReasoning.mockRejectedValue(new Error('Service unavailable'));
      
      const query = 'What would happen if we added 5 more stands to Terminal 1?';
      
      await expect(service.planQuerySteps(query)).rejects.toThrow('Failed to plan query steps');
    });
    
    it('should detect and reject plans with circular dependencies', async () => {
      // Mock a plan with circular dependencies
      OpenAIService.performMultiStepReasoning.mockResolvedValue({
        steps: [
          {
            stepNumber: 1,
            description: 'Step 1',
            dependsOn: ['step-2']
          },
          {
            stepNumber: 2,
            description: 'Step 2',
            dependsOn: ['step-1']
          }
        ]
      });
      
      const query = 'Query with circular dependencies';
      const result = await service.planQuerySteps(query);
      
      expect(result).toHaveProperty('status', 'invalid_plan');
      expect(result).toHaveProperty('reason', 'Circular dependency detected in plan');
    });
  });

  describe('executeStepSequence', () => {
    it('should execute all steps in a plan successfully', async () => {
      const plan = {
        queryId: 'test-query-1',
        originalQuery: 'What would happen if we added 5 more stands?',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Retrieve capacity data',
            type: 'data_retrieval',
            dependsOn: [],
            parameters: { dataSource: 'capacity' }
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Calculate impact',
            type: 'calculation',
            dependsOn: ['step-1'],
            parameters: {
              dataSource: 'previous_step',
              stepId: 'step-1'
            }
          }
        ]
      };
      
      const results = await service.executeStepSequence(plan);
      
      expect(results).toHaveProperty('success', true);
      expect(results).toHaveProperty('stepResults');
      expect(results.stepResults).toHaveLength(2);
      expect(results).toHaveProperty('finalAnswer');
      
      // Check that step 2 was executed after step 1
      expect(results.stepResults[0].stepId).toBe('step-1');
      expect(results.stepResults[1].stepId).toBe('step-2');
      
      // Verify context service was used to store results
      expect(service.contextService.set).toHaveBeenCalledTimes(3); // Plan + 2 steps
    });
    
    it('should stop execution if a step fails', async () => {
      // Mock step failure
      jest.spyOn(service, 'executeStep').mockImplementation((step) => {
        if (step.stepId === 'step-1') {
          return Promise.resolve({
            success: true,
            result: { data: 'Sample data' },
            executionTime: 0.5
          });
        } else {
          return Promise.resolve({
            success: false,
            error: 'Step failed',
            executionTime: 0.2
          });
        }
      });
      
      const plan = {
        queryId: 'test-query-1',
        originalQuery: 'Test query',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Step 1',
            type: 'data_retrieval',
            dependsOn: []
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Step 2',
            type: 'calculation',
            dependsOn: ['step-1']
          },
          {
            stepId: 'step-3',
            stepNumber: 3,
            description: 'Step 3',
            type: 'recommendation',
            dependsOn: ['step-2']
          }
        ]
      };
      
      const results = await service.executeStepSequence(plan);
      
      expect(results).toHaveProperty('success', false);
      expect(results).toHaveProperty('error');
      expect(results.stepResults).toHaveLength(2); // Only executed steps 1 and 2
      expect(service.executeStep).toHaveBeenCalledTimes(2); // Only steps 1 and 2 were attempted
    });
  });

  describe('executeStep', () => {
    it('should execute a calculation step correctly', async () => {
      const step = {
        stepId: 'step-2',
        type: 'calculation',
        description: 'Calculate capacity impact',
        parameters: {
          instructions: 'Calculate the impact of 5 additional stands'
        }
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('calculationResult', 42);
    });
    
    it('should execute a parameter extraction step correctly', async () => {
      const step = {
        stepId: 'step-1',
        type: 'parameter_extraction',
        description: 'Extract parameters from query',
        parameters: {
          text: 'Add 5 wide-body stands to Terminal 1'
        }
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('parameters');
      expect(result.result.parameters).toHaveProperty('terminal', 'Terminal 1');
    });
    
    it('should handle errors during step execution', async () => {
      // Mock OpenAI service to throw an error
      OpenAIService.processQuery.mockRejectedValueOnce(new Error('Service error'));
      
      const step = {
        stepId: 'step-2',
        type: 'calculation',
        description: 'Calculate capacity impact'
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
    
    it('should handle unsupported step types', async () => {
      const step = {
        stepId: 'unknown-step',
        type: 'unknown_type',
        description: 'Unknown step type'
      };
      
      const result = await service.executeStep(step, {}, []);
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', "Unsupported step type: unknown_type");
    });
  });

  describe('helper methods', () => {
    it('should correctly check dependencies', () => {
      const previousResults = [
        { stepId: 'step-1', success: true },
        { stepId: 'step-2', success: false },
        { stepId: 'step-3', success: true }
      ];
      
      // All dependencies satisfied
      expect(service.checkDependencies(['step-1', 'step-3'], previousResults)).toBe(true);
      
      // Some dependencies not satisfied
      expect(service.checkDependencies(['step-1', 'step-2'], previousResults)).toBe(false);
      
      // No dependencies
      expect(service.checkDependencies([], previousResults)).toBe(true);
      
      // Missing dependency
      expect(service.checkDependencies(['step-4'], previousResults)).toBe(false);
    });
    
    it('should detect cycles in dependency graphs', () => {
      // No cycles
      expect(service.detectCycle({
        1: [2, 3],
        2: [4],
        3: [],
        4: []
      })).toBe(false);
      
      // With cycles
      expect(service.detectCycle({
        1: [2],
        2: [3],
        3: [1]
      })).toBe(true);
      
      // Self-dependency
      expect(service.detectCycle({
        1: [1]
      })).toBe(true);
    });
    
    it('should correctly determine step types from descriptions', () => {
      expect(service.determineStepType({ description: 'Calculate the impact' })).toBe('calculation');
      expect(service.determineStepType({ description: 'Extract parameters from query' })).toBe('parameter_extraction');
      expect(service.determineStepType({ description: 'Retrieve data from database' })).toBe('data_retrieval');
      expect(service.determineStepType({ description: 'Validate the results' })).toBe('validation');
      expect(service.determineStepType({ description: 'Compare two scenarios' })).toBe('comparison');
      expect(service.determineStepType({ description: 'Recommend the best option' })).toBe('recommendation');
      expect(service.determineStepType({ description: 'Some other step' })).toBe('generic');
      
      // Should respect explicit type when provided
      expect(service.determineStepType({ description: 'Calculate', type: 'validation' })).toBe('validation');
    });
  });
});