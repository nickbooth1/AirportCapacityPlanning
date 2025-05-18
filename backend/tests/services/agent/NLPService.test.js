/**
 * Test file for NLPService
 */

// Import required modules
const NLPService = require('../../../src/services/agent/NLPService');

// Test configuration
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  extractEntities: jest.fn(),
  extractParameters: jest.fn().mockResolvedValue({
    parameters: { terminal: 'Terminal 1' },
    confidence: 0.9
  }),
  performMultiStepReasoning: jest.fn().mockResolvedValue({
    steps: [{ step: 1, description: 'Test step' }],
    finalAnswer: { capacity: 120 },
    confidence: 0.85
  }),
  extractEntityRelationships: jest.fn()
}));

describe('NLPService', () => {
  it('should process parameter extraction successfully', async () => {
    const result = await NLPService.processParameterExtraction('Test input');
    expect(result).toBeDefined();
    expect(result.parameters).toBeDefined();
  });

  it('should process multi-step reasoning successfully', async () => {
    const result = await NLPService.processMultiStepReasoning('What if we add 5 stands?');
    expect(result).toBeDefined();
    expect(result.steps).toBeDefined();
    expect(result.finalAnswer).toBeDefined();
  });
});