/**
 * ReasoningExplainer.js mock for testing
 */

const ReasoningExplainer = {
  explainReasoning: jest.fn().mockResolvedValue(
    'This plan breaks down the complex question into manageable steps for systematic analysis.'
  ),
  
  explainStep: jest.fn().mockResolvedValue(
    'This step extracts key information from the query to guide further analysis.'
  )
};

module.exports = ReasoningExplainer;