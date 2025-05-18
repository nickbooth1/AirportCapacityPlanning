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
  })
};