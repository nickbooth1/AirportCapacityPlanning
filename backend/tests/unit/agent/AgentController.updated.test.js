/**
 * Updated unit tests for the AgentController
 * With corrected expectations for the current implementation
 */

// Create mock dependencies
jest.mock('../../../src/services/agent/AgentService', () => ({
  processQuery: jest.fn().mockResolvedValue({
    response: { id: 'resp123', text: 'Test response' },
    contextId: 'ctx123',
    requiresApproval: false
  }),
  processApproval: jest.fn().mockResolvedValue({
    success: true,
    message: 'Action approved',
    data: { result: 'Success' }
  }),
  processRejection: jest.fn().mockResolvedValue({
    success: true,
    message: 'Action rejected'
  }),
  processFeedback: jest.fn().mockResolvedValue({
    success: true,
    message: 'Feedback recorded'
  })
}));

jest.mock('../../../src/services/agent/ContextService', () => ({
  getContext: jest.fn().mockResolvedValue({
    id: 'ctx123',
    userId: 'user123',
    messages: [{ content: 'Test message' }]
  }),
  getUserContexts: jest.fn().mockResolvedValue([
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
  ])
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../src/models/agent/ActionProposal', () => {
  return {
    query: jest.fn().mockReturnThis(),
    findById: jest.fn().mockImplementation((id) => {
      if (id === 'nonexistent') return Promise.resolve(null);
      
      return Promise.resolve({
        id: id,
        userId: id.includes('other') ? 'other-user' : 'user123',
        status: 'pending',
        actionType: 'maintenance_create',
        parameters: { standId: 1 }
      });
    })
  };
});

// Import the controller after mocks are set up
const agentController = require('../../../src/controllers/agent/AgentController');
const agentService = require('../../../src/services/agent/AgentService');
const contextService = require('../../../src/services/agent/ContextService');
const logger = require('../../../src/utils/logger');
const ActionProposal = require('../../../src/models/agent/ActionProposal');

describe('AgentController Unit Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processQuery', () => {
    it('should process a valid query and return success response', async () => {
      // Setup
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
        data: expect.objectContaining({
          contextId: 'ctx123'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors and pass to next middleware', async () => {
      // Setup
      const errorMessage = 'Service error';
      const error = new Error(errorMessage);
      agentService.processQuery.mockRejectedValueOnce(error);

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
    });
  });

  describe('getContext', () => {
    it('should return context if user owns it', async () => {
      // Setup
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
        data: expect.objectContaining({
          id: 'ctx123',
          userId: 'user123'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should retrieve and format conversation history', async () => {
      // Setup
      const req = {
        user: { id: 'user123' },
        query: {},
        pagination: { limit: 10, offset: 0 }
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
              preview: expect.stringContaining('First message in conversation 2')
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
      
      contextService.getUserContexts.mockRejectedValueOnce(error);

      const req = {
        user: { id: 'user123' },
        query: {},
        pagination: { limit: 10, offset: 0 }
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
    });
  });

  describe('processFeedback', () => {
    it('should process valid feedback successfully', async () => {
      // Setup
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
        data: expect.objectContaining({
          success: true
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('approveAction', () => {
    it('should process action approval with valid proposalId', async () => {
      // Setup
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
        data: expect.objectContaining({
          success: true,
          message: 'Action approved'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rejectAction', () => {
    it('should process action rejection with valid proposalId', async () => {
      // Setup
      const req = {
        params: { proposalId: 'prop123' },
        user: { id: 'user123' },
        body: { reason: 'Not needed at this time' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Execute
      await agentController.rejectAction(req, res, next);

      // Assert
      expect(agentService.processRejection).toHaveBeenCalledWith(
        'prop123',
        'user123',
        'Not needed at this time'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          success: true,
          message: 'Action rejected'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getActionStatus', () => {
    it('should return action status when proposal exists and user has access', async () => {
      // Setup
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
      await agentController.getActionStatus(req, res, next);

      // Assert
      expect(ActionProposal.findById).toHaveBeenCalledWith('prop123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'prop123',
          userId: 'user123'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});