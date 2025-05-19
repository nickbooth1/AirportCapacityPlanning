/**
 * Minimal tests for AgentController
 */

const agentService = require('../../../src/services/agent/AgentService');
const contextService = require('../../../src/services/agent/ContextService');

// Mock dependencies
jest.mock('../../../src/services/agent/AgentService', () => ({
  processQuery: jest.fn().mockResolvedValue({
    response: { id: 'resp123', text: 'test response' },
    contextId: 'ctx123'
  })
}));

jest.mock('../../../src/services/agent/ContextService', () => ({
  getContext: jest.fn().mockResolvedValue({ id: 'ctx123', userId: 'test-user' }),
  getUserContexts: jest.fn().mockResolvedValue([])
}));

// Import controller after mocks are set up
const agentController = require('../../../src/controllers/agent/AgentController');

describe('AgentController Minimal Tests', () => {
  test('processQuery works with valid data', async () => {
    // Setup
    const req = {
      body: { query: 'test query' },
      user: { id: 'test-user' }
    };
    
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    
    const next = jest.fn();
    
    // Execute
    await agentController.processQuery(req, res, next);
    
    // Verify
    expect(agentService.processQuery).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});