/**
 * Unit tests for the AgentController getActionStatus method
 */

// Mock ActionProposal model
jest.mock('../../../src/models/agent/ActionProposal', () => ({
  query: jest.fn().mockReturnThis(),
  findById: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Now require the controller and other dependencies
const agentController = require('../../../src/controllers/agent/AgentController');
const ActionProposal = require('../../../src/models/agent/ActionProposal');
const logger = require('../../../src/utils/logger');

describe('AgentController - getActionStatus', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    await agentController.getActionStatus(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(ActionProposal.query).not.toHaveBeenCalled();
  });
  
  it('should return action status when proposal exists and user has access', async () => {
    // Setup
    const mockProposal = {
      id: 'prop123',
      userId: 'user123',
      status: 'pending',
      actionType: 'maintenance_create',
      parameters: { standId: 1 }
    };
    
    // Mock ActionProposal query chain
    ActionProposal.findById.mockResolvedValue(mockProposal);

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
      data: mockProposal
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle not found proposal', async () => {
    // Setup
    // Mock ActionProposal query chain with null result
    ActionProposal.findById.mockResolvedValue(null);

    const req = {
      params: { proposalId: 'nonexistent' },
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
    expect(ActionProposal.findById).toHaveBeenCalledWith('nonexistent');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      name: 'NotFoundError'
    }));
  });

  it('should handle unauthorized access to proposal', async () => {
    // Setup
    const mockProposal = {
      id: 'prop123',
      userId: 'other-user', // Different user
      status: 'pending',
      actionType: 'maintenance_create',
      parameters: { standId: 1 }
    };
    
    // Mock ActionProposal query chain
    ActionProposal.findById.mockResolvedValue(mockProposal);

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
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      name: 'ForbiddenError'
    }));
  });
});