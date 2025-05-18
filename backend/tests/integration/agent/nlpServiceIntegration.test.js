/**
 * Integration test for NLPService with OpenAI
 * Tests the interaction between NLPService and OpenAIService
 */

const NLPService = require('../../../src/services/agent/NLPService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');

// Only run tests if API key is available
const runLiveTests = process.env.OPENAI_API_KEY && process.env.RUN_LIVE_OPENAI_TESTS === 'true';

// Mock the OpenAI service if not using live tests
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  extractEntities: jest.fn().mockResolvedValue({
    intent: 'capacity_query',
    confidence: 0.95,
    entities: {
      terminal: 'Terminal 1',
      stand_type: 'wide-body'
    }
  }),
  extractParameters: jest.fn().mockResolvedValue({
    parameters: {
      terminal: 'Terminal 1',
      standType: 'wide-body',
      count: 3
    },
    confidence: 0.95,
    reasoning: ['Terminal 1 is explicitly mentioned', 'Wide-body stands are explicitly mentioned']
  }),
  performMultiStepReasoning: jest.fn().mockResolvedValue({
    steps: [
      {
        stepNumber: 1,
        description: 'Analyze current capacity',
        conclusion: 'Current capacity is limited by wide-body stands'
      },
      {
        stepNumber: 2,
        description: 'Assess impact of additional stands',
        conclusion: 'Adding 5 stands would increase capacity by approximately 10%'
      }
    ],
    finalAnswer: {
      capacityIncrease: '10%',
      recommendation: 'Add the stands to Terminal 1'
    },
    confidence: 0.85
  }),
  extractEntityRelationships: jest.fn().mockResolvedValue({
    relationships: {
      terminal_1: ['stand_a1', 'stand_a2'],
      stand_a1: ['terminal_1']
    },
    confidence: 0.8
  }),
  resetTokenUsage: jest.fn(),
  getTokenUsage: jest.fn().mockReturnValue({
    prompt: 100,
    completion: 50,
    total: 150
  }),
  isAvailable: false
}));

// Conditionally run or skip the tests
describe('NLPService Integration with OpenAI', () => {
  beforeEach(() => {
    // Reset mocks and token usage
    jest.clearAllMocks();
    OpenAIService.resetTokenUsage();
  });

  it('should process a query and extract intent and entities', async () => {
    // Process a query
    const result = await NLPService.processQuery(
      'What is the capacity of Terminal 1 for wide-body aircraft?'
    );
    
    // Verify the result structure
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('entities');
    expect(result).toHaveProperty('originalQuery');
    
    if (runLiveTests) {
      // Log actual API response for debugging
      console.log('Live API Response:', JSON.stringify(result, null, 2));
    } else {
      // Verify the mocked values
      expect(result.intent).toBe('capacity_query');
      expect(result.confidence).toBe(0.95);
      expect(result.entities).toEqual({
        terminal: 'Terminal 1',
        stand_type: 'wide-body'
      });
    }
  });
  
  it('should extract parameters from natural language description', async () => {
    // Process parameter extraction
    const result = await NLPService.processParameterExtraction(
      'Add 3 wide-body stands to Terminal 1'
    );
    
    // Verify the result structure
    expect(result).toHaveProperty('parameters');
    expect(result).toHaveProperty('confidence');
    
    if (runLiveTests) {
      // Log actual API response for debugging
      console.log('Live API Parameter Extraction:', JSON.stringify(result, null, 2));
    } else {
      // Verify the mocked values
      expect(result.parameters).toEqual({
        terminal: 'Terminal 1',
        standType: 'wide-body',
        count: 3
      });
      expect(result.confidence).toBe(0.95);
    }
  });
  
  it('should process multi-step reasoning', async () => {
    // Process multi-step reasoning
    const result = await NLPService.processMultiStepReasoning(
      'What would happen to capacity if we added 5 more stands?',
      { currentCapacity: 50, standUtilization: 0.85 }
    );
    
    // Verify the result structure
    expect(result).toHaveProperty('steps');
    expect(result).toHaveProperty('finalAnswer');
    expect(result).toHaveProperty('confidence');
    
    if (runLiveTests) {
      // Log actual API response for debugging
      console.log('Live API Multi-step Reasoning:', JSON.stringify(result, null, 2));
    } else {
      // Verify the mocked values
      expect(result.steps.length).toBe(2);
      expect(result.finalAnswer).toEqual({
        capacityIncrease: '10%',
        recommendation: 'Add the stands to Terminal 1'
      });
    }
  });
  
  it('should process time expressions correctly', () => {
    // Test various time expressions
    const tests = [
      { input: 'today', expectType: 'day' },
      { input: 'tomorrow', expectType: 'day' },
      { input: 'this week', expectType: 'week' },
      { input: 'next monday', expectType: 'day' },
      { input: '15/06/2025', expectType: 'day' }
    ];
    
    tests.forEach(test => {
      const result = NLPService.processTimeExpression(test.input);
      
      // Verify basic structure
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('expression');
      
      // Verify expected type
      if (test.expectType !== 'unknown') {
        expect(result.type).toBe(test.expectType);
      }
      
      // For day and week types, verify date range
      if (result.type === 'day' || result.type === 'week') {
        expect(result).toHaveProperty('start');
        expect(result).toHaveProperty('end');
        expect(result.start).toBeInstanceOf(Date);
        expect(result.end).toBeInstanceOf(Date);
      }
    });
  });
  
  it('should map intents to the correct API actions', () => {
    // Test various intents
    const tests = [
      { 
        intent: NLPService.intents.CAPACITY_QUERY, 
        expectService: 'capacityService',
        expectMethod: 'getCapacity'
      },
      { 
        intent: NLPService.intents.SCENARIO_CREATE, 
        expectService: 'scenarioService',
        expectMethod: 'createScenario'
      },
      { 
        intent: NLPService.intents.WHAT_IF_ANALYSIS, 
        expectService: 'scenarioService',
        expectMethod: 'createFromDescription'
      }
    ];
    
    tests.forEach(test => {
      const result = NLPService.mapIntentToAction(test.intent);
      
      // Verify mapping
      expect(result.service).toBe(test.expectService);
      expect(result.method).toBe(test.expectMethod);
    });
  });
});