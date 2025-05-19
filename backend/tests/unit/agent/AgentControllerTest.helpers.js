/**
 * Helper functions and shared mocks for AgentController unit tests
 */

// Common mock setup for all AgentController tests
const setupAgentControllerMocks = () => {
  // Create mocks before requiring the module
  jest.mock('../../../src/services/agent/AgentService', () => ({
    processQuery: jest.fn(),
    processApproval: jest.fn(),
    processRejection: jest.fn(),
    processFeedback: jest.fn()
  }));

  jest.mock('../../../src/services/agent/ContextService', () => ({
    getContext: jest.fn(),
    getUserContexts: jest.fn(),
    createContext: jest.fn(),
    addUserMessage: jest.fn(),
    addAgentMessage: jest.fn(),
    addIntent: jest.fn(),
    updateEntities: jest.fn()
  }));

  jest.mock('../../../src/services/agent/NLPService', () => ({
    intents: {
      CAPACITY_QUERY: 'CAPACITY_QUERY',
      MAINTENANCE_QUERY: 'MAINTENANCE_QUERY',
      FLIGHT_QUERY: 'FLIGHT_QUERY',
      OPERATIONAL_QUERY: 'OPERATIONAL_QUERY'
    },
    processQuery: jest.fn()
  }));

  jest.mock('../../../src/services/agent/ToolOrchestratorService', () => ({
    executeTool: jest.fn(),
    executeApprovedAction: jest.fn()
  }));

  jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }));

  jest.mock('../../../src/models/agent/ActionProposal', () => ({
    query: jest.fn().mockReturnThis(),
    findById: jest.fn(),
    deleteById: jest.fn()
  }));

  // Mock the error classes
  jest.mock('../../../src/middleware/errorHandler', () => {
    const originalModule = jest.requireActual('../../../src/middleware/errorHandler');
    
    return {
      ...originalModule,
      ValidationError: jest.fn(function(message, details) {
        this.name = 'ValidationError';
        this.message = message;
        this.details = details;
        this.statusCode = 400;
      }),
      NotFoundError: jest.fn(function(message) {
        this.name = 'NotFoundError';
        this.message = message;
        this.statusCode = 404;
      }),
      ForbiddenError: jest.fn(function(message) {
        this.name = 'ForbiddenError';
        this.message = message;
        this.statusCode = 403;
      }),
      UnauthorizedError: jest.fn(function(message) {
        this.name = 'UnauthorizedError';
        this.message = message;
        this.statusCode = 401;
      }),
      errorHandler: jest.fn()
    };
  });

  // Mock validation middleware
  jest.mock('../../../src/middleware/validationMiddleware', () => ({
    validateAgentQuery: jest.fn((req, res, next) => next()),
    validateFeedback: jest.fn((req, res, next) => next()),
    validateContextId: jest.fn((req, res, next) => next()),
    validateResponseId: jest.fn((req, res, next) => next()),
    validateProposalId: jest.fn((req, res, next) => next()),
    validatePagination: jest.fn((req, res, next) => {
      req.pagination = { limit: 10, offset: 0 };
      next();
    }),
    validateUuidParam: jest.fn(() => (req, res, next) => next())
  }));
};

// Create a mock request object
const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 'test-user' },
    pagination: { limit: 10, offset: 0 },
    ...overrides
  };
};

// Create a mock response object
const createMockResponse = () => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    set: jest.fn()
  };
};

module.exports = {
  setupAgentControllerMocks,
  createMockRequest,
  createMockResponse
};