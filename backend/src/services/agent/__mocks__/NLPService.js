/**
 * Mock NLP Service for testing
 */

module.exports = {
  /**
   * Process a text query to extract intent and entities
   */
  processQuery: jest.fn(async (text) => {
    // Default mock implementation
    return {
      intent: 'show_utilization_forecast',
      confidence: 0.95,
      entities: {
        terminal: 'Terminal 2',
        date: '2024-06-18',
        time_range: 'all_day'
      }
    };
  }),

  /**
   * Generate a response based on intent, entities, and context
   */
  generateResponse: jest.fn(async (intent, entities, context) => {
    return {
      responseText: `Here is the ${intent} for ${entities.terminal || 'the airport'}.`,
      suggestedActions: [
        {
          type: 'show_visualization',
          parameters: {
            visualizationType: intent,
            terminal: entities.terminal,
            date: entities.date
          }
        }
      ]
    };
  }),

  /**
   * Extract key information from text
   */
  extractInformation: jest.fn(async (text) => {
    return {
      keywords: ['capacity', 'forecast', 'terminal'],
      summary: 'Request for capacity information',
      sentiment: 'neutral'
    };
  }),
  
  /**
   * Extract parameters from scenario description
   */
  extractParametersFromDescription: jest.fn().mockResolvedValue({
    terminal: 'Terminal 2',
    standType: 'wide_body',
    count: 3
  }),
  
  /**
   * Identify intent from text
   */
  identifyIntent: jest.fn().mockResolvedValue({
    intent: 'what_if_scenario',
    confidence: 0.9
  }),
  
  /**
   * Extract entities from text
   */
  extractEntities: jest.fn().mockResolvedValue([
    { type: 'terminal', value: 'Terminal 2', confidence: 0.95 },
    { type: 'stand_type', value: 'wide_body', confidence: 0.85 },
    { type: 'count', value: '3', confidence: 0.9 }
  ]),
  
  /**
   * Analyze text for sentiment and keywords
   */
  analyzeText: jest.fn().mockResolvedValue({
    sentiment: 'neutral',
    keywords: ['capacity', 'terminal', 'wide body']
  }),
  
  /**
   * Extract parameters from query
   */
  extractParametersFromQuery: jest.fn().mockResolvedValue({
    action: 'create',
    entityType: 'scenario',
    parameters: {
      terminal: 'Terminal 2',
      standType: 'wide_body',
      count: 3
    }
  })
};