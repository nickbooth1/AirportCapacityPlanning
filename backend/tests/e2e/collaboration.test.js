/**
 * End-to-End tests for collaboration features
 * 
 * This test uses real service calls and a test database.
 */
const request = require('supertest');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import the app and database connection
const app = require('../../src/index');
const knex = require('../../src/utils/db');

// Import the collaboration services
const { CollaborationService } = require('../../src/services/agent');
const { WebSocketService } = require('../../src/services/agent/WebSocketService');

// Generate test JWT tokens for authentication
const generateTestToken = (userId = 'test-user-1', role = 'admin') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Test data
const TEST_USER_ID = 'test-user-1';
const TEST_USER_ROLE = 'admin';

describe('Collaboration Features - E2E Tests', () => {
  let authToken;
  let workspaceId;
  let commentId;
  let collaborationService;
  let httpServer;
  let wsServer;
  
  // Setup before all tests
  beforeAll(async () => {
    // Generate authentication token
    authToken = generateTestToken(TEST_USER_ID, TEST_USER_ROLE);
    
    // Create a test workspace ID
    workspaceId = `test-workspace-${uuidv4()}`;
    
    // Initialize real services
    collaborationService = new CollaborationService();
    
    // Create HTTP server for WebSocket testing
    httpServer = require('http').createServer();
    httpServer.listen(8081); // Use a different port than the main app
    
    // Create WebSocket server
    wsServer = new WebSocketService(httpServer);
    wsServer.start();
    
    // Create a test workspace in the database
    await collaborationService.createWorkspace({
      id: workspaceId,
      name: 'E2E Test Workspace',
      description: 'Created for e2e testing',
      createdBy: TEST_USER_ID,
      visibility: 'private',
      settings: { allowComments: true }
    });
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    // Delete test workspace
    await collaborationService.deleteWorkspace(workspaceId);
    
    // Close WebSocket server
    if (wsServer) {
      await wsServer.stop();
    }
    
    // Close HTTP server
    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
    }
    
    // Close database connection
    if (knex) {
      await knex.destroy();
    }
  });
  
  describe('Workspace Management', () => {
    it('should get a workspace by ID', async () => {
      // Act - Get the workspace details
      const workspace = await collaborationService.getWorkspaceById(workspaceId);
      
      // Assert
      expect(workspace).toBeDefined();
      expect(workspace.id).toBe(workspaceId);
      expect(workspace.name).toBe('E2E Test Workspace');
      expect(workspace.description).toBe('Created for e2e testing');
      expect(workspace.createdBy).toBe(TEST_USER_ID);
    });
    
    it('should update a workspace', async () => {
      // Act - Update the workspace
      const updatedWorkspace = await collaborationService.updateWorkspace(workspaceId, {
        name: 'Updated E2E Test Workspace',
        description: 'Updated for e2e testing'
      });
      
      // Assert
      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace.id).toBe(workspaceId);
      expect(updatedWorkspace.name).toBe('Updated E2E Test Workspace');
      expect(updatedWorkspace.description).toBe('Updated for e2e testing');
      
      // Verify by getting the workspace again
      const workspace = await collaborationService.getWorkspaceById(workspaceId);
      expect(workspace.name).toBe('Updated E2E Test Workspace');
    });
    
    it('should list workspaces for a user', async () => {
      // Act - Get workspaces for the test user
      const workspaces = await collaborationService.getWorkspacesForUser(TEST_USER_ID);
      
      // Assert
      expect(Array.isArray(workspaces)).toBe(true);
      expect(workspaces.length).toBeGreaterThan(0);
      
      // Find our test workspace
      const testWorkspace = workspaces.find(w => w.id === workspaceId);
      expect(testWorkspace).toBeDefined();
      expect(testWorkspace.name).toBe('Updated E2E Test Workspace');
    });
  });
  
  describe('Workspace Membership', () => {
    const TEST_MEMBER_ID = 'test-member-1';
    
    it('should add a member to a workspace', async () => {
      // Act - Add a member
      await collaborationService.addWorkspaceMember(workspaceId, {
        userId: TEST_MEMBER_ID,
        role: 'editor',
        addedBy: TEST_USER_ID
      });
      
      // Assert - Check members
      const members = await collaborationService.getWorkspaceMembers(workspaceId);
      expect(Array.isArray(members)).toBe(true);
      
      // Should include both the creator and the new member
      expect(members.length).toBeGreaterThan(1);
      
      // Find the new member
      const newMember = members.find(m => m.userId === TEST_MEMBER_ID);
      expect(newMember).toBeDefined();
      expect(newMember.role).toBe('editor');
    });
    
    it('should update a member\'s role', async () => {
      // Act - Update the member's role
      await collaborationService.updateWorkspaceMember(workspaceId, TEST_MEMBER_ID, {
        role: 'viewer'
      });
      
      // Assert - Verify the change
      const members = await collaborationService.getWorkspaceMembers(workspaceId);
      const updatedMember = members.find(m => m.userId === TEST_MEMBER_ID);
      expect(updatedMember).toBeDefined();
      expect(updatedMember.role).toBe('viewer');
    });
    
    it('should remove a member from a workspace', async () => {
      // Act - Remove the member
      await collaborationService.removeWorkspaceMember(workspaceId, TEST_MEMBER_ID);
      
      // Assert - Verify removal
      const members = await collaborationService.getWorkspaceMembers(workspaceId);
      const removedMember = members.find(m => m.userId === TEST_MEMBER_ID);
      expect(removedMember).toBeUndefined();
    });
  });
  
  describe('Comments and Annotations', () => {
    it('should add a comment to a workspace', async () => {
      // Act - Add a comment
      const comment = await collaborationService.addComment({
        workspaceId,
        targetType: 'workspace',
        targetId: workspaceId,
        userId: TEST_USER_ID,
        text: 'This is a test comment for e2e testing'
      });
      
      // Save the comment ID for later tests
      commentId = comment.id;
      
      // Assert
      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.workspaceId).toBe(workspaceId);
      expect(comment.userId).toBe(TEST_USER_ID);
      expect(comment.text).toBe('This is a test comment for e2e testing');
    });
    
    it('should get comments for a workspace', async () => {
      // Act - Get comments
      const comments = await collaborationService.getComments({
        workspaceId,
        targetType: 'workspace',
        targetId: workspaceId
      });
      
      // Assert
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeGreaterThan(0);
      
      // Find our test comment
      const testComment = comments.find(c => c.id === commentId);
      expect(testComment).toBeDefined();
      expect(testComment.text).toBe('This is a test comment for e2e testing');
    });
    
    it('should update a comment', async () => {
      // Act - Update the comment
      const updatedComment = await collaborationService.updateComment(commentId, {
        text: 'This comment has been updated'
      });
      
      // Assert
      expect(updatedComment).toBeDefined();
      expect(updatedComment.id).toBe(commentId);
      expect(updatedComment.text).toBe('This comment has been updated');
      
      // Verify by getting the comment again
      const comments = await collaborationService.getComments({
        workspaceId,
        targetType: 'workspace',
        targetId: workspaceId
      });
      const refreshedComment = comments.find(c => c.id === commentId);
      expect(refreshedComment.text).toBe('This comment has been updated');
    });
    
    it('should delete a comment', async () => {
      // Act - Delete the comment
      await collaborationService.deleteComment(commentId);
      
      // Assert - Verify it's gone
      const comments = await collaborationService.getComments({
        workspaceId,
        targetType: 'workspace',
        targetId: workspaceId
      });
      const deletedComment = comments.find(c => c.id === commentId);
      expect(deletedComment).toBeUndefined();
    });
    
    it('should add and retrieve an annotation', async () => {
      // Act - Add an annotation
      const annotation = await collaborationService.addAnnotation({
        workspaceId,
        targetType: 'chart',
        targetId: 'chart-123',
        userId: TEST_USER_ID,
        content: {
          x: 100,
          y: 150,
          text: 'This is a chart annotation',
          style: 'highlight'
        }
      });
      
      // Assert
      expect(annotation).toBeDefined();
      expect(annotation.id).toBeDefined();
      
      // Get annotations
      const annotations = await collaborationService.getAnnotations({
        workspaceId,
        targetType: 'chart',
        targetId: 'chart-123'
      });
      
      expect(Array.isArray(annotations)).toBe(true);
      expect(annotations.length).toBeGreaterThan(0);
      
      // Find our annotation
      const testAnnotation = annotations.find(a => a.id === annotation.id);
      expect(testAnnotation).toBeDefined();
      expect(testAnnotation.content.text).toBe('This is a chart annotation');
    });
  });
  
  describe('Activity Tracking', () => {
    it('should track user activity in a workspace', async () => {
      // Act - Generate some activity by adding content
      await collaborationService.addWorkspaceContent(workspaceId, {
        contentType: 'scenario',
        contentId: 'scenario-123',
        name: 'Test Scenario',
        description: 'A scenario for testing activity tracking',
        addedBy: TEST_USER_ID
      });
      
      // Get activity
      const activities = await collaborationService.getWorkspaceActivity(workspaceId);
      
      // Assert
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
      
      // Should include our content added activity
      const contentActivity = activities.find(
        a => a.activityType === 'content_added' && a.targetId === 'scenario-123'
      );
      expect(contentActivity).toBeDefined();
      expect(contentActivity.userId).toBe(TEST_USER_ID);
    });
  });
  
  describe('WebSocket Communication', () => {
    let wsClient;
    
    beforeEach(async () => {
      // Create a WebSocket client
      wsClient = new WebSocket(`ws://localhost:8081/ws?token=${authToken}`);
      
      // Wait for connection to open
      await new Promise(resolve => {
        wsClient.onopen = resolve;
      });
    });
    
    afterEach(() => {
      // Close WebSocket connection if open
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });
    
    it('should allow subscribing to a workspace', async () => {
      // Arrange - Setup message handler
      const messagePromise = new Promise(resolve => {
        wsClient.onmessage = event => {
          const message = JSON.parse(event.data);
          if (message.type === 'subscribed') {
            resolve(message);
          }
        };
      });
      
      // Act - Subscribe to workspace
      wsClient.send(JSON.stringify({
        type: 'subscribe',
        workspaceId
      }));
      
      // Assert - Wait for subscription confirmation
      const message = await messagePromise;
      expect(message.type).toBe('subscribed');
      expect(message.workspaceId).toBe(workspaceId);
    });
    
    it('should broadcast events to subscribed clients', async () => {
      // Arrange - Subscribe to workspace
      wsClient.send(JSON.stringify({
        type: 'subscribe',
        workspaceId
      }));
      
      // Wait for subscription confirmation
      await new Promise(resolve => {
        wsClient.onmessage = event => {
          const message = JSON.parse(event.data);
          if (message.type === 'subscribed') {
            resolve();
          }
        };
      });
      
      // Setup handler for content events
      const contentPromise = new Promise(resolve => {
        wsClient.onmessage = event => {
          const message = JSON.parse(event.data);
          if (message.type === 'content_added') {
            resolve(message);
          }
        };
      });
      
      // Act - Add content to the workspace
      await collaborationService.addWorkspaceContent(workspaceId, {
        contentType: 'analysis',
        contentId: 'analysis-456',
        name: 'Test Analysis',
        description: 'An analysis for testing WebSocket broadcasting',
        addedBy: TEST_USER_ID
      });
      
      // Broadcast the event manually (in a real implementation, this would be automatic)
      wsServer.broadcast(workspaceId, {
        type: 'content_added',
        workspaceId,
        content: {
          contentType: 'analysis',
          contentId: 'analysis-456',
          name: 'Test Analysis'
        }
      });
      
      // Assert - Wait for content_added notification
      const message = await contentPromise;
      expect(message.type).toBe('content_added');
      expect(message.workspaceId).toBe(workspaceId);
      expect(message.content.contentId).toBe('analysis-456');
    });
  });
});