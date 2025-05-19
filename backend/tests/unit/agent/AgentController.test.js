/**
 * Unit tests for the AgentController
 * Tests the controller methods in isolation using mocks
 */

const agentController = require('../../../src/controllers/agent/AgentController');
const agentService = require('../../../src/services/agent/AgentService');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/services/agent/AgentService');
jest.mock('../../../src/utils/logger');

describe('AgentController Unit Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processQuery', () => {
    it('should return 400 if query is missing', async () => {
      // Setup
      const req = {
        body: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.processQuery(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Query is required'
        })
      );
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

      // Execute
      await agentController.processQuery(req, res);

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
    });

    it('should handle errors and return error response', async () => {
      // Setup
      const errorMessage = 'Service error';
      agentService.processQuery.mockRejectedValue(new Error(errorMessage));

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

      // Execute
      await agentController.processQuery(req, res);

      // Assert
      expect(agentService.processQuery).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining(errorMessage)
        })
      );
    });
  });

  describe('getContext', () => {
    it('should return 400 if contextId is missing', async () => {
      // Setup
      const req = {
        params: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.getContext(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Context ID is required'
        })
      );
    });

    it('should return 403 if user does not own the context', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'different-user'
      };

      // Mock the imported contextService within AgentController
      const contextService = require('../../../src/services/agent/ContextService');
      contextService.getContext = jest.fn().mockResolvedValue(mockContext);

      const req = {
        params: { contextId: 'ctx123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.getContext(req, res);

      // Assert
      expect(contextService.getContext).toHaveBeenCalledWith('ctx123');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('access')
        })
      );
    });

    it('should return context if user owns it', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'user123',
        messages: []
      };

      // Mock the imported contextService within AgentController
      const contextService = require('../../../src/services/agent/ContextService');
      contextService.getContext = jest.fn().mockResolvedValue(mockContext);

      const req = {
        params: { contextId: 'ctx123' },
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.getContext(req, res);

      // Assert
      expect(contextService.getContext).toHaveBeenCalledWith('ctx123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockContext
      });
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

      // Mock the imported contextService within AgentController
      const contextService = require('../../../src/services/agent/ContextService');
      contextService.getUserContexts = jest.fn().mockResolvedValue(mockContexts);

      const req = {
        user: { id: 'user123' },
        query: {
          offset: '0',
          limit: '10'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.getHistory(req, res);

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
    });

    it('should handle errors when retrieving history', async () => {
      // Setup
      const errorMessage = 'Database error';
      
      // Mock the imported contextService within AgentController
      const contextService = require('../../../src/services/agent/ContextService');
      contextService.getUserContexts = jest.fn().mockRejectedValue(new Error(errorMessage));

      const req = {
        user: { id: 'user123' },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.getHistory(req, res);

      // Assert
      expect(contextService.getUserContexts).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining(errorMessage)
        })
      );
    });
  });

  describe('processFeedback', () => {
    it('should return 400 if responseId is missing', async () => {
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

      // Execute
      await agentController.processFeedback(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Response ID is required'
        })
      );
    });

    it('should return 400 if rating is missing', async () => {
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

      // Execute
      await agentController.processFeedback(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rating is required'
        })
      );
    });

    it('should return 400 if rating is out of range', async () => {
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

      // Execute
      await agentController.processFeedback(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rating must be between 1 and 5'
        })
      );
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

      // Execute
      await agentController.processFeedback(req, res);

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
    });
  });

  // Additional tests for action approval and rejection endpoints...
  describe('approveAction', () => {
    it('should return 400 if proposalId is missing', async () => {
      // Setup
      const req = {
        params: {},
        user: { id: 'user123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Execute
      await agentController.approveAction(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Proposal ID is required'
        })
      );
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

      // Execute
      await agentController.approveAction(req, res);

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
    });
  });
});