const { WebSocketService } = require('../../../src/services/agent/WebSocketService');
const http = require('http');
const jwt = require('jsonwebtoken');

// Mock socket.io
jest.mock('socket.io', () => {
  const mockOn = jest.fn();
  const mockJoin = jest.fn();
  const mockLeave = jest.fn();
  const mockTo = jest.fn(() => ({ emit: jest.fn() }));
  
  return {
    Server: jest.fn(() => ({
      on: mockOn,
      to: mockTo,
      sockets: {
        to: mockTo
      },
      use: jest.fn((middleware) => {
        // Mock a socket for auth middleware testing
        middleware({
          handshake: { auth: { token: 'valid-token' } },
          user: null,
          next: jest.fn()
        }, jest.fn());
      })
    })),
    mockOn,
    mockJoin,
    mockLeave,
    mockTo
  };
});

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock JWT verification
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret) => {
    if (token === 'valid-token') {
      return { id: 'test-user-id' };
    }
    throw new Error('Invalid token');
  }),
  sign: jest.fn(() => 'valid-token')
}));

describe('WebSocketService', () => {
  let webSocketService;
  let mockServer;
  
  beforeEach(() => {
    mockServer = http.createServer();
    webSocketService = new WebSocketService(mockServer, 'test-secret');
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should set up authentication middleware', () => {
    expect(require('socket.io').Server).toHaveBeenCalledWith(mockServer, {
      cors: expect.any(Object)
    });
  });
  
  test('should emit to a conversation', () => {
    webSocketService.emitToConversation('test-conversation', 'test-event', { data: 'test' });
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('conversation:test-conversation');
  });
  
  test('should emit to a user', () => {
    webSocketService.emitToUser('test-user', 'test-event', { data: 'test' });
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('user:test-user');
  });
  
  test('should broadcast agent response', () => {
    const response = { id: 'test-id', text: 'test response' };
    webSocketService.broadcastAgentResponse('test-conversation', response);
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('conversation:test-conversation');
  });
  
  test('should broadcast action proposal', () => {
    const proposal = { id: 'test-id', actionType: 'test_action' };
    webSocketService.broadcastActionProposal('test-user', proposal);
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('user:test-user');
  });
  
  test('should broadcast typing indicator', () => {
    webSocketService.broadcastTypingIndicator('test-conversation', true);
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('conversation:test-conversation');
  });
  
  test('should broadcast error', () => {
    webSocketService.broadcastError('test-user', 'Test error');
    
    const { mockTo } = require('socket.io');
    expect(mockTo).toHaveBeenCalledWith('user:test-user');
  });
});