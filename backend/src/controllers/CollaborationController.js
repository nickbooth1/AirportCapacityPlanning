/**
 * CollaborationController.js
 * 
 * Controller for managing collaborative workspaces, comments, and annotations.
 * 
 * Part of AirportAI Agent Phase 3 implementation.
 */

const logger = require('../utils/logger');
const CollaborationService = require('../services/collaboration/CollaborationService');
const WebSocketService = require('../services/collaboration/WebSocketService');

/**
 * Controller for managing collaboration features
 */
class CollaborationController {
  constructor() {
    // Initialize services
    this.webSocketService = new WebSocketService({
      port: process.env.WS_PORT || 8080,
      path: '/ws',
      autoStart: true
    });
    
    this.collaborationService = new CollaborationService({
      wsService: this.webSocketService
    });
    
    logger.info('CollaborationController initialized');
  }
  
  /**
   * Create a new workspace
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createWorkspace(req, res) {
    try {
      logger.debug('Creating workspace');
      
      // Prepare workspace data
      const workspaceData = {
        name: req.body.name,
        description: req.body.description,
        members: req.body.members || [req.user.id],
        initialContent: req.body.initialContent,
        visibility: req.body.visibility,
        settings: req.body.settings,
        createdBy: req.user.id
      };
      
      // Validate required fields
      if (!workspaceData.name) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }
      
      // Create workspace
      const workspace = await this.collaborationService.createWorkspace(workspaceData);
      
      return res.status(201).json(workspace);
    } catch (error) {
      logger.error(`Error creating workspace: ${error.message}`);
      return res.status(500).json({ error: 'Failed to create workspace' });
    }
  }
  
  /**
   * Get workspace details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWorkspace(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Getting workspace ${workspaceId}`);
      
      // Get workspace
      const workspace = await this.collaborationService.getWorkspace(workspaceId, req.user.id);
      
      return res.json(workspace);
    } catch (error) {
      logger.error(`Error getting workspace: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have access')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.status(500).json({ error: 'Failed to retrieve workspace' });
    }
  }
  
  /**
   * Update workspace details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateWorkspace(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Updating workspace ${workspaceId}`);
      
      // Prepare updates
      const updates = {};
      
      if (req.body.name) updates.name = req.body.name;
      if (req.body.description) updates.description = req.body.description;
      if (req.body.members) updates.members = req.body.members;
      if (req.body.visibility) updates.visibility = req.body.visibility;
      if (req.body.settings) updates.settings = req.body.settings;
      if (req.body.status) updates.status = req.body.status;
      
      // Update workspace
      const workspace = await this.collaborationService.updateWorkspace(workspaceId, updates, req.user.id);
      
      return res.json(workspace);
    } catch (error) {
      logger.error(`Error updating workspace: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have edit permission')) {
        return res.status(403).json({ error: 'Edit permission required' });
      }
      
      return res.status(500).json({ error: 'Failed to update workspace' });
    }
  }
  
  /**
   * Add comment to workspace item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addComment(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Adding comment to workspace ${workspaceId}`);
      
      // Prepare comment data
      const commentData = {
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        text: req.body.text,
        attachments: req.body.attachments,
        visibility: req.body.visibility,
        parentCommentId: req.body.parentCommentId,
        author: req.user.id,
        metadata: req.body.metadata
      };
      
      // Validate required fields
      if (!commentData.targetType || !commentData.targetId || !commentData.text) {
        return res.status(400).json({ error: 'targetType, targetId, and text are required' });
      }
      
      // Add comment
      const comment = await this.collaborationService.addComment(workspaceId, commentData);
      
      return res.status(201).json(comment);
    } catch (error) {
      logger.error(`Error adding comment: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have access')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }
  
  /**
   * Get comments for workspace item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getComments(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Getting comments for workspace ${workspaceId}`);
      
      // Prepare options
      const options = {
        targetType: req.query.targetType,
        targetId: req.query.targetId,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined
      };
      
      // Get comments
      const comments = await this.collaborationService.getComments(workspaceId, options, req.user.id);
      
      return res.json({ comments });
    } catch (error) {
      logger.error(`Error getting comments: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have access')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.status(500).json({ error: 'Failed to retrieve comments' });
    }
  }
  
  /**
   * Get activity for workspace
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActivity(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Getting activity for workspace ${workspaceId}`);
      
      // Prepare options
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        since: req.query.since,
        user: req.query.user,
        activityType: req.query.activityType
      };
      
      // Get activity
      const activity = await this.collaborationService.getActivity(workspaceId, options, req.user.id);
      
      return res.json(activity);
    } catch (error) {
      logger.error(`Error getting activity: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have access')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.status(500).json({ error: 'Failed to retrieve activity' });
    }
  }
  
  /**
   * Get active users in workspace
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActiveUsers(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Getting active users for workspace ${workspaceId}`);
      
      // Get active users
      const activeUsers = await this.collaborationService.getActiveUsers(workspaceId);
      
      return res.json({ activeUsers });
    } catch (error) {
      logger.error(`Error getting active users: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve active users' });
    }
  }
  
  /**
   * Add content to workspace
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addContent(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Adding content to workspace ${workspaceId}`);
      
      // Prepare content data
      const contentData = {
        contentType: req.body.contentType,
        contentId: req.body.contentId
      };
      
      // Validate required fields
      if (!contentData.contentType || !contentData.contentId) {
        return res.status(400).json({ error: 'contentType and contentId are required' });
      }
      
      // Add content
      const content = await this.collaborationService.addContent(workspaceId, contentData, req.user.id);
      
      return res.status(201).json(content);
    } catch (error) {
      logger.error(`Error adding content: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have edit permission')) {
        return res.status(403).json({ error: 'Edit permission required' });
      }
      
      if (error.message.includes('Unsupported content type')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add content' });
    }
  }
  
  /**
   * Remove content from workspace
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeContent(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Removing content from workspace ${workspaceId}`);
      
      // Prepare content data
      const contentData = {
        contentType: req.body.contentType,
        contentId: req.body.contentId
      };
      
      // Validate required fields
      if (!contentData.contentType || !contentData.contentId) {
        return res.status(400).json({ error: 'contentType and contentId are required' });
      }
      
      // Remove content
      await this.collaborationService.removeContent(workspaceId, contentData, req.user.id);
      
      return res.json({ success: true });
    } catch (error) {
      logger.error(`Error removing content: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have edit permission')) {
        return res.status(403).json({ error: 'Edit permission required' });
      }
      
      if (error.message.includes('Unsupported content type')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to remove content' });
    }
  }
  
  /**
   * Create annotation for visualization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createAnnotation(req, res) {
    try {
      const workspaceId = req.params.workspaceId;
      
      logger.debug(`Creating annotation in workspace ${workspaceId}`);
      
      // Prepare annotation data
      const annotationData = {
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        text: req.body.text,
        position: req.body.position,
        style: req.body.style,
        visibility: req.body.visibility,
        author: req.user.id
      };
      
      // Validate required fields
      if (!annotationData.targetType || !annotationData.targetId || 
          !annotationData.text || !annotationData.position) {
        return res.status(400).json({ error: 'targetType, targetId, text, and position are required' });
      }
      
      // Create annotation
      const annotation = await this.collaborationService.createAnnotation(workspaceId, annotationData);
      
      return res.status(201).json(annotation);
    } catch (error) {
      logger.error(`Error creating annotation: ${error.message}`);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (error.message.includes('does not have access')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.status(500).json({ error: 'Failed to create annotation' });
    }
  }
  
  /**
   * Get WebSocket status and statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWebSocketStats(req, res) {
    try {
      logger.debug('Getting WebSocket statistics');
      
      // Get statistics
      const stats = this.webSocketService.getStats();
      
      return res.json(stats);
    } catch (error) {
      logger.error(`Error getting WebSocket statistics: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve WebSocket statistics' });
    }
  }
}

module.exports = new CollaborationController();