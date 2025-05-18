/**
 * Enhanced Performance Test: NLP Processing
 * 
 * This test suite provides more comprehensive performance testing for NLP processing
 * in the AirportAI Phase 2 functionality, including:
 * - Processing time for various complexity levels of natural language inputs
 * - Handling of concurrent NLP processing requests
 * - Memory consumption during processing
 * - Consistency of processing time across similar requests
 */

const { performance } = require('perf_hooks');
const NLPService = require('../../../src/services/agent/NLPService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');

// Mock OpenAI service to avoid actual API calls during testing
jest.mock('../../../src/services/agent/OpenAIService');

// Test prompts with varying complexity and structure
const TEST_PROMPTS = {
  simple: [
    'Show me the current capacity for terminal 1',
    'What is the capacity of terminal 2?',
    'How many stands are currently operational?',
    'Show maintenance schedule for next week',
    'What is the peak hour capacity?'
  ],
  moderate: [
    'What would happen if we close stands A1-A5 for maintenance next week?',
    'How would capacity change if we add 3 more wide-body stands at Terminal 2?',
    'Compare the capacity between morning and evening peak hours',
    'What will be the impact if Flight XY123 is delayed by 2 hours?',
    'Calculate the maximum capacity if we optimize the turnaround times'
  ],
  complex: [
    'Create a scenario where we increase flight volume by 15% during peak hours while terminal 2 is undergoing renovation between June and August, and analyze the impact on stand capacity.',
    'If we convert 5 narrow-body stands to 3 wide-body stands in Terminal 1, how will that affect our overall capacity during the summer when we expect a 10% increase in wide-body aircraft?',
    'Calculate the optimal stand allocation strategy if we have a 25% increase in international flights during weekday mornings, while domestic flights increase by 10% in the afternoons.',
    'Design a maintenance schedule for the next quarter that minimizes impact on overall capacity, considering we need to renovate Terminal 3 and upgrade 10 stands.',
    'Analyze the impact of changing our minimum turnaround time policy to add 15 minutes for wide-body aircraft while reducing it by 10 minutes for narrow-body aircraft.'
  ]
};

// Performance thresholds in milliseconds
const THRESHOLDS = {
  simple: 800,       // 800ms for simple queries
  moderate: 2000,    // 2s for moderate complexity
  complex: 5000,     // 5s for complex queries
  concurrentBatch: 8000,  // 8s for batch of 10 concurrent requests
  consistencyVariance: 0.15  // 15% variance for consistency check
};

// Maximum memory increase allowed during processing (in MB)
const MAX_MEMORY_INCREASE = 50;

describe('Enhanced NLP Processing Performance Tests', () => {
  let nlpService;
  
  beforeAll(() => {
    // Configure mocks with realistic timing behavior
    OpenAIService.prototype.processPrompt = jest.fn(async (prompt) => {
      // Determine complexity based on prompt length and structure
      let complexity = 'simple';
      if (prompt.length > 100) {
        complexity = 'complex';
      } else if (prompt.length > 50) {
        complexity = 'moderate';
      }
      
      // Simulate processing time based on complexity
      const simulatedTimes = {
        simple: Math.random() * 200 + 300, // 300-500ms
        moderate: Math.random() * 500 + 800, // 800-1300ms 
        complex: Math.random() * 1000 + 1500 // 1500-2500ms
      };
      
      await new Promise(resolve => setTimeout(resolve, simulatedTimes[complexity]));
      
      // Return mock processed data
      return {
        intent: complexity === 'simple' ? 'query' : complexity === 'moderate' ? 'analyze' : 'create_scenario',
        entities: {
          // Randomly generate some entities based on the prompt
          location: prompt.includes('terminal') ? `Terminal ${Math.floor(Math.random() * 5) + 1}` : null,
          dateRange: prompt.includes('next week') ? { start: '2025-06-01', end: '2025-06-07' } : null,
          percentChange: prompt.includes('%') ? parseFloat(prompt.match(/(\d+)%/)?.[1]) / 100 : null
        },
        parameters: {
          // Additional extracted parameters
          standIds: prompt.includes('stands') ? ['A1', 'A2', 'A3', 'A4', 'A5'].slice(0, Math.floor(Math.random() * 5) + 1) : [],
          aircraftType: prompt.includes('wide-body') ? 'wide-body' : prompt.includes('narrow-body') ? 'narrow-body' : null
        }
      };
    });
    
    nlpService = new NLPService(new OpenAIService());
  });
  
  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('Processing Speed Tests', () => {
    test.each(TEST_PROMPTS.simple)(
      'should process simple prompt within threshold: %s',
      async (prompt) => {
        const startTime = performance.now();
        await nlpService.processPrompt(prompt);
        const endTime = performance.now();
        
        const processingTime = endTime - startTime;
        console.log(`Simple prompt processing time: ${processingTime.toFixed(2)}ms`);
        
        expect(processingTime).toBeLessThan(THRESHOLDS.simple);
      }
    );
    
    test.each(TEST_PROMPTS.moderate)(
      'should process moderate complexity prompt within threshold: %s',
      async (prompt) => {
        const startTime = performance.now();
        await nlpService.processPrompt(prompt);
        const endTime = performance.now();
        
        const processingTime = endTime - startTime;
        console.log(`Moderate complexity processing time: ${processingTime.toFixed(2)}ms`);
        
        expect(processingTime).toBeLessThan(THRESHOLDS.moderate);
      }
    );
    
    test.each(TEST_PROMPTS.complex)(
      'should process complex prompt within threshold: %s',
      async (prompt) => {
        const startTime = performance.now();
        await nlpService.processPrompt(prompt);
        const endTime = performance.now();
        
        const processingTime = endTime - startTime;
        console.log(`Complex prompt processing time: ${processingTime.toFixed(2)}ms`);
        
        expect(processingTime).toBeLessThan(THRESHOLDS.complex);
      }
    );
  });
  
  describe('Concurrent Processing Tests', () => {
    test('should handle 10 concurrent simple prompts efficiently', async () => {
      const prompts = TEST_PROMPTS.simple;
      
      const startTime = performance.now();
      await Promise.all(prompts.map(prompt => nlpService.processPrompt(prompt)));
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / prompts.length;
      
      console.log(`Total time for ${prompts.length} concurrent simple prompts: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per simple prompt: ${avgTime.toFixed(2)}ms`);
      
      // Total time should be less than simple threshold * number of prompts * scaling factor
      // The scaling factor accounts for parallelization benefits
      expect(totalTime).toBeLessThan(THRESHOLDS.simple * prompts.length * 0.6);
    });
    
    test('should handle mixed complexity concurrent prompts', async () => {
      // Mix of simple, moderate and complex
      const prompts = [
        ...TEST_PROMPTS.simple.slice(0, 2),
        ...TEST_PROMPTS.moderate.slice(0, 2),
        TEST_PROMPTS.complex[0]
      ];
      
      const startTime = performance.now();
      await Promise.all(prompts.map(prompt => nlpService.processPrompt(prompt)));
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      console.log(`Total time for ${prompts.length} mixed complexity prompts: ${totalTime.toFixed(2)}ms`);
      
      // Expect the total time to be less than our concurrent batch threshold
      expect(totalTime).toBeLessThan(THRESHOLDS.concurrentBatch);
    });
    
    test('should maintain performance under load of 20 sequential requests', async () => {
      // Create a mix of 20 requests (repeating our test prompts)
      const prompts = [
        ...TEST_PROMPTS.simple,
        ...TEST_PROMPTS.simple,
        ...TEST_PROMPTS.moderate,
        ...TEST_PROMPTS.moderate
      ];
      
      const times = [];
      let totalTime = 0;
      
      for (const prompt of prompts) {
        const startTime = performance.now();
        await nlpService.processPrompt(prompt);
        const endTime = performance.now();
        
        const elapsed = endTime - startTime;
        times.push(elapsed);
        totalTime += elapsed;
      }
      
      const avgTime = totalTime / prompts.length;
      
      // Calculate standard deviation to check consistency
      const sumSquaredDiffs = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0);
      const stdDev = Math.sqrt(sumSquaredDiffs / times.length);
      const varianceRatio = stdDev / avgTime;
      
      console.log(`Average processing time over ${prompts.length} sequential requests: ${avgTime.toFixed(2)}ms`);
      console.log(`Standard deviation: ${stdDev.toFixed(2)}ms (${(varianceRatio * 100).toFixed(2)}% of average)`);
      
      // Check if performance degraded over time
      const firstHalfAvg = times.slice(0, times.length / 2).reduce((sum, time) => sum + time, 0) / (times.length / 2);
      const secondHalfAvg = times.slice(times.length / 2).reduce((sum, time) => sum + time, 0) / (times.length / 2);
      
      console.log(`First half average: ${firstHalfAvg.toFixed(2)}ms, Second half: ${secondHalfAvg.toFixed(2)}ms`);
      
      // Performance should remain consistent (allowing for some variance)
      expect(varianceRatio).toBeLessThan(THRESHOLDS.consistencyVariance);
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.25); // Max 25% degradation
    });
  });
  
  describe('Memory Usage Tests', () => {
    test('should not consume excessive memory during processing', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Initial memory usage: ${initialMemory.toFixed(2)} MB`);
      
      // Process multiple complex prompts to stress memory
      await Promise.all(TEST_PROMPTS.complex.map(prompt => nlpService.processPrompt(prompt)));
      
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Final memory usage: ${finalMemory.toFixed(2)} MB`);
      console.log(`Memory increase: ${(finalMemory - initialMemory).toFixed(2)} MB`);
      
      expect(finalMemory - initialMemory).toBeLessThan(MAX_MEMORY_INCREASE);
    });
  });
  
  describe('Processing Consistency Tests', () => {
    test('should provide consistent performance for identical requests', async () => {
      const testPrompt = TEST_PROMPTS.moderate[0];
      const iterations = 5;
      const processingTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await nlpService.processPrompt(testPrompt);
        const endTime = performance.now();
        
        processingTimes.push(endTime - startTime);
      }
      
      const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / iterations;
      
      // Calculate standard deviation
      const sumSquaredDiffs = processingTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0);
      const stdDev = Math.sqrt(sumSquaredDiffs / iterations);
      const varianceRatio = stdDev / avgTime;
      
      console.log(`Processing times for ${iterations} identical requests: ${processingTimes.map(t => t.toFixed(2)).join(', ')} ms`);
      console.log(`Average: ${avgTime.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms (${(varianceRatio * 100).toFixed(2)}% of average)`);
      
      // Variance should be within our threshold for consistency
      expect(varianceRatio).toBeLessThan(THRESHOLDS.consistencyVariance);
    });
  });
});