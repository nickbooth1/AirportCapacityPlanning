/**
 * Live test file for OpenAIService using actual API key
 * Only runs when OPENAI_API_KEY is available in environment
 */

// Import required modules
const OpenAIService = require('../../../src/services/agent/OpenAIService');

// Only run tests if API key is available
const runLiveTests = process.env.OPENAI_API_KEY && process.env.RUN_LIVE_OPENAI_TESTS === 'true';

// Conditionally run tests
(runLiveTests ? describe : describe.skip)('OpenAIService Live Tests', () => {
  beforeEach(() => {
    // Reset token usage before each test
    OpenAIService.resetTokenUsage();
  });

  it('should extract parameters from natural language using the actual API', async () => {
    // Skip this test if no API key
    if (!runLiveTests) {
      return console.log('Skipping live OpenAI test - no API key or not enabled');
    }
    
    // Call the method with actual API
    const result = await OpenAIService.extractParameters('Add 3 wide-body stands to Terminal 1');
    
    // Verify results
    expect(result.parameters).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    
    // Log the actual API response for debugging
    console.log('Live API Response:', JSON.stringify(result, null, 2));
  }, 30000); // Increase timeout for API call

  it('should process a query using the actual API', async () => {
    // Skip this test if no API key
    if (!runLiveTests) {
      return console.log('Skipping live OpenAI test - no API key or not enabled');
    }
    
    // Call the method with actual API
    const result = await OpenAIService.processQuery(
      'What would happen to capacity if we added 5 more stands?',
      [],
      'You are an AI assistant helping with airport capacity planning.'
    );
    
    // Verify results
    expect(result.text).toBeDefined();
    expect(result.usage).toBeDefined();
    
    // Log the actual API response for debugging
    console.log('Live API Response Text:', result.text);
    console.log('Live API Token Usage:', result.usage);
  }, 30000); // Increase timeout for API call

  it('should track token usage correctly with actual API', async () => {
    // Skip this test if no API key
    if (!runLiveTests) {
      return console.log('Skipping live OpenAI test - no API key or not enabled');
    }
    
    // Initial usage should be zero
    expect(OpenAIService.getTokenUsage().total).toBe(0);
    
    // Call the API
    await OpenAIService.extractParameters('Test query for token usage tracking');
    
    // Verify token usage was tracked
    expect(OpenAIService.getTokenUsage().prompt).toBeGreaterThan(0);
    expect(OpenAIService.getTokenUsage().completion).toBeGreaterThan(0);
    expect(OpenAIService.getTokenUsage().total).toBeGreaterThan(0);
    
    // Log the actual token usage
    console.log('Live Token Usage:', OpenAIService.getTokenUsage());
  }, 30000); // Increase timeout for API call
});