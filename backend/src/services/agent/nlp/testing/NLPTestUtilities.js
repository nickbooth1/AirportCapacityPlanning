/**
 * NLP Testing Utilities
 * 
 * This module provides utilities for testing NLP components.
 */

/**
 * Create mock services for testing NLP components
 * 
 * @param {Object} overrides - Service overrides
 * @returns {Object} - Mock services object
 */
function createMockServices(overrides = {}) {
  // Mock stand data service
  const mockStandDataService = {
    getStands: jest.fn().mockResolvedValue([]),
    getStandById: jest.fn().mockResolvedValue(null),
    getStandByName: jest.fn().mockResolvedValue(null),
    ...overrides.standDataService
  };
  
  // Mock airline service
  const mockAirlineService = {
    getAirlines: jest.fn().mockResolvedValue([]),
    getAirlineByIATA: jest.fn().mockResolvedValue(null),
    getAirlineByICAO: jest.fn().mockResolvedValue(null),
    ...overrides.airlineService
  };
  
  // Mock airport service
  const mockAirportService = {
    getAirports: jest.fn().mockResolvedValue([]),
    getAirportByIATA: jest.fn().mockResolvedValue(null),
    getAirportByICAO: jest.fn().mockResolvedValue(null),
    ...overrides.airportService
  };
  
  // Mock reference data service
  const mockReferenceDataService = {
    getAircraftTypes: jest.fn().mockResolvedValue([]),
    getAircraftTypeByIATA: jest.fn().mockResolvedValue(null),
    getAircraftTypeByICAO: jest.fn().mockResolvedValue(null),
    ...overrides.referenceDataService
  };
  
  // Mock OpenAI service
  const mockOpenAIService = {
    isAvailable: true,
    createChatCompletion: jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '{}'
          }
        }
      ]
    }),
    ...overrides.openAIService
  };
  
  // Mock logger
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    ...overrides.logger
  };
  
  // Create combined services object
  return {
    standDataService: mockStandDataService,
    airlineService: mockAirlineService,
    airportService: mockAirportService,
    referenceDataService: mockReferenceDataService,
    openAIService: mockOpenAIService,
    logger: mockLogger,
    
    // Add knowledge services container
    knowledgeServices: {
      StandDataService: mockStandDataService,
      ReferenceDataService: mockReferenceDataService
    },
    
    // Add any additional overrides
    ...overrides
  };
}

/**
 * Create mock conversation context
 * 
 * @param {Object} options - Context options
 * @returns {Object} - Mock context object
 */
function createMockContext(options = {}) {
  return {
    conversationId: options.conversationId || 'test-conversation',
    userId: options.userId || 'test-user',
    recentQueries: options.recentQueries || [],
    entities: options.entities || {},
    intent: options.intent || null,
    ...options
  };
}

/**
 * Create a complete mock for intent classification response
 * 
 * @param {string} intent - The intent to mock
 * @param {number} confidence - Confidence score (0-1)
 * @param {Object} options - Additional options
 * @returns {string} - Mocked OpenAI response
 */
function createMockIntentResponse(intent, confidence = 0.9, options = {}) {
  const response = {
    intent,
    confidence
  };
  
  if (options.alternativeIntent) {
    response.alternativeIntent = options.alternativeIntent;
    response.alternativeConfidence = options.alternativeConfidence || 0.4;
  }
  
  return JSON.stringify(response);
}

/**
 * Create a complete mock for entity extraction response
 * 
 * @param {Object} entities - The entities to mock
 * @returns {string} - Mocked OpenAI response
 */
function createMockEntityResponse(entities) {
  return JSON.stringify(entities);
}

/**
 * Set up an OpenAI service mock to respond to intent classification
 * 
 * @param {Object} mockOpenAIService - The mock OpenAI service
 * @param {string} query - The query to mock
 * @param {string} intent - The intent to return
 * @param {number} confidence - Confidence score (0-1)
 */
function setupIntentClassifierMock(mockOpenAIService, query, intent, confidence = 0.9) {
  mockOpenAIService.createChatCompletion.mockImplementation((params) => {
    const userMessage = params.messages.find(m => m.role === 'user');
    
    if (userMessage && userMessage.content === query) {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: createMockIntentResponse(intent, confidence)
            }
          }
        ]
      });
    }
    
    // Default fallback
    return Promise.resolve({
      choices: [
        {
          message: {
            content: createMockIntentResponse('unknown', 0.3)
          }
        }
      ]
    });
  });
}

/**
 * Set up an OpenAI service mock to respond to entity extraction
 * 
 * @param {Object} mockOpenAIService - The mock OpenAI service
 * @param {string} query - The query to mock
 * @param {Object} entities - The entities to return
 */
function setupEntityExtractorMock(mockOpenAIService, query, entities) {
  mockOpenAIService.createChatCompletion.mockImplementation((params) => {
    const userMessage = params.messages.find(m => m.role === 'user');
    
    if (userMessage && userMessage.content === query) {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: createMockEntityResponse(entities)
            }
          }
        ]
      });
    }
    
    // Default fallback
    return Promise.resolve({
      choices: [
        {
          message: {
            content: '{}'
          }
        }
      ]
    });
  });
}

/**
 * Test case generator for NLP component tests
 * 
 * @param {string} description - Test case description
 * @param {string} input - Input text
 * @param {Object} expected - Expected output
 * @param {Object} context - Optional context
 * @returns {Object} - Test case object
 */
function createTestCase(description, input, expected, context = {}) {
  return {
    description,
    input,
    expected,
    context
  };
}

/**
 * Generate standard test cases for intent classification
 * 
 * @returns {Array<Object>} - Array of test cases
 */
function generateIntentTestCases() {
  return [
    createTestCase(
      'stand details query',
      'Show me details for stand A1',
      { intent: 'stand.details', confidence: 0.9 }
    ),
    createTestCase(
      'stand status query',
      'Is stand T2B10 available?',
      { intent: 'stand.status', confidence: 0.9 }
    ),
    createTestCase(
      'terminal stands query',
      'What stands are in Terminal 1?',
      { intent: 'terminal.stands', confidence: 0.8 }
    ),
    createTestCase(
      'aircraft stands query',
      'Which stands can accommodate a 777?',
      { intent: 'aircraft.stands', confidence: 0.85 }
    ),
    createTestCase(
      'airport info query',
      'Tell me about LHR airport',
      { intent: 'airport.info', confidence: 0.9 }
    )
  ];
}

/**
 * Generate standard test cases for entity extraction
 * 
 * @returns {Array<Object>} - Array of test cases
 */
function generateEntityTestCases() {
  return [
    createTestCase(
      'stand and terminal entities',
      'Show me details for stand A1 in Terminal 2',
      { stand: 'A1', terminal: 'T2' }
    ),
    createTestCase(
      'airport and airline entities',
      'What flights does BA operate at LHR?',
      { airport: 'LHR', airline: 'BA' }
    ),
    createTestCase(
      'aircraft type entity',
      'Can stand 23 accommodate a 777?',
      { stand: '23', aircraftType: '777' }
    ),
    createTestCase(
      'date and time entities',
      'Check stand availability tomorrow at 3pm',
      { date: expect.any(String), time: '15:00' }
    ),
    createTestCase(
      'boolean and limit entities',
      'Show me the top 5 available stands',
      { available: true, limit: 5 }
    )
  ];
}

// Export the utilities
module.exports = {
  createMockServices,
  createMockContext,
  createMockIntentResponse,
  createMockEntityResponse,
  setupIntentClassifierMock,
  setupEntityExtractorMock,
  createTestCase,
  generateIntentTestCases,
  generateEntityTestCases
};