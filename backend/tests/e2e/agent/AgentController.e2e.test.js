/**
 * End-to-End tests for the AgentController
 * Tests the full API integration with a running server
 * 
 * Note: These tests require a running server and a test database
 * They should be run in a controlled environment, not in production
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/index'); // Your Express application
const knex = require('../../../src/utils/db');
const ConversationContext = require('../../../src/models/agent/ConversationContext');
const AgentResponse = require('../../../src/models/agent/AgentResponse');
const AgentQuery = require('../../../src/models/agent/AgentQuery');
const LongTermMemory = require('../../../src/models/agent/LongTermMemory');

// Generate a test JWT token
const generateToken = (userId = 'e2e-test-user') => {
  return jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

describe('AgentController E2E Tests', () => {
  // Test user and data
  const testUserId = 'e2e-test-user';
  let testContextId;
  let testResponseId;
  let testToken;
  
  // Set up before tests
  beforeAll(async () => {
    // Generate a test token
    testToken = generateToken(testUserId);
    
    // Clean up any existing test data
    await LongTermMemory.query().delete().where('user_id', testUserId);
    await AgentResponse.query().delete().whereIn('contextId', function() {
      this.select('id').from('conversation_contexts').where('userId', testUserId);
    });
    await AgentQuery.query().delete().whereIn('contextId', function() {
      this.select('id').from('conversation_contexts').where('userId', testUserId);
    });
    await ConversationContext.query().delete().where('userId', testUserId);
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Clean up test data
    await LongTermMemory.query().delete().where('user_id', testUserId);
    await AgentResponse.query().delete().whereIn('contextId', function() {
      this.select('id').from('conversation_contexts').where('userId', testUserId);
    });
    await AgentQuery.query().delete().whereIn('contextId', function() {
      this.select('id').from('conversation_contexts').where('userId', testUserId);
    });
    await ConversationContext.query().delete().where('userId', testUserId);
    
    // Close the database connection
    await knex.destroy();
  });
  
  describe('Conversation Flow', () => {
    it('should create a new conversation context when submitting a query', async () => {
      // Submit a query
      const response = await request(app)
        .post('/api/agent/query')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: 'What is the capacity of Terminal 1?'
        });
      
      // Check the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contextId).toBeDefined();
      expect(response.body.data.response).toBeDefined();
      
      // Save the context ID for later tests
      testContextId = response.body.data.contextId;
      testResponseId = response.body.data.response.id;
    });
    
    it('should retrieve the conversation context', async () => {
      // Skip if previous test failed
      if (!testContextId) {
        return;
      }
      
      // Get the context
      const response = await request(app)
        .get(`/api/agent/context/${testContextId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      // Check the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testContextId);
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.data.messages).toHaveLength(2); // User message and agent response
    });
    
    it('should continue the conversation with the same context', async () => {
      // Skip if previous test failed
      if (!testContextId) {
        return;
      }
      
      // Submit another query with the same context
      const response = await request(app)
        .post('/api/agent/query')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: 'And what about Terminal 2?',
          contextId: testContextId
        });
      
      // Check the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contextId).toBe(testContextId);
      expect(response.body.data.response).toBeDefined();
    });
    
    it('should retrieve conversation history', async () => {
      // Get history
      const response = await request(app)
        .get('/api/agent/history')
        .set('Authorization', `Bearer ${testToken}`);
      
      // Check the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toBeDefined();
      expect(response.body.data.conversations.length).toBeGreaterThan(0);
      
      // Check if our test context is in the history
      const testContext = response.body.data.conversations.find(
        c => c.contextId === testContextId
      );
      expect(testContext).toBeDefined();
    });
    
    it('should allow submitting feedback for a response', async () => {
      // Skip if previous test failed
      if (!testResponseId) {
        return;
      }
      
      // Submit feedback
      const response = await request(app)
        .post('/api/agent/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          responseId: testResponseId,
          rating: 4,
          comment: 'Good response, but could be more detailed'
        });
      
      // Check the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should return 400 when submitting a query without text', async () => {
      const response = await request(app)
        .post('/api/agent/query')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          contextId: testContextId
          // Missing query text
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });
    
    it('should return 403 when accessing a context that does not belong to the user', async () => {
      // Create a token for a different user
      const otherToken = generateToken('other-user');
      
      // Try to access the test context with the other user
      const response = await request(app)
        .get(`/api/agent/context/${testContextId}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
    
    it('should return 400 when submitting feedback with invalid rating', async () => {
      const response = await request(app)
        .post('/api/agent/feedback')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          responseId: testResponseId,
          rating: 6, // Invalid: out of range
          comment: 'Good response'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });
  });
});