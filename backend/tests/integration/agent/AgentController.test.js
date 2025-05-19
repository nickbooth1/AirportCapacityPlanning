/**
 * Integration tests for the AgentController
 * Tests the controller with real service dependencies
 * 
 * Note: These tests use mocked models but real service implementations
 */

const request = require('supertest');
const express = require('express');
const agentController = require('../../../src/controllers/agent/AgentController');
const agentService = require('../../../src/services/agent/AgentService');
const contextService = require('../../../src/services/agent/ContextService');
const AgentQuery = require('../../../src/models/agent/AgentQuery');
const AgentResponse = require('../../../src/models/agent/AgentResponse');
const ConversationContext = require('../../../src/models/agent/ConversationContext');
const ActionProposal = require('../../../src/models/agent/ActionProposal');

// Mock the database models
jest.mock('../../../src/models/agent/AgentQuery');
jest.mock('../../../src/models/agent/AgentResponse');
jest.mock('../../../src/models/agent/ConversationContext');
jest.mock('../../../src/models/agent/ActionProposal');

// Set up a simple Express app for testing
const app = express();
app.use(express.json());

// Add routes for testing
app.post('/api/agent/query', (req, res) => agentController.processQuery(req, res));
app.get('/api/agent/context/:contextId', (req, res) => agentController.getContext(req, res));
app.get('/api/agent/history', (req, res) => agentController.getHistory(req, res));
app.post('/api/agent/feedback', (req, res) => agentController.processFeedback(req, res));
app.post('/api/agent/actions/approve/:proposalId', (req, res) => agentController.approveAction(req, res));
app.post('/api/agent/actions/reject/:proposalId', (req, res) => agentController.rejectAction(req, res));

describe('AgentController Integration Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user' };
      next();
    });
  });

  describe('POST /api/agent/query', () => {
    it('should process a query and return a response', async () => {
      // Setup mocks for a successful query processing
      const mockContext = {
        id: 'ctx123',
        userId: 'test-user',
        messages: []
      };
      
      // Mock context creation and message addition
      contextService.createContext = jest.fn().mockResolvedValue(mockContext);
      contextService.addUserMessage = jest.fn().mockResolvedValue(mockContext);
      contextService.addIntent = jest.fn().mockResolvedValue(mockContext);
      contextService.updateEntities = jest.fn().mockResolvedValue(mockContext);
      contextService.addAgentMessage = jest.fn().mockResolvedValue(mockContext);
      
      // Mock query creation
      AgentQuery.query = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          id: 'query123',
          startProcessing: jest.fn().mockResolvedValue({}),
          completeProcessing: jest.fn().mockResolvedValue({})
        })
      });
      
      // Mock response creation
      AgentResponse.query = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          id: 'resp123',
          text: 'This is a test response',
          addVisualization: jest.fn().mockResolvedValue({}),
          setRawData: jest.fn().mockResolvedValue({})
        }),
        findById: jest.fn().mockResolvedValue({
          id: 'resp123',
          text: 'This is a test response',
          visualizations: []
        })
      });

      // Send a query request
      const response = await request(app)
        .post('/api/agent/query')
        .send({
          query: 'What is the capacity of Terminal 1?',
          contextId: null // New context
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(contextService.createContext).toHaveBeenCalled();
      expect(contextService.addUserMessage).toHaveBeenCalled();
      expect(AgentQuery.query).toHaveBeenCalled();
      expect(AgentResponse.query).toHaveBeenCalled();
    });

    it('should return 400 if query is missing', async () => {
      const response = await request(app)
        .post('/api/agent/query')
        .send({
          contextId: 'ctx123'
          // Missing query
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });
  });

  describe('GET /api/agent/context/:contextId', () => {
    it('should return a context if it belongs to the user', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'test-user',
        messages: [
          { role: 'user', content: 'Test message' }
        ]
      };
      
      contextService.getContext = jest.fn().mockResolvedValue(mockContext);

      // Send request
      const response = await request(app)
        .get('/api/agent/context/ctx123');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContext);
      expect(contextService.getContext).toHaveBeenCalledWith('ctx123');
    });

    it('should return 403 if context does not belong to user', async () => {
      // Setup
      const mockContext = {
        id: 'ctx123',
        userId: 'different-user', // Different user
        messages: []
      };
      
      contextService.getContext = jest.fn().mockResolvedValue(mockContext);

      // Send request
      const response = await request(app)
        .get('/api/agent/context/ctx123');

      // Assertions
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
  });

  describe('GET /api/agent/history', () => {
    it('should return conversation history for a user', async () => {
      // Setup
      const mockContexts = [
        {
          id: 'ctx1',
          startTime: '2025-01-01T00:00:00Z',
          lastUpdateTime: '2025-01-01T01:00:00Z',
          messages: [{ content: 'First message' }]
        },
        {
          id: 'ctx2',
          startTime: '2025-01-02T00:00:00Z',
          lastUpdateTime: '2025-01-02T01:00:00Z',
          messages: [{ content: 'Second conversation' }]
        }
      ];
      
      contextService.getUserContexts = jest.fn().mockResolvedValue(mockContexts);

      // Send request
      const response = await request(app)
        .get('/api/agent/history?limit=5&offset=0');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toHaveLength(2);
      expect(response.body.data.conversations[0].contextId).toBe('ctx1');
      expect(response.body.data.conversations[1].contextId).toBe('ctx2');
      expect(contextService.getUserContexts).toHaveBeenCalledWith('test-user', 5, 0);
    });
  });

  describe('POST /api/agent/feedback', () => {
    it('should process feedback successfully', async () => {
      // Setup
      agentService.processFeedback = jest.fn().mockResolvedValue({
        success: true,
        message: 'Feedback recorded'
      });

      // Send request
      const response = await request(app)
        .post('/api/agent/feedback')
        .send({
          responseId: 'resp123',
          rating: 5,
          comment: 'Great response!'
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(agentService.processFeedback).toHaveBeenCalledWith(
        'resp123',
        5,
        'Great response!'
      );
    });

    it('should validate feedback input', async () => {
      // Send request with invalid rating
      const response = await request(app)
        .post('/api/agent/feedback')
        .send({
          responseId: 'resp123',
          rating: 6, // Invalid: out of range
          comment: 'Comment'
        });

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });
  });

  describe('POST /api/agent/actions/approve/:proposalId', () => {
    it('should approve an action proposal', async () => {
      // Setup
      agentService.processApproval = jest.fn().mockResolvedValue({
        success: true,
        message: 'Action approved',
        data: { result: 'Success' }
      });

      // Send request
      const response = await request(app)
        .post('/api/agent/actions/approve/prop123');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(agentService.processApproval).toHaveBeenCalledWith(
        'prop123',
        'test-user'
      );
    });
  });

  describe('POST /api/agent/actions/reject/:proposalId', () => {
    it('should reject an action proposal', async () => {
      // Setup
      agentService.processRejection = jest.fn().mockResolvedValue({
        success: true,
        message: 'Action rejected'
      });

      // Send request
      const response = await request(app)
        .post('/api/agent/actions/reject/prop123')
        .send({
          reason: 'Not needed at this time'
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(agentService.processRejection).toHaveBeenCalledWith(
        'prop123',
        'test-user',
        'Not needed at this time'
      );
    });
  });
});