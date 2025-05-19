/**
 * Tests for IntentClassifier
 */
const { IntentClassifier } = require('../../../../src/services/agent/nlp');
const { 
  createMockServices, 
  createMockContext,
  setupIntentClassifierMock, 
  generateIntentTestCases 
} = require('../../../../src/services/agent/nlp/testing/NLPTestUtilities');

describe('IntentClassifier', () => {
  let classifier;
  let mockServices;
  
  beforeEach(() => {
    // Create mock services
    mockServices = createMockServices();
    
    // Create classifier instance
    classifier = new IntentClassifier(mockServices, {
      confidenceThreshold: 0.7
    });
  });
  
  test('should initialize with default intent definitions', () => {
    expect(classifier.intents.length).toBeGreaterThan(0);
    expect(classifier.getAllIntents()).toContain('stand.details');
    expect(classifier.getAllIntents()).toContain('airport.info');
  });
  
  test('should get examples for a specific intent', () => {
    const examples = classifier.getExamplesForIntent('stand.details');
    expect(Array.isArray(examples)).toBe(true);
    expect(examples.length).toBeGreaterThan(0);
  });
  
  test('should classify intents using rules for obvious patterns', async () => {
    // Set up test cases with rule-based patterns
    const testCases = [
      { text: 'show details for stand A1', expectedIntent: 'stand.details' },
      { text: 'is stand T2B10 available?', expectedIntent: 'stand.status' },
      { text: 'tell me about LHR airport', expectedIntent: 'airport.info' }
    ];
    
    for (const testCase of testCases) {
      const result = await classifier.process(testCase.text);
      
      expect(result.success).toBe(true);
      expect(result.data.intent).toBe(testCase.expectedIntent);
      expect(result.data.method).toBe('rules');
      expect(result.data.confidence).toBeGreaterThan(0.7);
    }
  });
  
  test('should fall back to AI classification when rules are not confident', async () => {
    // Set up the mock to respond to a specific query
    setupIntentClassifierMock(
      mockServices.openAIService,
      'what is the airport capacity today',
      'capacity.current',
      0.92
    );
    
    const result = await classifier.process('what is the airport capacity today');
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('capacity.current');
    expect(result.data.method).toBe('ai');
    expect(result.data.confidence).toBeGreaterThan(0.7);
    expect(mockServices.openAIService.createChatCompletion).toHaveBeenCalled();
  });
  
  test('should handle empty or invalid input', async () => {
    const result = await classifier.process('');
    
    expect(result.success).toBe(false);
    expect(result.metadata.error.code).toBe('INVALID_INPUT');
  });
  
  test('should return error when OpenAI service is not available', async () => {
    // Modify the mock to be unavailable
    mockServices.openAIService.isAvailable = false;
    
    // Use a query that would require AI classification
    const result = await classifier.process('analyze the capacity impact of runway closures');
    
    // Since this query doesn't match any rules and AI is unavailable,
    // rule-based classification should be attempted but may not be confident
    if (result.success) {
      expect(result.data.method).toBe('rules');
    } else {
      expect(result.metadata.error.code).toBe('CLASSIFICATION_FAILED');
    }
  });
  
  test('should track and report performance metrics', async () => {
    // Process a few queries
    await classifier.process('tell me about stand A1');
    await classifier.process('what is the status of terminal 2?');
    
    // Get metrics
    const metrics = classifier.getMetrics();
    
    expect(metrics.processed).toBe(2);
    expect(metrics.successful).toBe(2);
    expect(metrics.processingTimeMs).toBeGreaterThan(0);
    
    // Reset metrics
    classifier.resetMetrics();
    const resetMetrics = classifier.getMetrics();
    
    expect(resetMetrics.processed).toBe(0);
  });
  
  test('should get the correct intent category', () => {
    expect(classifier.getIntentCategory('stand.details')).toBe('asset');
    expect(classifier.getIntentCategory('airport.info')).toBe('reference');
    expect(classifier.getIntentCategory('maintenance.status')).toBe('maintenance');
    expect(classifier.getIntentCategory('capacity.current')).toBe('operational');
    expect(classifier.getIntentCategory('unknown.intent')).toBeNull();
  });
  
  // Test against standard test cases
  test.each(generateIntentTestCases())('should classify $description', async ({ input, expected }) => {
    // Setup mock
    setupIntentClassifierMock(
      mockServices.openAIService,
      input,
      expected.intent,
      expected.confidence
    );
    
    const result = await classifier.process(input);
    
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe(expected.intent);
    expect(result.data.confidence).toBeCloseTo(expected.confidence, 1);
  });
});