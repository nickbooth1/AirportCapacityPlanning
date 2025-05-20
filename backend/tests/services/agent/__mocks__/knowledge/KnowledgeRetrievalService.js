const KnowledgeRetrievalService = jest.fn().mockImplementation(() => ({
  retrieveKnowledge: jest.fn().mockResolvedValue({
    facts: [
      { content: 'T1 has 20 stands in total.', source: 'airport-docs' },
      { content: 'Stand A12 is under maintenance until October 15th.', source: 'maintenance-records' }
    ],
    contextual: [
      { content: 'Maintenance affects terminal capacity by reducing available stands.', source: 'operations-manual' }
    ],
    sources: ['airport-docs', 'maintenance-records', 'operations-manual']
  }),
  determineRetrievalStrategy: jest.fn().mockImplementation((query) => {
    if (query.parsedQuery.intent === 'search') return 'vector';
    if (query.parsedQuery.intent === 'stand.details') return 'structured';
    return 'combined';
  }),
  retrieveStructured: jest.fn().mockResolvedValue({
    facts: [{ content: 'Structured data result', source: 'database' }]
  }),
  retrieveVectorSimilarity: jest.fn().mockResolvedValue({
    contextual: [{ content: 'Vector similarity result', source: 'vector-db' }]
  }),
  getMetrics: jest.fn().mockReturnValue({
    retrievalCount: 5,
    avgRetrievalTime: 0.2,
    cacheHitRate: 0.4
  }),
  resetMetrics: jest.fn()
}));

module.exports = KnowledgeRetrievalService;