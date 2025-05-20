/**
 * Manual mock for OpenAIService
 */

const mockOpenAIService = {
  processQuery: jest.fn().mockResolvedValue({
    text: JSON.stringify({
      primaryIssue: "intent",
      explanation: "The intent seems to be misunderstood.",
      suggestedCorrection: "find.airport"
    })
  })
};

module.exports = mockOpenAIService;