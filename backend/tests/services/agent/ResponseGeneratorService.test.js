/**
 * Tests for ResponseGeneratorService
 */

const responseGeneratorModule = require('../../../src/services/agent/ResponseGeneratorService');
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const WorkingMemoryService = require('../../../src/services/agent/WorkingMemoryService');
const MultiStepReasoningService = require('../../../src/services/agent/MultiStepReasoningService');
const { FormatterService } = require('../../../src/services/agent/formatting');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService');
jest.mock('../../../src/services/agent/WorkingMemoryService');
jest.mock('../../../src/services/agent/MultiStepReasoningService');
jest.mock('../../../src/services/agent/formatting/FormatterService', () => ({
  formatTable: jest.fn().mockReturnValue('<formatted-table>'),
  formatComparisonTable: jest.fn().mockReturnValue('<formatted-comparison-table>'),
  formatList: jest.fn().mockReturnValue('<formatted-list>'),
  formatDisclosure: jest.fn().mockReturnValue('<formatted-disclosure>'),
  highlightText: jest.fn().mockReturnValue('<highlighted-text>')
}));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('ResponseGeneratorService', () => {
  let service;
  let mockWorkingMemoryService;
  let mockMultiStepReasoningService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock working memory service
    mockWorkingMemoryService = new WorkingMemoryService();
    mockWorkingMemoryService.getSessionContext = jest.fn().mockResolvedValue({
      previousQueries: [
        { queryId: 'query-1', intent: 'capacity_query', timestamp: Date.now() - 60000 }
      ],
      userPreferences: {
        detailLevel: 'medium',
        format: 'text'
      }
    });
    mockWorkingMemoryService.getContextForFollowUp = jest.fn().mockResolvedValue({});
    mockWorkingMemoryService.getKnowledgeRetrievalContext = jest.fn().mockResolvedValue({
      recentEntities: [
        { type: 'terminal', value: 'Terminal A', frequency: 3 },
        { type: 'stand', value: 'A12', frequency: 2 }
      ],
      priorKnowledge: [
        { content: 'Terminal A has 20 stands', type: 'fact' }
      ]
    });
    mockWorkingMemoryService.storeFinalResult = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.updateSessionContextField = jest.fn().mockResolvedValue(true);
    
    // Setup mock multi-step reasoning service
    mockMultiStepReasoningService = new MultiStepReasoningService();
    mockMultiStepReasoningService.executeQuery = jest.fn().mockResolvedValue({
      success: true,
      answer: 'The capacity would increase by 10% if 5 more stands were added.',
      confidence: 0.85,
      reasoning: [
        { stepNumber: 1, description: 'Retrieve capacity data', explanation: 'Got current capacity' },
        { stepNumber: 2, description: 'Calculate impact', explanation: 'Calculated percentage increase' }
      ],
      evidence: [
        { content: 'Current capacity is 50 flights per hour' },
        { content: 'Each stand can handle approximately 1 flight per hour' }
      ],
      knowledgeSources: [
        { source: 'capacity_database', count: 2 }
      ]
    });
    
    // Mock OpenAI responses
    OpenAIService.processQuery = jest.fn().mockResolvedValue({
      text: 'OpenAI generated response'
    });
    
    OpenAIService.generateResponse = jest.fn().mockResolvedValue({
      text: 'Generated response with LLM',
      suggestedActions: [
        { type: 'suggestion', text: 'Suggested action' }
      ]
    });
    
    OpenAIService.generateContent = jest.fn().mockResolvedValue({
      fields: {
        additional_details: 'Generated additional details',
        key_insight: 'Generated key insight'
      }
    });
    
    OpenAIService.generateChartDescription = jest.fn().mockResolvedValue({
      main: 'Chart shows capacity trends over time',
      insight: 'Peak capacity occurs at 12pm',
      highlight: 'Notable increase on weekends'
    });
    
    // Get service instance - the module exports an instance, not a constructor
    service = responseGeneratorModule;
    
    // Initialize with mocks
    service.workingMemoryService = mockWorkingMemoryService;
    service.multiStepReasoningService = mockMultiStepReasoningService;
    service.openAIService = OpenAIService;
    
    // Reset metrics and options
    service.metrics = {
      totalGenerated: 0,
      successfulGeneration: 0,
      failedGeneration: 0,
      templateBasedGeneration: 0,
      llmBasedGeneration: 0,
      reasoningBasedGeneration: 0,
      totalLatency: 0,
      averageLatency: 0
    };
    
    service.options = {
      defaultTTL: 30 * 60 * 1000,
      enablePersonalization: true,
      useMultiStepReasoning: true
    };
  });
  
  describe('generateResponse', () => {
    it('should generate a response for a capacity query intent', async () => {
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'Terminal A', time_period: 'peak hour' },
        data: { capacity_value: 50, additional_details: 'This includes all stands.' },
        query: 'What is the capacity of Terminal A during peak hour?',
        options: {
          sessionId: 'test-session',
          queryId: 'test-query',
          format: 'text'
        }
      };
      
      // Mock the _fillTemplate method to return a predictable result
      jest.spyOn(service, '_fillTemplate').mockResolvedValueOnce(
        'Based on the data, the capacity for Terminal A peak hour is 50. This includes all stands.'
      );
      
      const response = await service.generateResponse(input);
      
      expect(response).toHaveProperty('text');
      expect(response).toHaveProperty('requestId');
      expect(response.text).toContain('Terminal A');
      expect(response.text).toContain('50');
      
      // Working memory integration should be used
      expect(mockWorkingMemoryService.getSessionContext).toHaveBeenCalledWith('test-session');
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalled();
    });
    
    it('should handle error case with appropriate error response', async () => {
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'Terminal Z' },
        error: new Error('Terminal not found'),
        query: 'What is the capacity of Terminal Z?',
        options: { sessionId: 'test-session' }
      };
      
      // Mock the _generateErrorResponse method
      jest.spyOn(service, '_generateErrorResponse').mockResolvedValueOnce(
        "I couldn't find terminal Terminal Z. Please check if it exists or try a different query."
      );
      
      const response = await service.generateResponse(input);
      
      expect(response).toHaveProperty('text');
      expect(response.text).toContain("couldn't find");
      expect(response.text).toContain('Terminal Z');
      expect(service._generateErrorResponse).toHaveBeenCalled();
    });
    
    it('should use reasoning for complex queries', async () => {
      const input = {
        intent: 'what_if',
        entities: { terminal: 'Terminal A', stand_count: 5 },
        data: {},
        query: 'What would happen if we added 5 more stands to Terminal A?',
        options: {
          sessionId: 'test-session',
          useReasoning: true
        }
      };
      
      // Mock the generateReasoningBasedResponse method
      jest.spyOn(service, 'generateReasoningBasedResponse').mockResolvedValueOnce({
        text: 'The capacity would increase by 10% if 5 more stands were added.',
        reasoning: {
          answer: 'The capacity would increase by 10% if 5 more stands were added.',
          steps: [
            { stepNumber: 1, description: 'Retrieve capacity data' }
          ]
        }
      });
      
      const response = await service.generateResponse(input);
      
      expect(response).toHaveProperty('reasoning');
      expect(response.text).toContain('increase by 10%');
      expect(service.generateReasoningBasedResponse).toHaveBeenCalled();
    });
    
    it('should fall back to LLM for unknown intents', async () => {
      const input = {
        intent: 'unknown_intent',
        entities: {},
        data: {},
        query: 'Tell me something interesting about airports',
        options: { sessionId: 'test-session' }
      };
      
      // Mock the _generateResponseWithLLM method
      jest.spyOn(service, '_generateResponseWithLLM').mockResolvedValueOnce({
        text: 'Generated response with LLM',
        suggestedActions: []
      });
      
      const response = await service.generateResponse(input);
      
      expect(response.text).toBe('Generated response with LLM');
      expect(service._generateResponseWithLLM).toHaveBeenCalled();
    });
    
    it('should format response according to requested format', async () => {
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'Terminal A' },
        data: { capacity_value: 50 },
        query: 'What is the capacity of Terminal A?',
        options: {
          sessionId: 'test-session',
          format: 'json'
        }
      };
      
      // Mock template filling and output formatting
      jest.spyOn(service, '_fillTemplate').mockResolvedValueOnce(
        'Based on the data, the capacity for Terminal A is 50.'
      );
      
      jest.spyOn(service, '_applyOutputFormat').mockReturnValueOnce(
        '{"response": "Based on the data, the capacity for Terminal A is 50."}'
      );
      
      const response = await service.generateResponse(input);
      
      // Should be JSON formatted
      expect(response.text).toContain('{');
      expect(response.text).toContain('}');
      expect(service._applyOutputFormat).toHaveBeenCalledWith(
        expect.any(String), 'json', expect.any(Object)
      );
    });
    
    it('should handle failure gracefully', async () => {
      // Force generateResponse to fail internally
      jest.spyOn(service, '_fillTemplate').mockImplementationOnce(() => {
        throw new Error('Template filling failed');
      });
      
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'Terminal A' },
        data: { capacity_value: 50 },
        query: 'What is the capacity of Terminal A?'
      };
      
      // Mock the fallback response
      jest.spyOn(service, '_generateFallbackResponse').mockReturnValueOnce(
        "I'm sorry, I couldn't process your request. Please try again with a different query."
      );
      
      const response = await service.generateResponse(input);
      
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('text'); // Should have fallback text
      expect(service._generateFallbackResponse).toHaveBeenCalled();
    });
  });
  
  describe('shouldUseReasoning', () => {
    it('should use reasoning for complex intents', () => {
      expect(service.shouldUseReasoning({ intent: 'analysis' }, {})).toBe(true);
      expect(service.shouldUseReasoning({ intent: 'comparison' }, {})).toBe(true);
      expect(service.shouldUseReasoning({ intent: 'what_if' }, {})).toBe(true);
    });
    
    it('should use reasoning for complex query keywords', () => {
      expect(service.shouldUseReasoning({ query: 'Why does the capacity decrease?' }, {})).toBe(true);
      expect(service.shouldUseReasoning({ query: 'Explain the impact of maintenance' }, {})).toBe(true);
      expect(service.shouldUseReasoning({ query: 'Compare Terminal A and Terminal B' }, {})).toBe(true);
    });
    
    it('should respect explicit option setting', () => {
      expect(service.shouldUseReasoning({ intent: 'simple' }, { useReasoning: true })).toBe(true);
      expect(service.shouldUseReasoning({ intent: 'complex_analysis' }, { useReasoning: false })).toBe(false);
    });
    
    it('should not use reasoning if globally disabled', () => {
      const originalOption = service.options.useMultiStepReasoning;
      service.options.useMultiStepReasoning = false;
      
      expect(service.shouldUseReasoning({ intent: 'analysis' }, {})).toBe(false);
      
      // Restore original setting
      service.options.useMultiStepReasoning = originalOption;
    });
  });
  
  describe('generateReasoningBasedResponse', () => {
    it('should generate a response with reasoning details', async () => {
      const query = 'What would happen if we added 5 more stands?';
      const context = { sessionId: 'test-session', intent: 'what_if' };
      const options = { detail: 'comprehensive' };
      
      // Mock template for the response
      service.responseTemplates = {
        complex_reasoning: {
          detailed: '{reasoning_result}\n\nReasoning process:\n{reasoning_steps}'
        }
      };
      
      const result = await service.generateReasoningBasedResponse(query, context, options);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('reasoning');
      expect(result.reasoning).toHaveProperty('steps');
      expect(result.reasoning).toHaveProperty('evidence');
      expect(mockMultiStepReasoningService.executeQuery).toHaveBeenCalledWith(
        query, 
        context, 
        expect.objectContaining({ detail: 'comprehensive' })
      );
    });
    
    it('should include evidence in with_evidence template', async () => {
      const query = 'What would happen if we added 5 more stands?';
      const context = { sessionId: 'test-session' };
      const options = { detail: 'medium' }; // Should use with_evidence template
      
      // Mock template
      service.responseTemplates = {
        complex_reasoning: {
          with_evidence: 'Based on the analysis: {reasoning_result}\n\nEvidence: {evidence_summary}'
        }
      };
      
      service.reasoningTemplates = {
        evidence_item: '• {evidence_content}'
      };
      
      const result = await service.generateReasoningBasedResponse(query, context, options);
      
      expect(result.text).toContain('Evidence:');
    });
    
    it('should fall back to LLM if reasoning fails', async () => {
      // Mock reasoning failure
      mockMultiStepReasoningService.executeQuery.mockResolvedValueOnce({
        success: false,
        error: 'Reasoning failed'
      });
      
      const query = 'What would happen if we added 5 more stands?';
      const context = { sessionId: 'test-session', intent: 'what_if' };
      
      // Mock LLM response
      jest.spyOn(service, '_generateResponseWithLLM').mockResolvedValueOnce({
        text: 'Generated LLM fallback response'
      });
      
      const result = await service.generateReasoningBasedResponse(query, context, {});
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('reasoning', null);
      expect(service._generateResponseWithLLM).toHaveBeenCalled();
    });
  });
  
  describe('getContextForResponse', () => {
    it('should retrieve and combine context from working memory', async () => {
      const context = await service.getContextForResponse('test-session', 'test-query');
      
      expect(context).toHaveProperty('sessionContext');
      expect(context).toHaveProperty('recentEntities');
      expect(context).toHaveProperty('previousQueries');
      expect(context).toHaveProperty('userPreferences');
      
      expect(mockWorkingMemoryService.getSessionContext).toHaveBeenCalledWith('test-session');
      expect(mockWorkingMemoryService.getContextForFollowUp).toHaveBeenCalledWith('test-session', 'test-query');
      expect(mockWorkingMemoryService.getKnowledgeRetrievalContext).toHaveBeenCalledWith(
        'test-session', 
        'test-query',
        expect.any(Object)
      );
    });
    
    it('should return empty object if working memory service is unavailable', async () => {
      // Temporarily remove the working memory service
      const originalService = service.workingMemoryService;
      service.workingMemoryService = null;
      
      const context = await service.getContextForResponse('test-session', 'test-query');
      
      expect(context).toEqual({});
      
      // Restore service
      service.workingMemoryService = originalService;
    });
    
    it('should handle errors gracefully', async () => {
      // Force getSessionContext to fail
      mockWorkingMemoryService.getSessionContext.mockRejectedValueOnce(
        new Error('Failed to retrieve context')
      );
      
      const context = await service.getContextForResponse('test-session', 'test-query');
      
      expect(context).toEqual({});
    });
  });
  
  describe('storeResponseInMemory', () => {
    it('should store response and update session context', async () => {
      const result = await service.storeResponseInMemory(
        'test-session',
        'test-query',
        'Test response',
        {
          intent: 'capacity_query',
          entities: { terminal: 'Terminal A' }
        }
      );
      
      expect(result).toBe(true);
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalledWith(
        'test-session',
        'test-query',
        expect.objectContaining({
          response: 'Test response',
          metadata: expect.any(Object)
        }),
        expect.any(Number)
      );
      
      expect(mockWorkingMemoryService.updateSessionContextField).toHaveBeenCalledWith(
        'test-session',
        'previousQueries',
        expect.any(Array)
      );
    });
    
    it('should return false if working memory service is unavailable', async () => {
      // Temporarily remove the working memory service
      const originalService = service.workingMemoryService;
      service.workingMemoryService = null;
      
      const result = await service.storeResponseInMemory(
        'test-session',
        'test-query',
        'Test response',
        {}
      );
      
      expect(result).toBe(false);
      
      // Restore service
      service.workingMemoryService = originalService;
    });
    
    it('should handle errors gracefully', async () => {
      // Force storeFinalResult to fail
      mockWorkingMemoryService.storeFinalResult.mockRejectedValueOnce(
        new Error('Failed to store result')
      );
      
      const result = await service.storeResponseInMemory(
        'test-session',
        'test-query',
        'Test response',
        {}
      );
      
      expect(result).toBe(false);
    });
  });
});
