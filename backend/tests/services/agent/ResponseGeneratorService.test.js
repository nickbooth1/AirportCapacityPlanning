/**
 * Tests for ResponseGeneratorService
 */

const ResponseGeneratorService = require('../../../src/services/agent/ResponseGeneratorService');
const WorkingMemoryService = require('../../../src/services/agent/WorkingMemoryService');
const MultiStepReasoningService = require('../../../src/services/agent/MultiStepReasoningService');

// Mock dependencies
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn().mockResolvedValue({ 
    text: 'Generated response',
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  }),
  generateResponse: jest.fn().mockResolvedValue({ 
    text: 'Generated response with intent',
    suggestedActions: [{ text: 'Action 1' }]
  }),
  generateContent: jest.fn().mockResolvedValue({
    fields: {
      additional_details: 'Additional details about the query.',
      key_difference: 'The key difference is in capacity.',
      details: 'Detailed information.'
    }
  }),
  generateChartDescription: jest.fn().mockResolvedValue({
    main: 'Chart showing capacity trends',
    insight: 'Peak capacity occurs at 10am',
    highlight: 'Terminal 1 has highest utilization'
  })
}));

// Mock WorkingMemoryService
jest.mock('../../../src/services/agent/WorkingMemoryService');

// Mock MultiStepReasoningService
jest.mock('../../../src/services/agent/MultiStepReasoningService');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Get the mock instances
const OpenAIService = require('../../../src/services/agent/OpenAIService');
const logger = require('../../../src/utils/logger');

describe('ResponseGeneratorService', () => {
  let mockWorkingMemoryService;
  let mockMultiStepReasoningService;
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock services
    mockWorkingMemoryService = new WorkingMemoryService();
    mockWorkingMemoryService.getSessionContext = jest.fn().mockResolvedValue({
      userPreferences: { detailLevel: 'high' }
    });
    mockWorkingMemoryService.getContextForFollowUp = jest.fn().mockResolvedValue({
      sessionContext: { lastQuery: 'Previous query' },
      queryInfo: { result: { answer: 'Previous answer' } }
    });
    mockWorkingMemoryService.getKnowledgeRetrievalContext = jest.fn().mockResolvedValue({
      recentEntities: [
        { type: 'terminal', value: 'T1', confidence: 0.9 },
        { type: 'stand', value: 'A12', confidence: 0.8 }
      ]
    });
    mockWorkingMemoryService.storeFinalResult = jest.fn().mockResolvedValue(true);
    mockWorkingMemoryService.updateSessionContextField = jest.fn().mockResolvedValue(true);
    
    mockMultiStepReasoningService = new MultiStepReasoningService();
    mockMultiStepReasoningService.executeQuery = jest.fn().mockResolvedValue({
      success: true,
      answer: 'Complex reasoning answer',
      confidence: 0.85,
      reasoning: [
        { stepNumber: 1, description: 'First step', explanation: 'First step explanation' },
        { stepNumber: 2, description: 'Second step', explanation: 'Second step explanation' }
      ],
      evidence: [
        { summary: 'Evidence 1' },
        { summary: 'Evidence 2' }
      ]
    });
    
    // Access the singleton instance
    service = ResponseGeneratorService;
    
    // Override the service dependencies for testing
    service.workingMemoryService = mockWorkingMemoryService;
    service.multiStepReasoningService = mockMultiStepReasoningService;
    
    // Reset metrics
    service.resetMetrics();
  });
  
  describe('generateResponse', () => {
    it('should generate response using templates when template is available', async () => {
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'T1', time_period: 'morning' },
        data: { capacity_value: '42 stands' },
        query: 'What is the capacity of Terminal 1 in the morning?',
        options: {
          sessionId: 'test-session-123',
          queryId: 'test-query-456'
        }
      };
      
      const result = await service.generateResponse(input);
      
      // Verify the response
      expect(result).toHaveProperty('text');
      expect(result.text).toContain('T1');
      expect(result.text).toContain('morning');
      expect(result.text).toContain('42 stands');
      
      // Should store in working memory
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalledWith(
        'test-session-123',
        'test-query-456',
        expect.objectContaining({
          response: expect.any(String),
          metadata: expect.objectContaining({
            intent: 'capacity_query'
          })
        }),
        expect.any(Number)
      );
      
      // Should have suggested actions
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });
    
    it('should use fallback to LLM when template is not available', async () => {
      const input = {
        intent: 'unknown_intent',
        entities: { terminal: 'T1' },
        data: {},
        query: 'Tell me something about Terminal 1',
        options: {}
      };
      
      const result = await service.generateResponse(input);
      
      // Should call OpenAI
      expect(OpenAIService.generateResponse).toHaveBeenCalled();
      
      // Verify response
      expect(result.text).toBe('Generated response with intent');
      expect(result.suggestedActions).toEqual([{ text: 'Action 1' }]);
    });
    
    it('should use multi-step reasoning for complex queries', async () => {
      const input = {
        intent: 'analysis',
        entities: { terminal: 'T1' },
        data: {},
        query: 'Analyze the impact of increasing flights in Terminal 1',
        options: {
          sessionId: 'test-session-123',
          queryId: 'test-query-456',
          useReasoning: true
        }
      };
      
      const result = await service.generateResponse(input);
      
      // Should call MultiStepReasoningService
      expect(mockMultiStepReasoningService.executeQuery).toHaveBeenCalledWith(
        input.query,
        expect.objectContaining({
          sessionId: 'test-session-123',
          queryId: 'test-query-456',
          intent: 'analysis'
        }),
        expect.any(Object)
      );
      
      // Verify response contains reasoning
      expect(result.text).toContain('Complex reasoning answer');
      expect(result.reasoning).toEqual({
        answer: 'Complex reasoning answer',
        confidence: 0.85,
        steps: expect.any(Array),
        evidence: expect.any(Array),
        sources: undefined
      });
    });
    
    it('should handle errors and generate fallback responses', async () => {
      // Make OpenAI throw an error
      OpenAIService.generateResponse.mockRejectedValueOnce(new Error('API error'));
      
      const input = {
        intent: 'capacity_query',
        entities: {},
        data: {},
        query: 'What is the capacity?',
        options: {},
        error: 'Not found error'
      };
      
      const result = await service.generateResponse(input);
      
      // Should generate an error response
      expect(result.text).toContain('I couldn\'t find');
      expect(result.error).toBeDefined();
    });
    
    it('should apply different output formats', async () => {
      const input = {
        intent: 'capacity_query',
        entities: { terminal: 'T1' },
        data: { capacity_value: '42 stands' },
        query: 'What is the capacity of Terminal 1?',
        options: {
          format: 'json'
        }
      };
      
      const result = await service.generateResponse(input);
      
      // Should format as JSON
      expect(result.text.startsWith('{')).toBeTruthy();
      expect(result.text.endsWith('}')).toBeTruthy();
      
      // Try markdown format
      input.options.format = 'markdown';
      const markdownResult = await service.generateResponse(input);
      
      // Should format as markdown
      expect(markdownResult.text).toContain('##');
    });
  });
  
  describe('generateSystemResponse', () => {
    it('should generate system responses using templates', async () => {
      const result = await service.generateSystemResponse('action_approval_request', {
        action_description: 'create a maintenance request for stand A12'
      });
      
      expect(result).toContain('create a maintenance request for stand A12');
      expect(result).toContain('proceed with this action');
    });
    
    it('should handle unknown system template types', async () => {
      const result = await service.generateSystemResponse('unknown_type', {
        param1: 'value1'
      });
      
      expect(result).toContain('System message');
      expect(result).toContain('param1');
      expect(result).toContain('value1');
    });
  });
  
  describe('generateVisualizationDescription', () => {
    it('should generate descriptions for charts', async () => {
      const result = await service.generateVisualizationDescription({
        type: 'chart',
        data: { labels: ['8am', '9am', '10am'], values: [30, 35, 42] },
        title: 'Hourly Capacity'
      });
      
      expect(result).toContain('Chart showing capacity trends');
      expect(result).toContain('Peak capacity occurs at 10am');
    });
    
    it('should generate descriptions for data summaries', async () => {
      const result = await service.generateVisualizationDescription({
        type: 'summary',
        data: { total: 100, average: 25 },
        title: 'Capacity Summary'
      });
      
      expect(result).toContain('key metrics');
      expect(result).toContain('Terminal 1 has highest utilization');
    });
  });
  
  describe('generateKnowledgeBasedResponse', () => {
    it('should generate responses based on knowledge items', async () => {
      const result = await service.generateKnowledgeBasedResponse(
        'What maintenance is scheduled for stand A12?',
        [
          { 
            source: 'maintenance-db', 
            content: 'Stand A12 has scheduled maintenance on 2023-10-15' 
          },
          { 
            source: 'stand-data', 
            content: 'Stand A12 is located in Terminal 1' 
          }
        ],
        null, // no reasoning result
        { detail: 'comprehensive' }
      );
      
      // Should call OpenAI for generation
      expect(OpenAIService.processQuery).toHaveBeenCalled();
      
      // Should format the response with sources
      expect(result).toContain('According to the available information');
      expect(result).toContain('maintenance-db');
      expect(result).toContain('stand-data');
    });
    
    it('should use reasoning results if available', async () => {
      const result = await service.generateKnowledgeBasedResponse(
        'What maintenance is scheduled for stand A12?',
        [
          { 
            source: 'maintenance-db', 
            content: 'Stand A12 has scheduled maintenance on 2023-10-15' 
          }
        ],
        { answer: 'Stand A12 has maintenance scheduled for Oct 15, 2023.' },
        { detail: 'default' }
      );
      
      // Should use reasoning result directly instead of calling OpenAI
      expect(OpenAIService.processQuery).not.toHaveBeenCalled();
      expect(result).toContain('Stand A12 has maintenance scheduled for Oct 15, 2023.');
    });
  });
  
  describe('shouldUseReasoning', () => {
    it('should identify complex queries that need reasoning', () => {
      expect(service.shouldUseReasoning({ 
        intent: 'analysis',
        query: 'Analyze the impact of maintenance' 
      }, {})).toBeTruthy();
      
      expect(service.shouldUseReasoning({ 
        intent: 'simple_query',
        query: 'What is the capacity of Terminal 1?' 
      }, {})).toBeFalsy();
      
      expect(service.shouldUseReasoning({ 
        intent: 'simple_query',
        query: 'Why is the capacity of Terminal 1 reduced?' 
      }, {})).toBeTruthy();
      
      // Should respect explicit options
      expect(service.shouldUseReasoning({ 
        intent: 'simple_query',
        query: 'What is the capacity?' 
      }, { useReasoning: true })).toBeTruthy();
    });
  });
  
  describe('getContextForResponse and storeResponseInMemory', () => {
    it('should retrieve context from working memory', async () => {
      const context = await service.getContextForResponse('test-session', 'test-query');
      
      expect(mockWorkingMemoryService.getSessionContext).toHaveBeenCalledWith('test-session');
      expect(mockWorkingMemoryService.getContextForFollowUp).toHaveBeenCalledWith('test-session', 'test-query');
      expect(mockWorkingMemoryService.getKnowledgeRetrievalContext).toHaveBeenCalledWith(
        'test-session', 
        'test-query',
        expect.any(Object)
      );
      
      expect(context).toHaveProperty('sessionContext');
      expect(context).toHaveProperty('followUpContext');
      expect(context).toHaveProperty('knowledgeContext');
      expect(context).toHaveProperty('recentEntities');
      expect(context.recentEntities).toHaveLength(2);
    });
    
    it('should store responses in working memory', async () => {
      const result = await service.storeResponseInMemory(
        'test-session',
        'test-query',
        'This is a test response',
        {
          intent: 'test_intent',
          entities: { entity1: 'value1' }
        }
      );
      
      expect(result).toBeTruthy();
      expect(mockWorkingMemoryService.storeFinalResult).toHaveBeenCalledWith(
        'test-session',
        'test-query',
        expect.objectContaining({
          response: 'This is a test response',
          metadata: expect.objectContaining({
            intent: 'test_intent'
          })
        }),
        expect.any(Number)
      );
      
      expect(mockWorkingMemoryService.updateSessionContextField).toHaveBeenCalledWith(
        'test-session',
        'previousQueries',
        expect.any(Array)
      );
    });
  });
  
  describe('Template and format management', () => {
    it('should allow adding/updating templates', () => {
      service.updateTemplate('new_intent', 'custom', 'This is a {custom} template');
      
      expect(service.responseTemplates.new_intent).toBeDefined();
      expect(service.responseTemplates.new_intent.custom).toBe('This is a {custom} template');
      
      // Should log the update
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated template for intent new_intent')
      );
    });
    
    it('should allow adding/updating format templates', () => {
      service.updateFormatTemplate('custom_format', {
        wrapperStart: '<custom>',
        wrapperEnd: '</custom>',
        sectionStart: '<item>',
        sectionEnd: '</item>',
        listItemPrefix: '* '
      });
      
      expect(service.formatTemplates.custom_format).toBeDefined();
      expect(service.formatTemplates.custom_format.wrapperStart).toBe('<custom>');
      
      // Should log the update
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated format template for custom_format')
      );
    });
  });
  
  describe('Performance metrics', () => {
    it('should track generation metrics and reset them', async () => {
      // Generate a few responses to update metrics
      await service.generateResponse({
        intent: 'capacity_query',
        entities: {},
        data: {},
        query: 'Test query 1',
        options: {}
      });
      
      await service.generateResponse({
        intent: 'unknown_intent',
        entities: {},
        data: {},
        query: 'Test query 2',
        options: {}
      });
      
      await service.generateResponse({
        intent: 'analysis',
        entities: {},
        data: {},
        query: 'Analyze this',
        options: { useReasoning: true }
      });
      
      // Get metrics
      const metrics = service.getMetrics();
      
      // Check metrics
      expect(metrics.totalGenerated).toBe(3);
      expect(metrics.successfulGeneration).toBe(3);
      expect(metrics.templateBasedGeneration).toBe(1);
      expect(metrics.llmBasedGeneration).toBe(1);
      expect(metrics.reasoningBasedGeneration).toBe(1);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
      
      // Reset metrics
      service.resetMetrics();
      
      // Check metrics after reset
      const resetMetrics = service.getMetrics();
      expect(resetMetrics.totalGenerated).toBe(0);
      expect(resetMetrics.averageLatency).toBe(0);
    });
  });
  
  // Helper method tests
  describe('Helper methods', () => {
    it('should enhance data with context', () => {
      const data = { value1: 'test' };
      const context = {
        userPreferences: { theme: 'dark' },
        recentEntities: [
          { type: 'terminal', value: 'T1' },
          { type: 'stand', value: 'A12' }
        ],
        previousQueries: [
          { queryId: 'q1', intent: 'intent1' }
        ]
      };
      
      const enhanced = service._enhanceDataWithContext(data, context);
      
      expect(enhanced.value1).toBe('test'); // Original data preserved
      expect(enhanced.userPreferences).toEqual({ theme: 'dark' });
      expect(enhanced.recentEntities).toBeDefined();
      expect(enhanced.previousQueries).toEqual([{ queryId: 'q1', intent: 'intent1' }]);
    });
    
    it('should apply output formatting correctly', () => {
      // Test JSON formatting
      const jsonFormatted = service._applyOutputFormat('Line 1\n\nLine 2\n\nLine 3', 'json');
      expect(jsonFormatted).toContain('"section1"');
      expect(jsonFormatted).toContain('"section2"');
      expect(jsonFormatted).toContain('"section3"');
      
      // Test HTML formatting
      const htmlFormatted = service._applyOutputFormat('Line 1\n\nLine 2\n\nLine 3', 'html');
      expect(htmlFormatted).toContain('<div class="response">');
      expect(htmlFormatted).toContain('<section>Line 1</section>');
      
      // Test markdown formatting
      const markdownFormatted = service._applyOutputFormat('Line 1\n\nLine 2\n\nLine 3', 'markdown');
      expect(markdownFormatted).toContain('## Line 1');
      
      // Test list formatting
      const listText = 'Title\n\n- Item 1\n- Item 2';
      const listFormatted = service._applyOutputFormat(listText, 'html');
      expect(listFormatted).toContain('<li>Item 1');
    });
    
    it('should format speech output correctly', () => {
      const text = '**Bold** and *italic* text with [link](http://example.com) and #Header';
      const speech = service._formatForSpeech(text);
      
      expect(speech).toBe('Bold and italic text with link and Header');
      
      const htmlText = '<p>Paragraph with <b>bold</b> text</p>';
      const htmlSpeech = service._formatForSpeech(htmlText);
      
      expect(htmlSpeech).toBe('Paragraph with bold text');
    });
    
    it('should summarize evidence items correctly', () => {
      // String evidence
      expect(service._summarizeEvidenceItem('Plain text evidence')).toBe('Plain text evidence');
      
      // Object with summary
      expect(service._summarizeEvidenceItem({ summary: 'Summary text' })).toBe('Summary text');
      
      // Object with description
      expect(service._summarizeEvidenceItem({ description: 'Description' })).toBe('Description');
      
      // Object with both
      expect(service._summarizeEvidenceItem({ 
        description: 'Description', 
        summary: 'Summary' 
      })).toBe('Description: Summary');
      
      // Complex object
      expect(service._summarizeEvidenceItem({ 
        data: { complex: 'object' } 
      })).toBe('{"data":{"complex":"object"}}');
    });
  });
});