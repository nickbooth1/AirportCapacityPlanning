/**
 * RetrievalAugmentedGenerationService.js mock for testing
 */

class RetrievalAugmentedGenerationService {
  constructor() {
    this.knowledgeRetrievalService = {
      retrieveKnowledge: jest.fn().mockResolvedValue({
        facts: [
          { id: 1, content: 'Test fact 1', source: 'Mock Source' },
          { id: 2, content: 'Test fact 2', source: 'Mock Source' }
        ],
        contextual: [
          { id: 3, content: 'Test contextual 1', source: 'Mock Source' }
        ],
        sources: ['Mock Source']
      })
    };
  }

  async generateResponse(query, context, options) {
    return {
      text: 'This is a mock RAG response',
      confidence: 0.85,
      sources: ['Mock Source'],
      isFactChecked: options?.factCheck || false
    };
  }
}

module.exports = RetrievalAugmentedGenerationService;