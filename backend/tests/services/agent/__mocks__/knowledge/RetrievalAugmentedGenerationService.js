const RetrievalAugmentedGenerationService = jest.fn().mockImplementation(() => {
  // Mock knowledgeRetrievalService
  const knowledgeRetrievalService = {
    retrieveKnowledge: jest.fn().mockResolvedValue({
      facts: [
        { content: 'T1 has 20 stands in total.', source: 'airport-docs' },
        { content: 'Stand A12 is under maintenance until October 15th.', source: 'maintenance-records' }
      ],
      contextual: [
        { content: 'Maintenance affects terminal capacity by reducing available stands.', source: 'operations-manual' }
      ],
      sources: ['airport-docs', 'maintenance-records', 'operations-manual']
    })
  };

  // Return the mock service
  return {
    knowledgeRetrievalService,
    generateResponse: jest.fn().mockResolvedValue({
      text: "This is a RAG-generated response",
      confidence: 0.9,
      sources: ['airport-docs', 'maintenance-records'],
      isFactChecked: true
    }),
    initialize: jest.fn(),
    processQuery: jest.fn().mockResolvedValue({
      text: "Processed query response using RAG",
      sources: ['airport-docs']
    })
  };
});

module.exports = RetrievalAugmentedGenerationService;