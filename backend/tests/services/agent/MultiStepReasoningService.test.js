/**
 * Tests for Enhanced MultiStepReasoningService
 */

const MultiStepReasoningService = require('../../../src/services/agent/MultiStepReasoningService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const ContextService = require('../../../src/services/agent/ContextService');
const WorkingMemoryService = require('../../../src/services/agent/WorkingMemoryService');
const RetrievalAugmentedGenerationService = require('../../../src/services/agent/knowledge/RetrievalAugmentedGenerationService');
const FactVerifierService = require('../../../src/services/agent/knowledge/FactVerifierService');
const KnowledgeRetrievalService = require('../../../src/services/agent/knowledge/KnowledgeRetrievalService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService');
jest.mock('../../../src/services/agent/ContextService');
jest.mock('../../../src/services/agent/WorkingMemoryService');
jest.mock('../../../src/services/agent/knowledge/RetrievalAugmentedGenerationService');
jest.mock('../../../src/services/agent/knowledge/FactVerifierService');
jest.mock('../../../src/services/agent/knowledge/KnowledgeRetrievalService');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Enhanced MultiStepReasoningService', () => {
  let service;
  let mockWorkingMemoryService;
  let mockRagService;
  let mockFactVerifier;
  let mockKnowledgeRetrievalService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock working memory service
    mockWorkingMemoryService = new WorkingMemoryService();
    mockWorkingMemoryService.storeSessionContext = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.getSessionContext = jest.fn().mockResolvedValue({});
    mockWorkingMemoryService.storeQueryPlan = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.storeStepResult = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.storeFinalResult = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.storeEntityMentions = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.storeRetrievedKnowledge = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.getRetrievedKnowledge = jest.fn().mockReturnValue({
      items: [
        { type: 'fact', content: 'Test fact 1' },
        { type: 'fact', content: 'Test fact 2' }
      ]
    });
    
    // Setup mock knowledge retrieval service
    mockKnowledgeRetrievalService = new KnowledgeRetrievalService();
    mockKnowledgeRetrievalService.retrieveKnowledge = jest.fn().mockResolvedValue({
      facts: [
        { type: 'fact', content: 'Test fact 1' },
        { type: 'fact', content: 'Test fact 2' }
      ],
      contextual: [
        { type: 'contextual', content: 'Test contextual 1' }
      ],
      sources: ['database', 'document']
    });
    
    // Setup mock RAG service
    mockRagService = new RetrievalAugmentedGenerationService();
    mockRagService.knowledgeRetrievalService = mockKnowledgeRetrievalService;
    mockRagService.generateResponse = jest.fn().mockResolvedValue({
      text: 'Generated answer with knowledge',
      sources: [{ source: 'database', count: 2 }],
      isFactChecked: true,
      confidence: 0.85
    });
    
    // Setup mock fact verifier
    mockFactVerifier = new FactVerifierService();
    mockFactVerifier.verifyResponse = jest.fn().mockResolvedValue({
      verified: true,
      confidence: 0.9,
      statements: [
        { text: 'Statement 1', lineNumber: 1, accurate: true, status: 'SUPPORTED' },
        { text: 'Statement 2', lineNumber: 2, accurate: false, status: 'PARTIALLY SUPPORTED', suggestedCorrection: 'Corrected statement 2' }
      ],
      correctedResponse: 'Fact-checked response text'
    });
    
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
    
    // Create service instance with mocks
    service = new MultiStepReasoningService({
      workingMemoryService: mockWorkingMemoryService,
      ragService: mockRagService,
      factVerifier: mockFactVerifier,
      contextService: ContextService,
    });
  });

  describe('planQuerySteps', () => {
    it('should generate a plan with knowledge retrieval step', async () => {
      const query = 'What would happen if we added 5 more stands to Terminal 1?';
      const context = { sessionId: 'test-session' };
      
      const plan = await service.planQuerySteps(query, context);
      
      expect(plan).toHaveProperty('queryId');
      expect(plan).toHaveProperty('originalQuery', query);
      expect(plan).toHaveProperty('steps');
      expect(plan.steps).toHaveLength(3); // 1 knowledge step + 2 original steps
      expect(plan).toHaveProperty('confidence', 0.85);
      
      // First step should be knowledge retrieval
      expect(plan.steps[0]).toHaveProperty('type', 'knowledge_retrieval');
      expect(plan.steps[0]).toHaveProperty('stepId', 'step-1');
      
      // Original steps should have dependencies updated
      expect(plan.steps[1]).toHaveProperty('dependsOn', ['step-1']);
      expect(plan.steps[2]).toHaveProperty('dependsOn', ['step-2']);
      
      // Working memory integration should be used
      expect(mockWorkingMemoryService.storeSessionContext).toHaveBeenCalled();
      expect(mockWorkingMemoryService.storeQueryPlan).toHaveBeenCalled();
    });

    it('should preserve existing knowledge retrieval steps', async () => {
      // Mock a plan that already has knowledge retrieval
      OpenAIService.performMultiStepReasoning.mockResolvedValueOnce({
        steps: [
          {
            stepNumber: 1,
            description: 'Retrieve relevant knowledge',
            type: 'knowledge_retrieval',
            parameters: { query: 'test' }
          },
          {
            stepNumber: 2,
            description: 'Process the knowledge',
            dependsOn: ['step-1']
          }
        ]
      });
      
      const query = 'What is the airport capacity?';
      const plan = await service.planQuerySteps(query, {});
      
      // Should not modify the plan if it already has knowledge retrieval
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].type).toBe('knowledge_retrieval');
    });
  });

  describe('executeStepSequence', () => {
    it('should execute all steps including knowledge retrieval', async () => {
      const plan = {
        queryId: 'test-query-1',
        originalQuery: 'What would happen if we added 5 more stands?',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Retrieve relevant knowledge',
            type: 'knowledge_retrieval',
            dependsOn: [],
            parameters: { query: 'airport capacity stands' }
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Get current capacity data',
            type: 'data_retrieval',
            dependsOn: ['step-1'],
            parameters: { dataSource: 'capacity' }
          },
          {
            stepId: 'step-3',
            stepNumber: 3,
            description: 'Calculate impact',
            type: 'calculation',
            dependsOn: ['step-2'],
            parameters: {
              dataSource: 'previous_step',
              stepId: 'step-2'
            }
          }
        ]
      };
      
      const context = { sessionId: 'test-session' };
      
      const results = await service.executeStepSequence(plan, context);
      
      expect(results).toHaveProperty('success', true);
      expect(results).toHaveProperty('stepResults');
      expect(results.stepResults).toHaveLength(3); // All steps executed
      expect(results).toHaveProperty('finalAnswer');
      
      // Knowledge retrieval step should have been called
      expect(mockKnowledgeRetrievalService.retrieveKnowledge).toHaveBeenCalled();
      expect(mockWorkingMemoryService.storeRetrievedKnowledge).toHaveBeenCalled();
      
      // Working memory should store all step results
      expect(mockWorkingMemoryService.storeStepResult).toHaveBeenCalledTimes(3);
      
      // Final result should be stored
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalled();
    });
    
    it('should use RAG for final answer if knowledge is available', async () => {
      const plan = {
        queryId: 'test-query-2',
        originalQuery: 'How many more flights can we handle?',
        steps: [
          {
            stepId: 'step-1',
            stepNumber: 1,
            description: 'Retrieve relevant knowledge',
            type: 'knowledge_retrieval',
            dependsOn: [],
            parameters: { query: 'flight capacity' }
          },
          {
            stepId: 'step-2',
            stepNumber: 2,
            description: 'Calculate capacity',
            type: 'calculation',
            dependsOn: ['step-1'],
            parameters: {}
          }
        ]
      };
      
      // Mock a successful knowledge retrieval
      const knowledgeStepResult = {
        success: true,
        result: {
          facts: [{ content: 'Airport capacity is 50 flights per hour' }],
          contextual: [{ content: 'Peak hours are 7-9am' }]
        }
      };
      
      // Mock the executeStep method
      jest.spyOn(service, 'executeStep').mockImplementation((step) => {
        if (step.type === 'knowledge_retrieval') {
          return Promise.resolve(knowledgeStepResult);
        } else {
          return Promise.resolve({
            success: true,
            result: { calculationResult: 10 },
            executionTime: 0.5
          });
        }
      });
      
      const results = await service.executeStepSequence(plan, { sessionId: 'test-session' });
      
      // Final answer should use RAG
      expect(mockRagService.generateResponse).toHaveBeenCalled();
      expect(results.finalAnswer).toHaveProperty('factChecked', true);
      expect(results.finalAnswer).toHaveProperty('knowledgeSources');
    });
  });

  describe('executeKnowledgeRetrievalStep', () => {
    it('should retrieve and store knowledge correctly', async () => {
      const step = {
        stepId: 'step-1',
        type: 'knowledge_retrieval',
        parameters: {
          query: 'airport capacity planning',
          retrievalType: 'semantic',
          maxResults: 5
        }
      };
      
      const context = {
        sessionId: 'test-session',
        queryId: 'test-query'
      };
      
      const result = await service.executeKnowledgeRetrievalStep(step, context, []);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('facts');
      expect(result.result).toHaveProperty('contextual');
      
      // Knowledge retrieval service should be called
      expect(mockKnowledgeRetrievalService.retrieveKnowledge).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'airport capacity planning',
          queryId: 'test-query'
        }),
        expect.objectContaining({
          sessionId: 'test-session'
        }),
        expect.objectContaining({
          maxResults: 5,
          retrievalType: 'semantic'
        })
      );
      
      // Working memory should store retrieved knowledge
      expect(mockWorkingMemoryService.storeRetrievedKnowledge).toHaveBeenCalledWith(
        'test-session',
        'test-query',
        expect.any(Array),
        expect.any(Object),
        expect.any(Number)
      );
    });
  });

  describe('executeFactCheckingStep', () => {
    it('should check facts against retrieved knowledge', async () => {
      const step = {
        stepId: 'step-3',
        type: 'fact_checking',
        parameters: {
          dataSource: 'previous_step',
          stepId: 'step-2',
          strictMode: false
        }
      };
      
      const previousResults = [
        {
          stepId: 'step-1',
          success: true,
          result: {
            facts: [
              { content: 'Airport has 30 stands' },
              { content: 'Terminal A has 10 gates' }
            ],
            contextual: []
          }
        },
        {
          stepId: 'step-2',
          success: true,
          result: {
            text: 'The airport has 35 stands and Terminal A has 12 gates.'
          }
        }
      ];
      
      const context = {
        sessionId: 'test-session',
        queryId: 'test-query'
      };
      
      const result = await service.executeFactCheckingStep(step, context, previousResults);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('result');
      
      // Fact verifier should be called with correct params
      expect(mockFactVerifier.verifyResponse).toHaveBeenCalledWith(
        'The airport has 35 stands and Terminal A has 12 gates.',
        expect.any(Array),
        expect.objectContaining({
          strictMode: false
        })
      );
    });
    
    it('should fall back to working memory if no knowledge step result available', async () => {
      const step = {
        stepId: 'step-2',
        type: 'fact_checking',
        parameters: {
          text: 'The airport has 30 stands.'
        }
      };
      
      const context = {
        sessionId: 'test-session',
        queryId: 'test-query'
      };
      
      const result = await service.executeFactCheckingStep(step, context, []);
      
      expect(result).toHaveProperty('success', true);
      expect(mockWorkingMemoryService.getRetrievedKnowledge).toHaveBeenCalledWith(
        'test-session',
        'test-query'
      );
      
      expect(mockFactVerifier.verifyResponse).toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    it('should execute the entire reasoning process in one call', async () => {
      // Spy on the required methods
      jest.spyOn(service, 'planQuerySteps');
      jest.spyOn(service, 'executeStepSequence');
      
      const query = 'What is the impact of adding 5 more stands?';
      const context = { sessionId: 'test-session' };
      
      const result = await service.executeQuery(query, context);
      
      expect(service.planQuerySteps).toHaveBeenCalledWith(query, context);
      expect(service.executeStepSequence).toHaveBeenCalled();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });
    
    it('should handle planning errors gracefully', async () => {
      // Mock a planning failure
      jest.spyOn(service, 'planQuerySteps').mockResolvedValue({
        status: 'invalid_plan',
        reason: 'Missing required parameters',
        suggestedAlternative: 'Provide specific details'
      });
      
      const result = await service.executeQuery('Invalid query', {});
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Missing required parameters');
      expect(result).toHaveProperty('suggestedAlternative', 'Provide specific details');
    });
  });

  describe('generateKnowledgeGroundedAnswer', () => {
    it('should use RAG service to generate knowledge-grounded answers', async () => {
      const plan = {
        queryId: 'test-query',
        originalQuery: 'What is the capacity?'
      };
      
      const stepResults = [
        {
          stepId: 'step-1',
          result: {
            facts: [{ content: 'Capacity is 50 flights per hour' }],
            contextual: []
          }
        },
        {
          stepId: 'step-2',
          result: { calculationResult: 42 }
        }
      ];
      
      const knowledgeStep = stepResults[0];
      const context = { sessionId: 'test-session' };
      
      const answer = await service.generateKnowledgeGroundedAnswer(
        plan, stepResults, knowledgeStep, context
      );
      
      expect(answer).toHaveProperty('answer', 'Generated answer with knowledge');
      expect(answer).toHaveProperty('factChecked', true);
      expect(answer).toHaveProperty('knowledgeSources');
      expect(answer).toHaveProperty('confidence', 0.85);
      
      // RAG service should be called with correct params
      expect(mockRagService.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('What is the capacity?'),
          queryId: 'test-query'
        }),
        expect.objectContaining({
          sessionId: 'test-session',
          reasoningResults: expect.any(Array),
          originalQuery: 'What is the capacity?'
        }),
        expect.objectContaining({
          preRetrievedKnowledge: expect.any(Object),
          factCheck: true
        })
      );
    });
    
    it('should fall back to standard approach if RAG fails', async () => {
      // Mock RAG failure
      mockRagService.generateResponse.mockRejectedValueOnce(new Error('RAG failure'));
      
      // Spy on generateFinalAnswer to ensure it's called as fallback
      jest.spyOn(service, 'generateFinalAnswer').mockResolvedValueOnce({
        answer: 'Fallback answer'
      });
      
      const plan = { queryId: 'test', originalQuery: 'Query' };
      const stepResults = [{ stepId: 'step-1', result: { facts: [] } }];
      const knowledgeStep = stepResults[0];
      
      const answer = await service.generateKnowledgeGroundedAnswer(
        plan, stepResults, knowledgeStep, {}
      );
      
      expect(service.generateFinalAnswer).toHaveBeenCalled();
      expect(answer).toHaveProperty('answer', 'Fallback answer');
    });
  });

  describe('_factCheckFinalAnswer', () => {
    it('should check and correct final answer using fact verifier', async () => {
      const answerText = 'The airport has 25 stands.';
      const knowledgeItems = [
        { content: 'The airport has 30 stands.' }
      ];
      
      const checkedAnswer = await service._factCheckFinalAnswer(
        answerText, knowledgeItems, 'How many stands?'
      );
      
      expect(checkedAnswer).toHaveProperty('answer', 'Fact-checked response text');
      expect(checkedAnswer).toHaveProperty('factChecked', true);
      expect(checkedAnswer).toHaveProperty('confidence', 0.9);
      expect(checkedAnswer).toHaveProperty('verificationDetails');
      
      // Fact verifier should be called
      expect(mockFactVerifier.verifyResponse).toHaveBeenCalledWith(
        answerText,
        knowledgeItems,
        expect.any(Object)
      );
    });
    
    it('should return original answer if no knowledge items available', async () => {
      const answerText = 'The airport has 25 stands.';
      
      const checkedAnswer = await service._factCheckFinalAnswer(
        answerText, [], 'How many stands?'
      );
      
      expect(checkedAnswer).toHaveProperty('answer', answerText);
      expect(checkedAnswer).toHaveProperty('factChecked', false);
      
      // Fact verifier should not be called
      expect(mockFactVerifier.verifyResponse).not.toHaveBeenCalled();
    });
  });
});