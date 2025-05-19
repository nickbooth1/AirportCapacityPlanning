/**
 * Unit tests for the AgentController
 * Tests the controller methods in isolation using mocks
 */

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

// Now require the controller and other dependencies
const agentController = require('../../../src/controllers/agent/AgentController');
const agentService = require('../../../src/services/agent/AgentService');
const contextService = require('../../../src/services/agent/ContextService');
const logger = require('../../../src/utils/logger');

describe('AgentController Unit Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processQuery', () => {
    it('should return error if query is missing', async () => {
      // Setup
      const req = {
        body: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processQuery(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(agentService.processQuery).not.toHaveBeenCalled();
    });

    it('should process a valid query and return success response', async () => {
      // Setup
      const mockResult = {
        response: {
          id: 'resp123',
          text: 'This is a response',
          visualizations: []
        },
        contextId: 'ctx123',
        requiresApproval: false
      };

      agentService.processQuery.mockResolvedValue(mockResult);

      const req = {
        body: {
          query: 'What is the airport capacity?',
          contextId: 'ctx123'
        },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processQuery(req, res, next);

      // Assert
      expect(agentService.processQuery).toHaveBeenCalledWith(
        'What is the airport capacity?',
        'user123',
        'ctx123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors and pass to next middleware', async () => {
      // Setup
      const errorMessage = 'Service error';
      const error = new Error(errorMessage);
      agentService.processQuery.mockRejectedValue(error);

      const req = {
        body: {
          query: 'What is the airport capacity?'
        },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processQuery(req, res, next);

      // Assert
      expect(agentService.processQuery).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getContext', () => {
    it('should pass error to next if contextId is missing', async () => {
      // Setup
      const req = {
        params: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.getContext(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(contextService.getContext).not.toHaveBeenCalled();
    });

    it('should pass forbidden error to next if user does not own the context', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'different-user'
      };

      contextService.getContext.mockResolvedValue(mockContext);

      const req = {
        params: { contextId: 'ctx123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.getContext(req, res, next);

      // Assert
      expect(contextService.getContext).toHaveBeenCalledWith('ctx123');
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ForbiddenError'
      }));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return context if user owns it', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'user123',
        messages: []
      };

      contextService.getContext.mockResolvedValue(mockContext);

      const req = {
        params: { contextId: 'ctx123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.getContext(req, res, next);

      // Assert
      expect(contextService.getContext).toHaveBeenCalledWith('ctx123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockContext
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should retrieve and format conversation history', async () => {
      // Setup
      const mockContexts = [
        {
          id: 'ctx1',
          startTime: '2025-01-01T00:00:00Z',
          lastUpdateTime: '2025-01-01T01:00:00Z',
          messages: [{ content: 'First message in conversation 1' }]
        },
        {
          id: 'ctx2',
          startTime: '2025-01-02T00:00:00Z',
          lastUpdateTime: '2025-01-02T01:00:00Z',
          messages: [{ content: 'First message in conversation 2 that is longer than fifty characters and should be truncated' }]
        }
      ];

      contextService.getUserContexts.mockResolvedValue(mockContexts);

      const req = {
        user: { id: 'user123' },
        query: {
          offset: '0',
          limit: '10'
        },
        pagination: { limit: 10, offset: 0 } // Added by middleware
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.getHistory(req, res, next);

      // Assert
      expect(contextService.getUserContexts).toHaveBeenCalledWith('user123', 10, 0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          conversations: [
            {
              contextId: 'ctx1',
              startTime: '2025-01-01T00:00:00Z',
              lastUpdateTime: '2025-01-01T01:00:00Z',
              messageCount: 1,
              preview: 'First message in conversation 1'
            },
            {
              contextId: 'ctx2',
              startTime: '2025-01-02T00:00:00Z',
              lastUpdateTime: '2025-01-02T01:00:00Z',
              messageCount: 1,
              preview: 'First message in conversation 2 that is longer than f...'
            }
          ],
          total: 2,
          limit: 10,
          offset: 0
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors when retrieving history', async () => {
      // Setup
      const errorMessage = 'Database error';
      const error = new Error(errorMessage);
      
      contextService.getUserContexts.mockRejectedValue(error);

      const req = {
        user: { id: 'user123' },
        query: {},
        pagination: { limit: 10, offset: 0 } // Added by middleware
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.getHistory(req, res, next);

      // Assert
      expect(contextService.getUserContexts).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('processFeedback', () => {
    it('should handle missing responseId', async () => {
      // Setup
      const req = {
        body: {
          rating: 5
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processFeedback(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(agentService.processFeedback).not.toHaveBeenCalled();
    });

    it('should handle missing rating', async () => {
      // Setup
      const req = {
        body: {
          responseId: 'resp123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processFeedback(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(agentService.processFeedback).not.toHaveBeenCalled();
    });

    it('should handle rating out of range', async () => {
      // Setup
      const req = {
        body: {
          responseId: 'resp123',
          rating: 6 // Out of valid range 1-5
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processFeedback(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(agentService.processFeedback).not.toHaveBeenCalled();
    });

    it('should process valid feedback successfully', async () => {
      // Setup
      const mockResult = {
        success: true,
        message: 'Feedback recorded'
      };
      agentService.processFeedback.mockResolvedValue(mockResult);

      const req = {
        body: {
          responseId: 'resp123',
          rating: 5,
          comment: 'Great response!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.processFeedback(req, res, next);

      // Assert
      expect(agentService.processFeedback).toHaveBeenCalledWith(
        'resp123',
        5,
        'Great response!'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // Additional tests for action approval and rejection endpoints...
  describe('approveAction', () => {
    it('should handle missing proposalId', async () => {
      // Setup
      const req = {
        params: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.approveAction(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(agentService.processApproval).not.toHaveBeenCalled();
    });
    
    it('should process action approval with valid proposalId', async () => {
      // Setup
      const mockResult = {
        success: true,
        message: 'Action approved',
        data: { actionId: 'action123' }
      };
      agentService.processApproval.mockResolvedValue(mockResult);

      const req = {
        params: { proposalId: 'prop123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.approveAction(req, res, next);

      // Assert
      expect(agentService.processApproval).toHaveBeenCalledWith(
        'prop123',
        'user123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle approval errors', async () => {
      // Setup
      const error = new Error('Proposal not found');
      agentService.processApproval.mockRejectedValue(error);

      const req = {
        params: { proposalId: 'prop123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.approveAction(req, res, next);

      // Assert
      expect(agentService.processApproval).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});