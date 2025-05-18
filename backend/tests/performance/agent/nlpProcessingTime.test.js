/**
 * Performance Test: NLP Processing Time
 * 
 * This test measures the performance of natural language processing operations
 * to ensure they meet required response time thresholds.
 */

const { performance } = require('perf_hooks');
const NLPService = require('../../../src/services/agent/NLPService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');

// Mock implementation if needed
jest.mock('../../../src/services/agent/OpenAIService');

// Sample prompts of varying complexity
const testPrompts = [
  { 
    complexity: 'low', 
    prompt: 'Show me the current capacity for terminal 1' 
  },
  { 
    complexity: 'medium', 
    prompt: 'What will be the impact on capacity if we close stands A1-A5 for maintenance next week?' 
  },
  { 
    complexity: 'high', 
    prompt: 'Create a scenario where we increase flight volume by 15% during peak hours while terminal 2 is undergoing renovation between June and August, and analyze the impact on stand capacity.' 
  }
];

// Performance thresholds in milliseconds
const THRESHOLDS = {
  low: 500,    // 500ms for simple queries
  medium: 1500, // 1.5s for medium complexity
  high: 3000    // 3s for complex queries
};

describe('NLP Processing Performance Tests', () => {
  let nlpService;
  
  beforeAll(() => {
    // Configure the NLP service and any dependencies
    OpenAIService.processPrompt.mockImplementation(async (prompt) => {
      // Simulate processing time based on complexity
      const complexity = testPrompts.find(p => p.prompt === prompt)?.complexity || 'medium';
      const simulatedTime = {
        low: 200,
        medium: 800,
        high: 2000
      }[complexity];
      
      await new Promise(resolve => setTimeout(resolve, simulatedTime));
      return { intent: 'query_capacity', entities: { location: 'terminal 1' } };
    });
    
    nlpService = new NLPService(new OpenAIService());
  });

  test('should process low complexity prompts within threshold', async () => {
    const prompt = testPrompts.find(p => p.complexity === 'low').prompt;
    
    const startTime = performance.now();
    await nlpService.processPrompt(prompt);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    console.log(`Low complexity processing time: ${processingTime.toFixed(2)}ms`);
    
    expect(processingTime).toBeLessThan(THRESHOLDS.low);
  });

  test('should process medium complexity prompts within threshold', async () => {
    const prompt = testPrompts.find(p => p.complexity === 'medium').prompt;
    
    const startTime = performance.now();
    await nlpService.processPrompt(prompt);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    console.log(`Medium complexity processing time: ${processingTime.toFixed(2)}ms`);
    
    expect(processingTime).toBeLessThan(THRESHOLDS.medium);
  });

  test('should process high complexity prompts within threshold', async () => {
    const prompt = testPrompts.find(p => p.complexity === 'high').prompt;
    
    const startTime = performance.now();
    await nlpService.processPrompt(prompt);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    console.log(`High complexity processing time: ${processingTime.toFixed(2)}ms`);
    
    expect(processingTime).toBeLessThan(THRESHOLDS.high);
  });

  test('should handle batch processing efficiently', async () => {
    const prompts = testPrompts.map(p => p.prompt);
    
    const startTime = performance.now();
    const promises = prompts.map(prompt => nlpService.processPrompt(prompt));
    await Promise.all(promises);
    const endTime = performance.now();
    
    const avgProcessingTime = (endTime - startTime) / prompts.length;
    console.log(`Average processing time per prompt in batch: ${avgProcessingTime.toFixed(2)}ms`);
    
    // Expect average time to be less than the weighted average threshold
    const weightedAvgThreshold = 
      (THRESHOLDS.low + THRESHOLDS.medium + THRESHOLDS.high) / 3;
    
    expect(avgProcessingTime).toBeLessThan(weightedAvgThreshold);
  });
});