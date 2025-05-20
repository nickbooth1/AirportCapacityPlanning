/**
 * Mock implementation of OpenAIService for testing
 */

// Create mock
const OpenAIService = {
  processQuery: jest.fn().mockResolvedValue({
    text: `[
      {"question": "What is the capacity of Terminal 1?", "reason": "Basic capacity information"},
      {"question": "Are there any maintenance plans for Terminal 1?", "reason": "Related to terminal operations"},
      {"question": "How does Terminal 1 capacity compare to Terminal 2?", "reason": "Comparative analysis"}
    ]`,
    usage: { total_tokens: 150 }
  }),
  
  generateResponse: jest.fn().mockResolvedValue({
    text: 'Generated response with intent',
    suggestedActions: [{ text: 'Action 1' }]
  }),
  
  generateContent: jest.fn().mockResolvedValue({
    fields: {
      additional_details: 'Additional details about the query.',
      impact: 'Generated impact assessment.',
      details: 'Generated detailed information.'
    }
  }),
  
  generateChartDescription: jest.fn().mockResolvedValue({
    main: 'Chart showing capacity trends',
    insight: 'Peak capacity occurs at 10am',
    highlight: 'Terminal 1 has highest utilization'
  }),
  
  generateEmbeddings: jest.fn().mockResolvedValue({
    embeddings: Array(1536).fill(0).map((_, i) => (Math.sin(i) + 1) / Math.sqrt(1536)),
    usage: { total_tokens: 100 }
  }),
  
  performMultiStepReasoning: jest.fn().mockResolvedValue({
    steps: [
      { description: "Step 1: Analyze the query" },
      { description: "Step 2: Retrieve relevant information" },
      { description: "Step 3: Calculate results" }
    ],
    confidence: 0.85
  })
};

module.exports = OpenAIService;