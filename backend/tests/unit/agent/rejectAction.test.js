/**
 * Unit tests for the AgentController rejectAction method
 */

// Create mocks before requiring the module
jest.mock('../../../src/services/agent/AgentService', () => ({
  processQuery: jest.fn(),
  processApproval: jest.fn(),
  processRejection: jest.fn(),
  processFeedback: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Now require the controller and other dependencies
const agentController = require('../../../src/controllers/agent/AgentController');
const agentService = require('../../../src/services/agent/AgentService');
const logger = require('../../../src/utils/logger');

describe('AgentController - rejectAction', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle missing proposalId', async () => {
    // Setup
    const req = {
      params: {},
      user: { id: 'user123' },
      body: { reason: 'Not needed' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // Execute
    await agentController.rejectAction(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(agentService.processRejection).not.toHaveBeenCalled();
  });
  
  it('should process action rejection with valid proposalId', async () => {
    // Setup
    const mockResult = {
      success: true,
      message: 'Action rejected'
    };
    agentService.processRejection.mockResolvedValue(mockResult);

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
      data: mockResult
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle rejection errors', async () => {
    // Setup
    const error = new Error('Proposal not found');
    agentService.processRejection.mockRejectedValue(error);

    const req = {
      params: { proposalId: 'prop123' },
      user: { id: 'user123' },
      body: { reason: 'Not needed' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // Execute
    await agentController.rejectAction(req, res, next);

    // Assert
    expect(agentService.processRejection).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});