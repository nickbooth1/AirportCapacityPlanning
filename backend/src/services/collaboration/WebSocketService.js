/**
 * WebSocketService.js
 * 
 * Service for managing WebSocket connections for real-time notifications and collaboration.
 * 
 * Part of AirportAI Agent Phase 3 implementation.
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * WebSocket Service
 * 
 * Provides capabilities for:
 * - Establishing and managing WebSocket connections
 * - Broadcasting messages to users
 * - Managing presence and subscriptions
 * - Handling connection lifecycle
 */
class WebSocketService {
  constructor(options = {}) {
    this.port = options.port || process.env.WS_PORT || 8080;
    this.path = options.path || '/ws';
    this.server = null;
    this.wss = null;
    
    // Connection tracking
    this.connections = new Map();
    this.userConnections = new Map();
    this.workspaceSubscriptions = new Map();
    
    // Connection stats
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastReset: new Date().toISOString()
    };
    
    // Initialize server if autoStart is true
    if (options.autoStart !== false) {
      this.initialize();
    }
    
    logger.info('WebSocketService initialized');
  }
  
  /**
   * Initialize the WebSocket server
   */
  initialize() {
    try {
      // Create HTTP server if not provided
      if (!this.server) {
        this.server = http.createServer();
        this.server.listen(this.port, () => {
          logger.info(`WebSocket server listening on port ${this.port}`);
        });
      }
      
      // Create WebSocket server
      this.wss = new WebSocket.Server({
        server: this.server,
        path: this.path
      });
      
      // Set up event handlers
      this.setupEventHandlers();
      
      logger.info(`WebSocket server initialized with path ${this.path}`);
    } catch (error) {
      logger.error(`Error initializing WebSocket server: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Set up WebSocket event handlers
   * @private
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
    
    this.wss.on('error', (error) => {
      logger.error(`WebSocket server error: ${error.message}`);
    });
    
    // Set up interval for ping/pong to detect stale connections
    setInterval(() => {
      this.pingConnections();
    }, 30000);
  }
  
  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} req - HTTP request
   * @private
   */
  handleConnection(ws, req) {
    try {
      // Parse connection parameters from query string
      const { query } = url.parse(req.url, true);
      const userId = query.userId;
      const authToken = query.token;
      
      // Validate connection
      if (!userId || !authToken) {
        logger.warn('Connection attempt without userId or token');
        ws.close(4000, 'Authentication required');
        return;
      }
      
      // TODO: Validate auth token in a real implementation
      
      // Generate connection ID
      const connectionId = uuidv4();
      
      // Store connection
      this.connections.set(connectionId, ws);
      
      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId).add(connectionId);
      
      // Update stats
      this.stats.totalConnections++;
      this.stats.activeConnections++;
      
      // Store connection metadata on the socket
      ws.metadata = {
        connectionId,
        userId,
        connectedAt: new Date().toISOString(),
        isAlive: true,
        subscriptions: []
      };
      
      logger.info(`New WebSocket connection: ${connectionId} for user ${userId}`);
      
      // Set up connection event handlers
      this.setupConnectionHandlers(ws);
      
      // Send welcome message
      this.sendToConnection(ws, {
        type: 'welcome',
        connectionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error handling WebSocket connection: ${error.message}`);
      ws.close(4500, 'Internal server error');
    }
  }
  
  /**
   * Set up handlers for a specific connection
   * @param {WebSocket} ws - WebSocket connection
   * @private
   */
  setupConnectionHandlers(ws) {
    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });
    
    ws.on('close', () => {
      this.handleClose(ws);
    });
    
    ws.on('error', (error) => {
      logger.error(`WebSocket connection error: ${error.message}`);
      this.handleClose(ws);
    });
    
    ws.on('pong', () => {
      ws.metadata.isAlive = true;
    });
  }
  
  /**
   * Handle incoming message from client
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} message - Raw message data
   * @private
   */
  handleMessage(ws, message) {
    try {
      // Update stats
      this.stats.messagesReceived++;
      
      // Parse message
      const data = JSON.parse(message);
      
      logger.debug(`Received message type ${data.type} from ${ws.metadata.userId}`);
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;
        case 'presence':
          this.handlePresenceUpdate(ws, data);
          break;
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message: ${error.message}`);
    }
  }
  
  /**
   * Handle connection close
   * @param {WebSocket} ws - WebSocket connection
   * @private
   */
  handleClose(ws) {
    try {
      if (!ws.metadata) {
        return;
      }
      
      const { connectionId, userId, subscriptions } = ws.metadata;
      
      logger.info(`WebSocket connection closed: ${connectionId} for user ${userId}`);
      
      // Remove from connections
      this.connections.delete(connectionId);
      
      // Remove from user connections
      if (this.userConnections.has(userId)) {
        this.userConnections.get(userId).delete(connectionId);
        if (this.userConnections.get(userId).size === 0) {
          this.userConnections.delete(userId);
        }
      }
      
      // Remove from workspace subscriptions
      for (const workspaceId of subscriptions) {
        if (this.workspaceSubscriptions.has(workspaceId)) {
          this.workspaceSubscriptions.get(workspaceId).delete(connectionId);
          if (this.workspaceSubscriptions.get(workspaceId).size === 0) {
            this.workspaceSubscriptions.delete(workspaceId);
          }
        }
      }
      
      // Update stats
      this.stats.activeConnections--;
    } catch (error) {
      logger.error(`Error handling WebSocket close: ${error.message}`);
    }
  }
  
  /**
   * Handle subscription request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Subscription data
   * @private
   */
  handleSubscribe(ws, data) {
    try {
      const { workspaceId } = data;
      const { connectionId, userId } = ws.metadata;
      
      if (!workspaceId) {
        logger.warn('Subscribe request without workspaceId');
        return;
      }
      
      // Check if already subscribed
      if (ws.metadata.subscriptions.includes(workspaceId)) {
        logger.debug(`User ${userId} already subscribed to workspace ${workspaceId}`);
        return;
      }
      
      // Add to subscriptions
      ws.metadata.subscriptions.push(workspaceId);
      
      // Add to workspace subscriptions
      if (!this.workspaceSubscriptions.has(workspaceId)) {
        this.workspaceSubscriptions.set(workspaceId, new Set());
      }
      this.workspaceSubscriptions.get(workspaceId).add(connectionId);
      
      logger.info(`User ${userId} subscribed to workspace ${workspaceId}`);
      
      // Confirm subscription
      this.sendToConnection(ws, {
        type: 'subscribed',
        workspaceId,
        timestamp: new Date().toISOString()
      });
      
      // Notify about new subscriber
      this.broadcastToWorkspace(workspaceId, {
        type: 'user_joined',
        userId,
        workspaceId,
        timestamp: new Date().toISOString()
      }, connectionId); // Exclude the new subscriber
    } catch (error) {
      logger.error(`Error handling subscribe request: ${error.message}`);
    }
  }
  
  /**
   * Handle unsubscribe request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Unsubscribe data
   * @private
   */
  handleUnsubscribe(ws, data) {
    try {
      const { workspaceId } = data;
      const { connectionId, userId } = ws.metadata;
      
      if (!workspaceId) {
        logger.warn('Unsubscribe request without workspaceId');
        return;
      }
      
      // Check if subscribed
      const index = ws.metadata.subscriptions.indexOf(workspaceId);
      if (index === -1) {
        logger.debug(`User ${userId} not subscribed to workspace ${workspaceId}`);
        return;
      }
      
      // Remove from subscriptions
      ws.metadata.subscriptions.splice(index, 1);
      
      // Remove from workspace subscriptions
      if (this.workspaceSubscriptions.has(workspaceId)) {
        this.workspaceSubscriptions.get(workspaceId).delete(connectionId);
        if (this.workspaceSubscriptions.get(workspaceId).size === 0) {
          this.workspaceSubscriptions.delete(workspaceId);
        }
      }
      
      logger.info(`User ${userId} unsubscribed from workspace ${workspaceId}`);
      
      // Confirm unsubscription
      this.sendToConnection(ws, {
        type: 'unsubscribed',
        workspaceId,
        timestamp: new Date().toISOString()
      });
      
      // Notify about user leaving
      this.broadcastToWorkspace(workspaceId, {
        type: 'user_left',
        userId,
        workspaceId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error handling unsubscribe request: ${error.message}`);
    }
  }
  
  /**
   * Handle presence update request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Presence data
   * @private
   */
  handlePresenceUpdate(ws, data) {
    try {
      const { workspaceId, status } = data;
      const { userId } = ws.metadata;
      
      if (!workspaceId || !status) {
        logger.warn('Presence update without workspaceId or status');
        return;
      }
      
      // Check if subscribed
      if (!ws.metadata.subscriptions.includes(workspaceId)) {
        logger.warn(`User ${userId} trying to update presence for unsubscribed workspace ${workspaceId}`);
        return;
      }
      
      logger.debug(`Presence update for user ${userId} in workspace ${workspaceId}: ${status}`);
      
      // Broadcast presence update
      this.broadcastToWorkspace(workspaceId, {
        type: 'presence_update',
        userId,
        status,
        workspaceId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error handling presence update: ${error.message}`);
    }
  }
  
  /**
   * Send message to a specific connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} message - Message to send
   * @returns {boolean} - Success indicator
   */
  sendToConnection(ws, message) {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      
      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      
      // Update stats
      this.stats.messagesSent++;
      
      return true;
    } catch (error) {
      logger.error(`Error sending to connection: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Send message to all connections for a user
   * @param {string} userId - User identifier
   * @param {Object} message - Message to send
   * @returns {number} - Number of connections message was sent to
   */
  sendToUser(userId, message) {
    try {
      if (!this.userConnections.has(userId)) {
        logger.debug(`No active connections for user ${userId}`);
        return 0;
      }
      
      let sentCount = 0;
      
      for (const connectionId of this.userConnections.get(userId)) {
        const ws = this.connections.get(connectionId);
        if (ws && this.sendToConnection(ws, message)) {
          sentCount++;
        }
      }
      
      logger.debug(`Sent message to ${sentCount} connections for user ${userId}`);
      return sentCount;
    } catch (error) {
      logger.error(`Error sending to user: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Broadcast message to all connections subscribed to a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} message - Message to send
   * @param {string} excludeConnectionId - Optional connection ID to exclude
   * @returns {number} - Number of connections message was sent to
   */
  broadcastToWorkspace(workspaceId, message, excludeConnectionId = null) {
    try {
      if (!this.workspaceSubscriptions.has(workspaceId)) {
        logger.debug(`No subscribers for workspace ${workspaceId}`);
        return 0;
      }
      
      let sentCount = 0;
      
      for (const connectionId of this.workspaceSubscriptions.get(workspaceId)) {
        // Skip excluded connection
        if (excludeConnectionId && connectionId === excludeConnectionId) {
          continue;
        }
        
        const ws = this.connections.get(connectionId);
        if (ws && this.sendToConnection(ws, message)) {
          sentCount++;
        }
      }
      
      logger.debug(`Broadcast message to ${sentCount} connections for workspace ${workspaceId}`);
      return sentCount;
    } catch (error) {
      logger.error(`Error broadcasting to workspace: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Ping all connections to check if they're still alive
   * @private
   */
  pingConnections() {
    try {
      for (const [connectionId, ws] of this.connections.entries()) {
        if (ws.metadata.isAlive === false) {
          // Connection failed to respond to previous ping
          logger.debug(`Terminating stale connection: ${connectionId}`);
          ws.terminate();
          continue;
        }
        
        // Mark as not alive until pong response
        ws.metadata.isAlive = false;
        ws.ping();
      }
    } catch (error) {
      logger.error(`Error pinging connections: ${error.message}`);
    }
  }
  
  /**
   * Get connection statistics
   * @returns {Object} - WebSocket connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      uniqueUsers: this.userConnections.size,
      activeWorkspaces: this.workspaceSubscriptions.size
    };
  }
  
  /**
   * Reset connection statistics
   */
  resetStats() {
    const activeConnections = this.stats.activeConnections;
    
    this.stats = {
      totalConnections: activeConnections,
      activeConnections,
      messagesSent: 0,
      messagesReceived: 0,
      lastReset: new Date().toISOString()
    };
    
    logger.info('WebSocket statistics reset');
  }
  
  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    try {
      logger.info('Shutting down WebSocket server');
      
      // Close all connections
      for (const ws of this.connections.values()) {
        ws.close(1001, 'Server shutting down');
      }
      
      // Close server
      if (this.wss) {
        this.wss.close();
      }
      
      // Stop HTTP server
      if (this.server) {
        this.server.close();
      }
      
      // Clear tracking data
      this.connections.clear();
      this.userConnections.clear();
      this.workspaceSubscriptions.clear();
      
      logger.info('WebSocket server shutdown complete');
    } catch (error) {
      logger.error(`Error shutting down WebSocket server: ${error.message}`);
    }
  }
}

module.exports = WebSocketService;