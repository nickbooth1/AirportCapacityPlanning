/**
 * Mock implementation of ReasoningExplainer for testing
 */

const ReasoningExplainer = {
  explainReasoning: jest.fn().mockResolvedValue(
    "This is a multi-step approach to solve the problem by breaking it down into logical steps."
  ),
  
  explainStep: jest.fn().mockResolvedValue(
    "This step involves analyzing the available data to determine the most relevant information."
  ),
  
  generateVisualization: jest.fn().mockResolvedValue({
    type: "flowchart",
    nodes: [
      { id: "1", label: "Start" },
      { id: "2", label: "Process Data" },
      { id: "3", label: "Generate Result" }
    ],
    edges: [
      { from: "1", to: "2" },
      { from: "2", to: "3" }
    ]
  }),
  
  formatReasoningOutput: jest.fn().mockImplementation((reasoning) => {
    return {
      summary: "Reasoning summary",
      steps: reasoning ? reasoning : [
        { stepNumber: 1, description: "First step", explanation: "First step explanation" },
        { stepNumber: 2, description: "Second step", explanation: "Second step explanation" }
      ],
      confidence: 0.85
    };
  })
};

module.exports = ReasoningExplainer;