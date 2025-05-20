/**
 * Mock implementation of MultiStepReasoningService for testing
 */

const MultiStepReasoningService = jest.fn().mockImplementation((services = {}, options = {}) => {
  return {
    executeQuery: jest.fn().mockResolvedValue({
      success: true,
      answer: "After careful analysis, the answer is...",
      confidence: 0.9,
      reasoning: [
        { stepNumber: 1, description: "First step", explanation: "First step explanation" },
        { stepNumber: 2, description: "Second step", explanation: "Second step explanation" }
      ],
      evidence: [
        { source: "Document 1", content: "Evidence 1" },
        { source: "Document 2", content: "Evidence 2" }
      ],
      knowledgeSources: ["Document 1", "Document 2"],
      executionTime: 1.5
    }),
    
    planQuerySteps: jest.fn().mockResolvedValue({
      queryId: "query-123",
      originalQuery: "What is the status of Terminal 1?",
      steps: [
        {
          stepId: "step-1",
          stepNumber: 1,
          description: "Retrieve information about Terminal 1",
          type: "knowledge_retrieval"
        },
        {
          stepId: "step-2",
          stepNumber: 2,
          description: "Calculate current capacity",
          type: "calculation",
          dependsOn: ["step-1"]
        }
      ],
      totalSteps: 2,
      estimatedTotalTime: 3.5,
      confidence: 0.85
    }),
    
    executeStepSequence: jest.fn().mockResolvedValue({
      queryId: "query-123",
      originalQuery: "What is the status of Terminal 1?",
      stepResults: [
        {
          stepId: "step-1",
          stepNumber: 1,
          result: {
            facts: [{ content: "Terminal 1 has 20 stands" }],
            contextual: [{ content: "Terminal status is updated daily" }]
          },
          explanation: "Retrieved information about Terminal 1",
          success: true,
          executionTime: 0.8
        },
        {
          stepId: "step-2",
          stepNumber: 2,
          result: { calculationResult: "15 stands available (75% capacity)" },
          explanation: "Calculated available stands and capacity percentage",
          success: true,
          executionTime: 0.5
        }
      ],
      explanations: [
        {
          stepNumber: 1,
          description: "Retrieve information about Terminal 1",
          explanation: "Retrieved information about Terminal 1",
          success: true
        },
        {
          stepNumber: 2,
          description: "Calculate current capacity",
          explanation: "Calculated available stands and capacity percentage",
          success: true
        }
      ],
      stepExecutionSummary: "This reasoning process retrieves terminal information and calculates capacity",
      finalAnswer: {
        answer: "Terminal 1 currently has 15 stands available (75% capacity)",
        confidence: 0.9,
        reasoningProcess: [{description: "Step 1"}, {description: "Step 2"}]
      },
      executionTime: 1.3,
      success: true
    }),
    
    getMetrics: jest.fn().mockReturnValue({
      queryCount: 10,
      averageSteps: 2.5,
      averageExecutionTime: 1.2,
      successRate: 0.95
    }),
    
    resetMetrics: jest.fn()
  };
});

module.exports = MultiStepReasoningService;