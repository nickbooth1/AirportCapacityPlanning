const ResponseGeneratorService = jest.fn().mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  generateResponse: jest.fn().mockResolvedValue({
    response: "This is a mock response from the agent",
    citations: [],
    followUpQuestions: []
  }),
  generateResponseWithStructuredData: jest.fn().mockResolvedValue({
    response: "This is a mock response with structured data",
    structuredData: {
      type: "analysis",
      content: { key: "value" }
    },
    citations: [],
    followUpQuestions: []
  }),
  generateErrorResponse: jest.fn().mockReturnValue({
    response: "I'm sorry, I encountered an error processing your request.",
    citations: [],
    followUpQuestions: []
  }),
  setReasoningService: jest.fn()
}));

module.exports = ResponseGeneratorService;