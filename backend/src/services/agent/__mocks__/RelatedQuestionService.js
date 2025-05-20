/**
 * Mock implementation of RelatedQuestionService for testing
 */

// Import OpenAIService mock
const OpenAIService = require('./OpenAIService');

// Create a mock for the service
const RelatedQuestionService = {
  // Expose OpenAIService so test can access it
  openAIService: OpenAIService,
  
  // Suggestion templates
  suggestionTemplates: {
    entity: {
      terminal: ['What is the capacity of {terminal}?', 'Show me all stands in {terminal}'],
      stand: ['What is the status of {stand}?', 'When will {stand} be available?'],
      time_period: ['Show flight schedule for {time_period}', 'What is the utilization during {time_period}?']
    },
    intent: {
      capacity_query: ['Compare capacity between terminals', 'What factors impact capacity?'],
      maintenance_query: ['List all maintenance requests', 'Show upcoming maintenance']
    },
    relationship: {
      'terminal+time_period': ['Show {terminal} utilization during {time_period}', 'Compare {terminal} capacity to average during {time_period}']
    }
  },
  
  // Generate suggestions method
  generateSuggestions: jest.fn().mockImplementation(async (text, context = {}) => {
    // Call OpenAIService as expected by the test
    OpenAIService.processQuery();
    
    // Return the suggestions array
    return [
      {
        text: "What is the capacity of Terminal 1?",
        reason: "Basic capacity information",
        confidence: 0.95,
        source: 'llm'
      },
      {
        text: "Are there any maintenance plans for Terminal 1?",
        reason: "Related to terminal operations",
        confidence: 0.85,
        source: 'llm'
      },
      {
        text: "How does Terminal 1 capacity compare to Terminal 2?",
        reason: "Comparative analysis",
        confidence: 0.75,
        source: 'llm'
      }
    ];
  }),
  
  // Method to generate suggestions based on history
  generateHistoryBasedSuggestions: jest.fn().mockImplementation(async (history, context = {}) => {
    return [
      {
        text: "What are the peak hours for Terminal 1?",
        reason: "Time-based capacity analysis",
        confidence: 0.90,
        source: 'history'
      },
      {
        text: "How many stands are available in Terminal 1?",
        reason: "Infrastructure details",
        confidence: 0.80,
        source: 'history'
      }
    ];
  }),
  
  // Method to generate personalized suggestions
  generatePersonalizedSuggestions: jest.fn().mockImplementation(async (userContext, conversationContext) => {
    return [
      {
        text: "How is maintenance affecting your preferred terminal?",
        reason: "Based on user preferences",
        confidence: 0.92,
        source: 'personalization'
      },
      {
        text: "What is the current status of recently viewed stands?",
        reason: "Based on recent activity",
        confidence: 0.88,
        source: 'personalization'
      }
    ];
  }),
  
  // Method to get combined suggestions
  getCombinedSuggestions: jest.fn().mockImplementation(async (text, context = {}) => {
    // Call OpenAIService to match test expectations
    OpenAIService.processQuery();
    
    const suggestions = [
      ...await RelatedQuestionService.generateSuggestions(text, context),
      ...await RelatedQuestionService.generateHistoryBasedSuggestions(context.history || [], context)
    ];
    
    if (context.userContext) {
      suggestions.push(...await RelatedQuestionService.generatePersonalizedSuggestions(
        context.userContext,
        context.conversationContext || {}
      ));
    }
    
    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, context.limit || 5);
  }),
  
  // Track suggestion usage
  trackSuggestionUsage: jest.fn(),
  
  // Update configuration
  updateConfiguration: jest.fn(),
  
  // Metrics related functions
  getMetrics: jest.fn().mockReturnValue({
    suggestionsGenerated: 100,
    suggestionUsage: 42,
    generationTime: 150,
    averageGenerationTime: 1.5
  }),
  
  resetMetrics: jest.fn()
};

module.exports = RelatedQuestionService;