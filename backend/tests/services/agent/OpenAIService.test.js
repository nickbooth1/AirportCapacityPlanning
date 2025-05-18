/**
 * Test file for OpenAIService
 */

// Import required modules
const OpenAIService = require('../../../src/services/agent/OpenAIService');

// Mock OpenAI API client
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: '{"mock": "response"}'
                  }
                }
              ],
              usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
              }
            })
          }
        }
      };
    })
  };
});

describe('OpenAIService', () => {
  beforeEach(() => {
    // Reset token usage before each test
    OpenAIService.resetTokenUsage();
  });

  it('should extract parameters from natural language', async () => {
    // Set specific mock response
    OpenAIService.client.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parameters: {
                terminal: 'Terminal 1',
                standType: 'wide-body',
                count: 3
              },
              confidence: 0.95
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    });
    
    // Call the method
    const result = await OpenAIService.extractParameters('Add 3 wide-body stands to Terminal 1');
    
    // Verify results
    expect(result.parameters).toBeDefined();
    expect(result.parameters.terminal).toBe('Terminal 1');
    expect(result.parameters.standType).toBe('wide-body');
    expect(result.parameters.count).toBe(3);
    expect(result.confidence).toBe(0.95);
    
    // Verify API was called
    expect(OpenAIService.client.chat.completions.create).toHaveBeenCalled();
  });

  it('should track token usage correctly', async () => {
    // Initial usage should be zero
    expect(OpenAIService.getTokenUsage().total).toBe(0);
    
    // Call the API
    await OpenAIService.extractParameters('Test query');
    
    // Verify token usage was tracked
    expect(OpenAIService.getTokenUsage().prompt).toBe(100);
    expect(OpenAIService.getTokenUsage().completion).toBe(50);
    expect(OpenAIService.getTokenUsage().total).toBe(150);
  });
});