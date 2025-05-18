/**
 * CollaborationService.js
 * 
 * Service for managing multi-user collaboration features including shared workspaces,
 * comments, annotations, and real-time updates.
 * 
 * Part of AirportAI Agent Phase 3 implementation.
 */

const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');
const WebSocketService = require('./WebSocketService');

/**
 * Collaboration Service
 * 
 * Provides capabilities for:
 * - Creating and managing shared workspaces
 * - Comment and annotation management
 * - User presence tracking
 * - Activity feed management
 * - Permission control for collaborative content
 * - Conflict resolution for simultaneous edits
 */
class CollaborationService {
  constructor(options = {}) {
    this.db = options.db; // Database connection for persistent storage
    this.wsService = options.wsService || new WebSocketService(options.webSocketConfig);
    
    // Initialize in-memory stores (would be database-backed in production)
    this.workspaces = new Map();
    this.comments = new Map();
    this.activities = new Map();
    this.userPresence = new Map();
    
    // Set up workspace cleanup interval
    this.cleanupInterval = options.cleanupInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.startCleanupInterval();
    
    logger.info('CollaborationService initialized');
  }
  
  /**
   * Start the cleanup interval
   * @private
   */
  startCleanupInterval() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleData();
    }, this.cleanupInterval);
  }
  
  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Create a new collaborative workspace
   * @param {Object} workspaceData - Workspace data
   * @returns {Promise<Object>} - Created workspace
   */
  async createWorkspace(workspaceData) {
    try {
      logger.debug(`Creating workspace: ${workspaceData.name}`);
      
      // Generate workspace ID
      const workspaceId = uuidv4();
      
      // Process workspace definition
      const workspace = {
        workspaceId,
        name: workspaceData.name,
        description: workspaceData.description,
        created: {
          at: new Date().toISOString(),
          by: workspaceData.createdBy
        },
        updated: {
          at: new Date().toISOString(),
          by: workspaceData.createdBy
        },
        members: workspaceData.members || [],
        content: workspaceData.initialContent || {
          scenarios: [],
          insights: []
        },
        status: 'active',
        visibility: workspaceData.visibility || 'private',
        settings: workspaceData.settings || {
          commentNotifications: true,
          activityTracking: true,
          contentLocking: false
        }
      };
      
      // Store workspace
      this.workspaces.set(workspaceId, workspace);
      
      // In a real implementation:
      // await this.db.workspaces.insert(workspace);
      
      // Create activity for workspace creation
      await this.trackActivity({
        workspaceId,
        userId: workspaceData.createdBy,
        activityType: 'workspace_created',
        targetType: 'workspace',
        targetId: workspaceId,
        summary: `Workspace "${workspace.name}" created`
      });
      
      // Notify members about new workspace
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'workspace_created',
        workspace: {
          workspaceId,
          name: workspace.name,
          description: workspace.description
        }
      });
      
      logger.info(`Created workspace ${workspaceId}: ${workspace.name}`);
      
      return {
        workspaceId,
        name: workspace.name,
        createdAt: workspace.created.at,
        createdBy: workspace.created.by,
        accessUrl: `/workspaces/${workspaceId}`
      };
    } catch (error) {
      logger.error(`Error creating workspace: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get workspace details
   * @param {string} workspaceId - Workspace identifier
   * @param {string} userId - User requesting the workspace
   * @returns {Promise<Object>} - Workspace details
   */
  async getWorkspace(workspaceId, userId) {
    try {
      logger.debug(`Getting workspace ${workspaceId} for user ${userId}`);
      
      // Get workspace
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check access permission
      if (!this.hasWorkspaceAccess(workspace, userId)) {
        throw new Error(`User ${userId} does not have access to workspace ${workspaceId}`);
      }
      
      // Track user accessing the workspace
      await this.updateUserPresence(workspaceId, userId, 'viewing');
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId,
        activityType: 'workspace_accessed',
        targetType: 'workspace',
        targetId: workspaceId,
        summary: `User accessed workspace "${workspace.name}"`
      });
      
      return workspace;
    } catch (error) {
      logger.error(`Error getting workspace: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update workspace details
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} - Updated workspace
   */
  async updateWorkspace(workspaceId, updates, userId) {
    try {
      logger.debug(`Updating workspace ${workspaceId}`);
      
      // Get workspace
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check edit permission
      if (!this.canEditWorkspace(workspace, userId)) {
        throw new Error(`User ${userId} does not have edit permission for workspace ${workspaceId}`);
      }
      
      // Apply updates
      const updatedWorkspace = {
        ...workspace,
        ...updates,
        updated: {
          at: new Date().toISOString(),
          by: userId
        }
      };
      
      // Store updated workspace
      this.workspaces.set(workspaceId, updatedWorkspace);
      
      // In a real implementation:
      // await this.db.workspaces.update({ _id: workspaceId }, updatedWorkspace);
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId,
        activityType: 'workspace_updated',
        targetType: 'workspace',
        targetId: workspaceId,
        summary: `Workspace "${workspace.name}" updated`
      });
      
      // Notify members about update
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'workspace_updated',
        workspace: {
          workspaceId,
          name: updatedWorkspace.name,
          description: updatedWorkspace.description
        }
      });
      
      logger.info(`Updated workspace ${workspaceId}`);
      
      return updatedWorkspace;
    } catch (error) {
      logger.error(`Error updating workspace: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Add comment to a workspace item
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} - Created comment
   */
  async addComment(workspaceId, commentData) {
    try {
      logger.debug(`Adding comment to ${commentData.targetType} in workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.hasWorkspaceAccess(workspace, commentData.author)) {
        throw new Error(`User ${commentData.author} does not have access to workspace ${workspaceId}`);
      }
      
      // Generate comment ID
      const commentId = uuidv4();
      
      // Process comment
      const comment = {
        commentId,
        workspaceId,
        targetType: commentData.targetType,
        targetId: commentData.targetId,
        author: commentData.author,
        createdAt: new Date().toISOString(),
        text: commentData.text,
        attachments: commentData.attachments || [],
        visibility: commentData.visibility || 'all_members',
        reactions: {},
        isEdited: false,
        parentCommentId: commentData.parentCommentId,
        metadata: commentData.metadata || {}
      };
      
      // Store comment
      this.comments.set(commentId, comment);
      
      // In a real implementation:
      // await this.db.comments.insert(comment);
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId: commentData.author,
        activityType: 'comment_added',
        targetType: commentData.targetType,
        targetId: commentData.targetId,
        summary: `Added comment on ${commentData.targetType}`,
        referenceId: commentId
      });
      
      // Notify members about new comment
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'comment_added',
        comment: {
          commentId,
          author: comment.author,
          targetType: comment.targetType,
          targetId: comment.targetId,
          text: comment.text.substring(0, 100) + (comment.text.length > 100 ? '...' : '')
        }
      }, commentData.visibility);
      
      logger.info(`Added comment ${commentId} to ${commentData.targetType} ${commentData.targetId}`);
      
      return comment;
    } catch (error) {
      logger.error(`Error adding comment: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get comments for a specific target
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} options - Query options
   * @param {string} userId - User requesting comments
   * @returns {Promise<Array>} - Array of comments
   */
  async getComments(workspaceId, options, userId) {
    try {
      logger.debug(`Getting comments for ${options.targetType} in workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.hasWorkspaceAccess(workspace, userId)) {
        throw new Error(`User ${userId} does not have access to workspace ${workspaceId}`);
      }
      
      // Get comments
      const allComments = Array.from(this.comments.values());
      let filteredComments = allComments.filter(comment => 
        comment.workspaceId === workspaceId
      );
      
      // Apply target type filter
      if (options.targetType) {
        filteredComments = filteredComments.filter(comment => 
          comment.targetType === options.targetType
        );
      }
      
      // Apply target ID filter
      if (options.targetId) {
        filteredComments = filteredComments.filter(comment => 
          comment.targetId === options.targetId
        );
      }
      
      // Apply visibility filter
      filteredComments = filteredComments.filter(comment => 
        comment.visibility === 'all_members' || 
        comment.author === userId
      );
      
      // Sort by created time (newest first)
      filteredComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Apply limit
      if (options.limit) {
        filteredComments = filteredComments.slice(0, options.limit);
      }
      
      logger.debug(`Returning ${filteredComments.length} comments`);
      return filteredComments;
    } catch (error) {
      logger.error(`Error getting comments: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get recent activity in a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} options - Query options
   * @param {string} userId - User requesting activity
   * @returns {Promise<Array>} - Array of activities
   */
  async getActivity(workspaceId, options, userId) {
    try {
      logger.debug(`Getting activity for workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.hasWorkspaceAccess(workspace, userId)) {
        throw new Error(`User ${userId} does not have access to workspace ${workspaceId}`);
      }
      
      // Get activities
      const allActivities = Array.from(this.activities.values());
      let filteredActivities = allActivities.filter(activity => 
        activity.workspaceId === workspaceId
      );
      
      // Apply since filter
      if (options.since) {
        const sinceDate = new Date(options.since);
        filteredActivities = filteredActivities.filter(activity => 
          new Date(activity.timestamp) > sinceDate
        );
      }
      
      // Apply user filter
      if (options.user) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.user === options.user
        );
      }
      
      // Apply activity type filter
      if (options.activityType) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.activityType === options.activityType
        );
      }
      
      // Sort by timestamp (newest first)
      filteredActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      if (options.limit) {
        filteredActivities = filteredActivities.slice(0, options.limit);
      }
      
      // Check if there's more
      const hasMore = options.limit && filteredActivities.length === options.limit && 
        allActivities.filter(activity => activity.workspaceId === workspaceId).length > options.limit;
      
      logger.debug(`Returning ${filteredActivities.length} activities`);
      
      return {
        activities: filteredActivities,
        hasMore
      };
    } catch (error) {
      logger.error(`Error getting activity: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update user presence in a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {string} userId - User identifier
   * @param {string} status - Presence status
   * @returns {Promise<boolean>} - Success indicator
   */
  async updateUserPresence(workspaceId, userId, status) {
    try {
      logger.debug(`Updating presence for user ${userId} in workspace ${workspaceId}: ${status}`);
      
      const key = `${workspaceId}:${userId}`;
      const now = new Date().toISOString();
      
      // Update presence
      this.userPresence.set(key, {
        workspaceId,
        userId,
        status,
        lastUpdated: now
      });
      
      // Notify workspace members
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'presence_update',
        presence: {
          userId,
          status,
          timestamp: now
        }
      });
      
      return true;
    } catch (error) {
      logger.error(`Error updating user presence: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get active users in a workspace
   * @param {string} workspaceId - Workspace identifier
   * @returns {Promise<Array>} - Array of active users
   */
  async getActiveUsers(workspaceId) {
    try {
      logger.debug(`Getting active users for workspace ${workspaceId}`);
      
      const now = Date.now();
      const activeTime = 5 * 60 * 1000; // 5 minutes
      
      // Get presence records for this workspace
      const workspacePresence = Array.from(this.userPresence.values())
        .filter(presence => presence.workspaceId === workspaceId);
      
      // Filter to active users (updated in last 5 minutes)
      const activeUsers = workspacePresence
        .filter(presence => {
          const lastUpdated = new Date(presence.lastUpdated).getTime();
          return (now - lastUpdated) < activeTime;
        })
        .map(presence => ({
          userId: presence.userId,
          status: presence.status,
          lastUpdated: presence.lastUpdated
        }));
      
      logger.debug(`Found ${activeUsers.length} active users`);
      return activeUsers;
    } catch (error) {
      logger.error(`Error getting active users: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Add content to a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} content - Content to add
   * @param {string} userId - User adding the content
   * @returns {Promise<Object>} - Added content
   */
  async addContent(workspaceId, content, userId) {
    try {
      logger.debug(`Adding ${content.contentType} to workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.canEditWorkspace(workspace, userId)) {
        throw new Error(`User ${userId} does not have edit permission for workspace ${workspaceId}`);
      }
      
      // Update workspace content
      switch (content.contentType) {
        case 'scenario':
          workspace.content.scenarios = workspace.content.scenarios || [];
          workspace.content.scenarios.push(content.contentId);
          break;
        case 'insight':
          workspace.content.insights = workspace.content.insights || [];
          workspace.content.insights.push(content.contentId);
          break;
        case 'visualization':
          workspace.content.visualizations = workspace.content.visualizations || [];
          workspace.content.visualizations.push(content.contentId);
          break;
        default:
          throw new Error(`Unsupported content type: ${content.contentType}`);
      }
      
      // Update workspace
      workspace.updated = {
        at: new Date().toISOString(),
        by: userId
      };
      
      this.workspaces.set(workspaceId, workspace);
      
      // In a real implementation:
      // await this.db.workspaces.update({ _id: workspaceId }, workspace);
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId,
        activityType: 'content_added',
        targetType: content.contentType,
        targetId: content.contentId,
        summary: `Added ${content.contentType} to workspace`
      });
      
      // Notify members
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'content_added',
        content: {
          contentType: content.contentType,
          contentId: content.contentId,
          addedBy: userId
        }
      });
      
      logger.info(`Added ${content.contentType} ${content.contentId} to workspace ${workspaceId}`);
      
      return content;
    } catch (error) {
      logger.error(`Error adding content: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Remove content from a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} content - Content to remove
   * @param {string} userId - User removing the content
   * @returns {Promise<boolean>} - Success indicator
   */
  async removeContent(workspaceId, content, userId) {
    try {
      logger.debug(`Removing ${content.contentType} from workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.canEditWorkspace(workspace, userId)) {
        throw new Error(`User ${userId} does not have edit permission for workspace ${workspaceId}`);
      }
      
      // Update workspace content
      switch (content.contentType) {
        case 'scenario':
          workspace.content.scenarios = (workspace.content.scenarios || [])
            .filter(id => id !== content.contentId);
          break;
        case 'insight':
          workspace.content.insights = (workspace.content.insights || [])
            .filter(id => id !== content.contentId);
          break;
        case 'visualization':
          workspace.content.visualizations = (workspace.content.visualizations || [])
            .filter(id => id !== content.contentId);
          break;
        default:
          throw new Error(`Unsupported content type: ${content.contentType}`);
      }
      
      // Update workspace
      workspace.updated = {
        at: new Date().toISOString(),
        by: userId
      };
      
      this.workspaces.set(workspaceId, workspace);
      
      // In a real implementation:
      // await this.db.workspaces.update({ _id: workspaceId }, workspace);
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId,
        activityType: 'content_removed',
        targetType: content.contentType,
        targetId: content.contentId,
        summary: `Removed ${content.contentType} from workspace`
      });
      
      // Notify members
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'content_removed',
        content: {
          contentType: content.contentType,
          contentId: content.contentId,
          removedBy: userId
        }
      });
      
      logger.info(`Removed ${content.contentType} ${content.contentId} from workspace ${workspaceId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error removing content: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create an annotation for a visualization
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} annotationData - Annotation data
   * @returns {Promise<Object>} - Created annotation
   */
  async createAnnotation(workspaceId, annotationData) {
    try {
      logger.debug(`Creating annotation for ${annotationData.targetType} in workspace ${workspaceId}`);
      
      // Check workspace exists
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      // Check user has access
      if (!this.hasWorkspaceAccess(workspace, annotationData.author)) {
        throw new Error(`User ${annotationData.author} does not have access to workspace ${workspaceId}`);
      }
      
      // Generate annotation ID
      const annotationId = uuidv4();
      
      // Process annotation
      const annotation = {
        annotationId,
        workspaceId,
        targetType: annotationData.targetType,
        targetId: annotationData.targetId,
        author: annotationData.author,
        createdAt: new Date().toISOString(),
        text: annotationData.text,
        position: annotationData.position,
        style: annotationData.style || { color: '#FF5733' },
        visibility: annotationData.visibility || 'all_members'
      };
      
      // Store annotation (in memory for this implementation)
      this.annotations = this.annotations || new Map();
      this.annotations.set(annotationId, annotation);
      
      // Track activity
      await this.trackActivity({
        workspaceId,
        userId: annotationData.author,
        activityType: 'annotation_created',
        targetType: annotationData.targetType,
        targetId: annotationData.targetId,
        summary: `Added annotation to ${annotationData.targetType}`,
        referenceId: annotationId
      });
      
      // Notify members
      this.notifyWorkspaceMembers(workspaceId, {
        type: 'annotation_created',
        annotation: {
          annotationId,
          author: annotation.author,
          targetType: annotation.targetType,
          targetId: annotation.targetId,
          position: annotation.position
        }
      }, annotationData.visibility);
      
      logger.info(`Created annotation ${annotationId} for ${annotationData.targetType} ${annotationData.targetId}`);
      
      return annotation;
    } catch (error) {
      logger.error(`Error creating annotation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Track activity in a workspace
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} - Tracked activity
   * @private
   */
  async trackActivity(activityData) {
    try {
      // Generate activity ID
      const activityId = uuidv4();
      
      // Process activity
      const activity = {
        activityId,
        workspaceId: activityData.workspaceId,
        timestamp: new Date().toISOString(),
        user: activityData.userId,
        activityType: activityData.activityType,
        targetType: activityData.targetType,
        targetId: activityData.targetId,
        summary: activityData.summary,
        referenceId: activityData.referenceId
      };
      
      // Store activity
      this.activities.set(activityId, activity);
      
      // In a real implementation:
      // await this.db.activities.insert(activity);
      
      return activity;
    } catch (error) {
      logger.error(`Error tracking activity: ${error.message}`);
      // Don't rethrow - activity tracking should not fail the main operation
      return null;
    }
  }
  
  /**
   * Notify workspace members about an event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} notification - Notification data
   * @param {string} visibility - Notification visibility
   * @private
   */
  notifyWorkspaceMembers(workspaceId, notification, visibility = 'all_members') {
    try {
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        logger.warn(`Cannot notify for non-existent workspace: ${workspaceId}`);
        return;
      }
      
      // Add timestamp and workspaceId to notification
      const enrichedNotification = {
        ...notification,
        timestamp: new Date().toISOString(),
        workspaceId
      };
      
      // Send to WebSocket service
      this.wsService.broadcastToWorkspace(workspaceId, enrichedNotification);
      
      logger.debug(`Sent ${notification.type} notification to workspace ${workspaceId}`);
    } catch (error) {
      logger.error(`Error notifying workspace members: ${error.message}`);
    }
  }
  
  /**
   * Check if user has access to a workspace
   * @param {Object} workspace - Workspace object
   * @param {string} userId - User identifier
   * @returns {boolean} - Whether user has access
   * @private
   */
  hasWorkspaceAccess(workspace, userId) {
    if (workspace.visibility === 'public') {
      return true;
    }
    
    return workspace.members.includes(userId);
  }
  
  /**
   * Check if user can edit a workspace
   * @param {Object} workspace - Workspace object
   * @param {string} userId - User identifier
   * @returns {boolean} - Whether user can edit
   * @private
   */
  canEditWorkspace(workspace, userId) {
    return workspace.members.includes(userId);
  }
  
  /**
   * Clean up stale data
   * @private
   */
  cleanupStaleData() {
    try {
      logger.debug('Running cleanup for stale collaboration data');
      
      const now = Date.now();
      const presenceTimeout = 30 * 60 * 1000; // 30 minutes
      let removedPresence = 0;
      
      // Clean up stale presence data
      for (const [key, presence] of this.userPresence.entries()) {
        const lastUpdated = new Date(presence.lastUpdated).getTime();
        if ((now - lastUpdated) > presenceTimeout) {
          this.userPresence.delete(key);
          removedPresence++;
        }
      }
      
      if (removedPresence > 0) {
        logger.debug(`Cleaned up ${removedPresence} stale presence records`);
      }
    } catch (error) {
      logger.error(`Error cleaning up stale data: ${error.message}`);
    }
  }
}

module.exports = CollaborationService;