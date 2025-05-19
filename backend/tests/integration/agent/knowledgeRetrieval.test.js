/**
 * Integration tests for knowledge retrieval components
 * 
 * These tests verify the integration between various knowledge retrieval components:
 * - KnowledgeRetrievalService
 * - RetrievalAugmentedGenerationService
 * - WorkingMemoryService
 * - MultiStepReasoningService
 * - ResponseGeneratorService
 * 
 * Test ID: 1.5.4.1
 */

const KnowledgeRetrievalService = require('../../../src/services/agent/knowledge/KnowledgeRetrievalService');
const RetrievalAugmentedGenerationService = require('../../../src/services/agent/knowledge/RetrievalAugmentedGenerationService');
const WorkingMemoryService = require('../../../src/services/agent/WorkingMemoryService');
const MultiStepReasoningService = require('../../../src/services/agent/MultiStepReasoningService');
const ResponseGeneratorService = require('../../../src/services/agent/ResponseGeneratorService');

// Mock the OpenAI service for deterministic testing
jest.mock('../../../src/services/agent/OpenAIService', () => ({
  processQuery: jest.fn().mockResolvedValue({
    text: 'Processed query response',
    usage: { total_tokens: 250 }
  }),
  generateResponse: jest.fn().mockImplementation((query, intent, data) => {
    return Promise.resolve({
      text: `Response about ${Object.keys(data.entities || {}).join(', ')}`,
      suggestedActions: []
    });
  }),
  generateContent: jest.fn().mockResolvedValue({
    fields: {
      additional_details: 'Generated details about the query.',
      impact: 'Generated impact assessment.',
      details: 'Generated detailed information.'
    }
  })
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock vector search for knowledge retrieval
jest.mock('../../../src/services/agent/VectorSearchService', () => {
  return function() {
    return {
      searchSimilarContent: jest.fn().mockResolvedValue([
        { content: 'T1 has 20 stands in total.', source: 'airport-docs', similarity: 0.92 },
        { content: 'Stand A12 is under maintenance until October 15th.', source: 'maintenance-records', similarity: 0.87 }
      ]),
      getMetrics: jest.fn().mockReturnValue({})
    };
  };
});

// Prepare test data
const testData = {
  stands: [
    { id: 'A12', name: 'A12', terminal: 'T1', status: 'maintenance', type: 'Remote' },
    { id: 'B05', name: 'B05', terminal: 'T1', status: 'active', type: 'Contact' }
  ],
  terminals: [
    { id: 'T1', name: 'Terminal 1', capacity: 42 },
    { id: 'T2', name: 'Terminal 2', capacity: 35 }
  ],
  maintenanceRequests: [
    { 
      id: 'MR001', 
      standId: 'A12', 
      startDate: '2023-10-01', 
      endDate: '2023-10-15',
      reason: 'Surface repair',
      status: 'in_progress'
    }
  ]
};

// Test stand data service
const mockStandDataService = {
  getStandById: jest.fn().mockImplementation(id => {
    return Promise.resolve(testData.stands.find(s => s.id === id));
  }),
  getStands: jest.fn().mockImplementation(filter => {
    let stands = [...testData.stands];
    if (filter?.terminal) {
      stands = stands.filter(s => s.terminal === filter.terminal);
    }
    return Promise.resolve(stands);
  }),
  getStandsWithMaintenanceStatus: jest.fn().mockImplementation(filter => {
    const stands = testData.stands.filter(s => 
      !filter.standId || s.id === filter.standId
    );
    
    return Promise.resolve(stands.map(stand => ({
      ...stand,
      maintenanceStatus: stand.status === 'maintenance' ? 'under_maintenance' : 'operational',
      maintenanceInfo: stand.status === 'maintenance' ? 
        testData.maintenanceRequests.find(mr => mr.standId === stand.id) : null
    })));
  })
};

// Test reference data service
const mockReferenceDataService = {
  getAirportByIATA: jest.fn().mockResolvedValue({ 
    iata: 'ABC', 
    name: 'Test Airport',
    city: 'Test City',
    country: 'Test Country' 
  }),
  getTerminalById: jest.fn().mockImplementation(id => {
    return Promise.resolve(testData.terminals.find(t => t.id === id));
  })
};

// Test maintenance data service
const mockMaintenanceDataService = {
  getMaintenanceRequests: jest.fn().mockImplementation(filter => {
    let requests = [...testData.maintenanceRequests];
    if (filter?.standId) {
      requests = requests.filter(r => r.standId === filter.standId);
    }
    if (filter?.status) {
      requests = requests.filter(r => r.status === filter.status);
    }
    return Promise.resolve(requests);
  })
};

describe('Knowledge Retrieval Integration Tests (1.5.4.1)', () => {
  let workingMemoryService;
  let knowledgeRetrievalService;
  let ragService;
  let multiStepReasoningService;
  let responseGeneratorService;
  
  beforeAll(() => {
    // Create fresh instances for integration testing
    workingMemoryService = new WorkingMemoryService({
      maxEntityHistorySize: 10,
      maxKnowledgeItemsPerQuery: 10
    });
    
    knowledgeRetrievalService = new KnowledgeRetrievalService({
      standDataService: mockStandDataService,
      referenceDataService: mockReferenceDataService,
      maintenanceDataService: mockMaintenanceDataService,
      workingMemoryService
    });
    
    ragService = new RetrievalAugmentedGenerationService({
      knowledgeRetrievalService,
      workingMemoryService
    });
    
    multiStepReasoningService = new MultiStepReasoningService({
      workingMemoryService,
      ragService
    });
    
    // Use the singleton but replace its dependencies
    responseGeneratorService = ResponseGeneratorService;
    responseGeneratorService.workingMemoryService = workingMemoryService;
    responseGeneratorService.multiStepReasoningService = multiStepReasoningService;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('End-to-end knowledge retrieval flow', () => {
    it('should retrieve knowledge, generate response, and store in memory', async () => {
      // Create a session and query ID for the test
      const sessionId = `test-session-${Date.now()}`;
      const queryId = `test-query-${Date.now()}`;
      
      // 1. Start with a user query
      const query = {
        text: 'What is the status of stand A12?',
        parsedQuery: {
          intent: 'stand.status',
          entities: { stand: 'A12' },
          confidence: { intent: 0.9, stand: 0.95 }
        },
        queryId
      };
      
      // 2. First retrieve knowledge about the stand
      const knowledgeResult = await knowledgeRetrievalService.retrieveKnowledge(
        query,
        { sessionId }
      );
      
      // Verify knowledge was retrieved
      expect(knowledgeResult.facts.length).toBeGreaterThan(0);
      expect(mockStandDataService.getStandsWithMaintenanceStatus).toHaveBeenCalled();
      
      // Verify the knowledge was stored in working memory
      const storedKnowledge = await workingMemoryService.getRetrievedKnowledge(sessionId, queryId);
      expect(storedKnowledge).toBeTruthy();
      expect(storedKnowledge.items).toBeTruthy();
      
      // 3. Generate a response using the RAG service
      const ragResponse = await ragService.generateResponse(
        query,
        { sessionId }
      );
      
      // Verify RAG response
      expect(ragResponse.text).toBeTruthy();
      expect(ragResponse.sources).toBeTruthy();
      
      // 4. Store entities in working memory
      await workingMemoryService.storeEntityMentions(
        sessionId,
        queryId,
        [{ type: 'stand', value: 'A12', confidence: 0.95 }]
      );
      
      // Verify entities were stored
      const entities = await workingMemoryService.getEntityMentions(sessionId);
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('stand');
      expect(entities[0].value).toBe('A12');
      
      // 5. Generate a final response using ResponseGeneratorService
      const finalResponse = await responseGeneratorService.generateResponse({
        intent: 'stand_status_query',
        entities: { stand: 'A12' },
        data: { 
          status: 'under maintenance', 
          reason: 'Surface repair',
          time: 'October 15th, 2023'
        },
        query: query.text,
        options: {
          sessionId,
          queryId
        }
      });
      
      // Verify final response
      expect(finalResponse.text).toContain('A12');
      expect(finalResponse.text).toContain('maintenance');
      
      // Verify response was stored in working memory
      const finalResult = await workingMemoryService.getFinalResult(sessionId, queryId);
      expect(finalResult).toBeTruthy();
      expect(finalResult.response).toBe(finalResponse.text);
      
      // 6. Retrieve context for a follow-up query
      const followupContext = await workingMemoryService.getContextForFollowUp(sessionId, queryId);
      
      // Verify context contains the query information
      expect(followupContext.queryInfo).toBeTruthy();
      expect(followupContext.queryInfo.result).toBeTruthy();
    });
    
    it('should enhance reasoning with retrieved knowledge', async () => {
      // Create a session and query ID for the test
      const sessionId = `test-session-${Date.now()}`;
      const queryId = `test-query-${Date.now()}`;
      
      // 1. Set up a complex query requiring reasoning
      const query = {
        text: 'What would be the impact of extending the maintenance on stand A12 by one week?',
        parsedQuery: {
          intent: 'impact_analysis',
          entities: { stand: 'A12' },
          confidence: { intent: 0.85, stand: 0.9 }
        },
        queryId
      };
      
      // 2. First retrieve knowledge
      const knowledgeResult = await knowledgeRetrievalService.retrieveKnowledge(
        query,
        { sessionId }
      );
      
      // Verify knowledge retrieved
      expect(knowledgeResult.facts.length).toBeGreaterThan(0);
      expect(knowledgeResult.contextual.length).toBeGreaterThan(0);
      
      // 3. Execute multi-step reasoning with the query
      const reasoningResult = await multiStepReasoningService.executeQuery(
        query.text,
        {
          sessionId,
          queryId,
          intent: query.parsedQuery.intent,
          entities: query.parsedQuery.entities
        }
      );
      
      // Verify reasoning succeeded
      expect(reasoningResult.success).toBeTruthy();
      expect(reasoningResult.answer).toBeTruthy();
      
      // 4. Generate a response incorporating the reasoning
      const response = await responseGeneratorService.generateResponse({
        intent: 'impact_analysis',
        entities: { stand: 'A12' },
        data: {},
        query: query.text,
        options: {
          sessionId,
          queryId,
          useReasoning: true
        }
      });
      
      // Verify response contains reasoning results
      expect(response.reasoning).toBeTruthy();
      expect(response.text).toBeTruthy();
      
      // 5. Store the response
      const storeResult = await responseGeneratorService.storeResponseInMemory(
        sessionId,
        queryId,
        response.text,
        {
          intent: 'impact_analysis',
          entities: { stand: 'A12' },
          reasoning: response.reasoning
        }
      );
      
      expect(storeResult).toBeTruthy();
      
      // 6. Verify the response is stored and can be retrieved
      const storedResult = await workingMemoryService.getFinalResult(sessionId, queryId);
      expect(storedResult).toBeTruthy();
      expect(storedResult.response).toBe(response.text);
      expect(storedResult.metadata.reasoning).toBeTruthy();
    });
    
    it('should support personalized responses based on user context', async () => {
      // Create a session and query ID for the test
      const sessionId = `test-session-${Date.now()}`;
      const queryId = `test-query-${Date.now()}`;
      
      // 1. Set up user preferences in session context
      await workingMemoryService.storeSessionContext(
        sessionId,
        {
          userPreferences: {
            preferredTerminal: 'T1',
            detailLevel: 'detailed',
            notificationSettings: { maintenance: true }
          },
          user: {
            role: 'Operations Manager',
            department: 'Ground Operations'
          }
        }
      );
      
      // 2. Store some entity mentions
      await workingMemoryService.storeEntityMentions(
        sessionId,
        'previous-query',
        [
          { type: 'terminal', value: 'T1', confidence: 0.9 },
          { type: 'stand', value: 'A12', confidence: 0.8 }
        ]
      );
      
      // 3. Set up a query
      const query = {
        text: 'Show me the current status of stands',
        parsedQuery: {
          intent: 'stand.status_summary',
          entities: {},
          confidence: { intent: 0.87 }
        },
        queryId
      };
      
      // 4. Retrieve knowledge
      await knowledgeRetrievalService.retrieveKnowledge(
        query,
        { sessionId }
      );
      
      // 5. Get context for response generation
      const context = await responseGeneratorService.getContextForResponse(
        sessionId,
        queryId
      );
      
      // Verify context contains user preferences
      expect(context.sessionContext).toBeTruthy();
      expect(context.sessionContext.userPreferences).toBeTruthy();
      expect(context.sessionContext.userPreferences.preferredTerminal).toBe('T1');
      
      // Verify recent entities are included
      expect(context.recentEntities).toBeTruthy();
      expect(context.recentEntities.length).toBeGreaterThan(0);
      expect(context.recentEntities[0].type).toBe('terminal');
      expect(context.recentEntities[0].value).toBe('T1');
      
      // 6. Generate a personalized response
      const response = await responseGeneratorService.generateResponse({
        intent: 'stand_status_query',
        entities: {}, // No explicit entities
        data: { 
          stands: testData.stands
        },
        query: query.text,
        options: {
          sessionId,
          queryId,
          enablePersonalization: true
        }
      });
      
      // Since no specific stand was mentioned in the query, but T1 is the preferred terminal 
      // and A12 was recently mentioned, the response should be personalized to include those
      expect(response.text).toBeTruthy();
      
      // 7. Verify the LLM was called with personalization instructions
      const OpenAIService = require('../../../src/services/agent/OpenAIService');
      expect(OpenAIService.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          entities: expect.any(Object),
          // This will be included because context was extracted
          // and passed to the LLM
        })
      );
    });
    
    it('should integrate knowledge into multi-step reasoning', async () => {
      // Create a session and query ID for the test
      const sessionId = `test-session-${Date.now()}`;
      const queryId = `test-query-${Date.now()}`;
      
      // Set up a complex query that needs knowledge and reasoning
      const query = {
        text: 'Compare the impact of maintenance on stands A12 and B05 on overall terminal capacity',
        parsedQuery: {
          intent: 'comparison',
          entities: { stand1: 'A12', stand2: 'B05' },
          confidence: { intent: 0.92, stand1: 0.95, stand2: 0.94 }
        },
        queryId
      };
      
      // 1. Retrieve knowledge for comparison
      await knowledgeRetrievalService.retrieveKnowledge(
        {
          text: 'Maintenance impact stand A12',
          queryId: `${queryId}-a12`,
          parsedQuery: { 
            intent: 'maintenance.impact',
            entities: { stand: 'A12' } 
          }
        },
        { sessionId }
      );
      
      await knowledgeRetrievalService.retrieveKnowledge(
        {
          text: 'Maintenance impact stand B05',
          queryId: `${queryId}-b05`,
          parsedQuery: { 
            intent: 'maintenance.impact',
            entities: { stand: 'B05' } 
          }
        },
        { sessionId }
      );
      
      // 2. Execute reasoning that should include knowledge retrieval
      const result = await multiStepReasoningService.executeQuery(
        query.text,
        {
          sessionId,
          queryId,
          intent: query.parsedQuery.intent,
          entities: query.parsedQuery.entities
        },
        {
          includeKnowledgeSteps: true
        }
      );
      
      // Verify reasoning succeeded and produced an answer
      expect(result.success).toBeTruthy();
      expect(result.answer).toBeTruthy();
      
      // 3. Generate a final response with reasoning
      const response = await responseGeneratorService.generateResponse({
        intent: 'comparison',
        entities: { entity1: 'A12', entity2: 'B05' },
        data: {
          comparison_result: 'Maintenance on A12 has more impact than B05',
          key_difference: 'A12 is a remote stand while B05 is a contact stand'
        },
        query: query.text,
        options: {
          sessionId,
          queryId,
          useReasoning: true
        }
      });
      
      // Verify response format
      expect(response.text).toBeTruthy();
      expect(response.text).toContain('A12');
      expect(response.text).toContain('B05');
      expect(response.reasoning).toBeTruthy();
    });
    
    it('should format responses according to requested output format', async () => {
      // Create a session and query ID for the test
      const sessionId = `test-session-${Date.now()}`;
      const queryId = `test-query-${Date.now()}`;
      
      // Set up a query
      const query = {
        text: 'List all stands in Terminal 1',
        parsedQuery: {
          intent: 'infrastructure_query',
          entities: { terminal: 'T1', entity_type: 'stands' },
          confidence: { intent: 0.9, terminal: 0.95 }
        },
        queryId
      };
      
      // Retrieve knowledge
      await knowledgeRetrievalService.retrieveKnowledge(
        query,
        { sessionId }
      );
      
      // Generate response in different formats
      const formats = ['text', 'json', 'html', 'markdown'];
      
      for (const format of formats) {
        const response = await responseGeneratorService.generateResponse({
          intent: 'infrastructure_query',
          entities: { terminal: 'T1' },
          data: { 
            count: 2,
            details: 'Terminal 1 has 2 stands: A12 (Remote) and B05 (Contact).'
          },
          query: query.text,
          options: {
            sessionId,
            queryId: `${queryId}-${format}`,
            format
          }
        });
        
        expect(response.text).toBeTruthy();
        
        // Check format-specific characteristics
        if (format === 'json') {
          expect(response.text.startsWith('{')).toBeTruthy();
          expect(response.text.endsWith('}')).toBeTruthy();
          
          // Should be valid JSON
          expect(() => JSON.parse(response.text)).not.toThrow();
        }
        
        if (format === 'html') {
          expect(response.text).toContain('<div');
          expect(response.text).toContain('</div>');
          expect(response.text).toContain('<section>');
        }
        
        if (format === 'markdown') {
          expect(response.text).toContain('## ');
        }
      }
    });
  });
  
  describe('Knowledge retrieval strategy tests', () => {
    it('should use structured retrieval for specific intents', async () => {
      const specificQuery = {
        text: 'Tell me about stand A12',
        parsedQuery: {
          intent: 'stand.details',
          entities: { stand: 'A12' },
          confidence: { intent: 0.92 }
        }
      };
      
      const strategy = knowledgeRetrievalService.determineRetrievalStrategy(
        specificQuery,
        { retrievalContext: {} }
      );
      
      expect(strategy).toBe('structured');
      
      const result = await knowledgeRetrievalService.retrieveKnowledge(
        specificQuery,
        { sessionId: 'test-strategy' }
      );
      
      expect(result.facts.length).toBeGreaterThan(0);
      expect(mockStandDataService.getStandById).toHaveBeenCalledWith('A12');
    });
    
    it('should use vector retrieval for similarity queries', async () => {
      const similarityQuery = {
        text: 'Find similar information about maintenance procedures',
        parsedQuery: {
          intent: 'search',
          entities: { topic: 'maintenance procedures' }
        }
      };
      
      const strategy = knowledgeRetrievalService.determineRetrievalStrategy(
        similarityQuery,
        { retrievalContext: {} }
      );
      
      expect(strategy).toBe('vector');
      
      const result = await knowledgeRetrievalService.retrieveKnowledge(
        similarityQuery,
        { sessionId: 'test-strategy' }
      );
      
      expect(result.contextual.length).toBeGreaterThan(0);
    });
    
    it('should use combined retrieval for complex queries', async () => {
      const complexQuery = {
        text: 'What maintenance is scheduled for terminal T1 stands next week?',
        parsedQuery: {
          intent: 'maintenance.schedule',
          entities: { terminal: 'T1', time_period: 'next week' },
          confidence: { intent: 0.87 }
        }
      };
      
      const strategy = knowledgeRetrievalService.determineRetrievalStrategy(
        complexQuery,
        { 
          retrievalContext: {
            retrievalHistory: [{ queryId: 'prev', timestamp: Date.now() }]
          }
        }
      );
      
      expect(strategy).toBe('combined');
      
      const result = await knowledgeRetrievalService.retrieveKnowledge(
        complexQuery,
        { sessionId: 'test-strategy' }
      );
      
      // Should have both structured and vector results
      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.contextual.length).toBeGreaterThan(0);
    });
  });
  
  describe('Working memory persistence tests', () => {
    it('should store and retrieve entities across multiple queries', async () => {
      const sessionId = `test-memory-${Date.now()}`;
      
      // Store entities from first query
      await workingMemoryService.storeEntityMentions(
        sessionId,
        'query1',
        [
          { type: 'terminal', value: 'T1', confidence: 0.9 },
          { type: 'stand', value: 'A12', confidence: 0.85 }
        ]
      );
      
      // Store entities from second query
      await workingMemoryService.storeEntityMentions(
        sessionId,
        'query2',
        [
          { type: 'time_period', value: 'next week', confidence: 0.82 },
          { type: 'stand', value: 'B05', confidence: 0.91 }
        ]
      );
      
      // Retrieve all entities
      const allEntities = await workingMemoryService.getEntityMentions(sessionId);
      
      // Should have all entities from both queries
      expect(allEntities.length).toBe(4);
      
      // Retrieve only stand entities
      const standEntities = await workingMemoryService.getEntityMentions(sessionId, {
        entityType: 'stand'
      });
      
      expect(standEntities.length).toBe(2);
      expect(standEntities.map(e => e.value)).toContain('A12');
      expect(standEntities.map(e => e.value)).toContain('B05');
      
      // Get latest stand entity (should be B05 since it was from query2)
      const latestStand = await workingMemoryService.getLatestEntityOfType(
        sessionId,
        'stand'
      );
      
      expect(latestStand.value).toBe('B05');
    });
    
    it('should maintain knowledge retrieval context across queries', async () => {
      const sessionId = `test-knowledge-${Date.now()}`;
      
      // First query and knowledge retrieval
      const query1 = {
        text: 'What is the status of Terminal 1?',
        parsedQuery: {
          intent: 'terminal.status',
          entities: { terminal: 'T1' }
        },
        queryId: 'q1'
      };
      
      await knowledgeRetrievalService.retrieveKnowledge(
        query1,
        { sessionId }
      );
      
      // Second query and knowledge retrieval
      const query2 = {
        text: 'What stands are available?',
        parsedQuery: {
          intent: 'stand.availability',
          entities: {}
        },
        queryId: 'q2'
      };
      
      await knowledgeRetrievalService.retrieveKnowledge(
        query2,
        { sessionId }
      );
      
      // Get knowledge retrieval context for a third query
      const retrievalContext = await workingMemoryService.getKnowledgeRetrievalContext(
        sessionId,
        'q3'
      );
      
      expect(retrievalContext).toBeTruthy();
      expect(retrievalContext.retrievalHistory).toBeTruthy();
      expect(retrievalContext.retrievalHistory.length).toBe(2);
      expect(retrievalContext.retrievalHistory[0].queryId).toBe('q2');
      expect(retrievalContext.retrievalHistory[1].queryId).toBe('q1');
      
      // Should have prior knowledge
      expect(retrievalContext.priorKnowledge).toBeTruthy();
      expect(Object.keys(retrievalContext.priorKnowledge).length).toBe(2);
    });
    
    it('should link related queries for follow-up handling', async () => {
      const sessionId = `test-linking-${Date.now()}`;
      
      // Store a result for first query
      await workingMemoryService.storeFinalResult(
        sessionId,
        'q1',
        {
          response: 'Terminal 1 has 2 stands available.',
          timestamp: Date.now() - 60000 // 1 minute ago
        }
      );
      
      // Link second query as follow-up
      await workingMemoryService.linkQueries(
        sessionId,
        'q1',
        'q2',
        'follow-up'
      );
      
      // Store result for second query
      await workingMemoryService.storeFinalResult(
        sessionId,
        'q2',
        {
          response: 'Stand A12 is one of the available stands.',
          timestamp: Date.now() - 30000 // 30 seconds ago
        }
      );
      
      // Get follow-up context
      const followUpContext = await workingMemoryService.getContextForFollowUp(
        sessionId,
        'q2'
      );
      
      expect(followUpContext).toBeTruthy();
      expect(followUpContext.linkedQueries).toBeTruthy();
      expect(followUpContext.linkedQueries.q1).toBeTruthy();
      expect(followUpContext.linkedQueries.q1.relationship).toBe('follow-up');
    });
  });
});