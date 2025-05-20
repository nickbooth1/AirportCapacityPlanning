const EnhancedAgentQueryProcessor = jest.fn().mockImplementation(() => ({
  processQuery: jest.fn().mockImplementation(async (query, context) => {
    // Always return a successful result with some sensible defaults
    return {
      success: true,
      parsedQuery: {
        intent: query.toLowerCase().includes('capacity') ? 'capacity_query' : 
                query.toLowerCase().includes('maintenance') ? 'maintenance_query' : 
                query.toLowerCase().includes('stand') ? 'stand_status_query' : 'generic_query',
        entities: {
          terminal: query.toLowerCase().includes('terminal 1') || query.toLowerCase().includes('t1') ? 'Terminal 1' : undefined,
          stand: query.toLowerCase().includes('a12') ? 'Stand A12' : 
                query.toLowerCase().includes('b05') ? 'Stand B05' : undefined,
          time_period: query.toLowerCase().includes('next week') ? 'next week' : undefined
        },
        confidence: { intent: 0.9 }
      },
      response: {
        text: `Response for query: ${query}`,
        suggestedActions: []
      },
      handlerUsed: query.toLowerCase().includes('impact') || query.toLowerCase().includes('analysis') ? 
                   'MultiStepReasoningService' : 'StandardHandler'
    };
  }),
  registerQueryHandler: jest.fn(),
  initialize: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    totalQueries: 10,
    averageProcessingTime: 0.3
  })
}));

module.exports = EnhancedAgentQueryProcessor;