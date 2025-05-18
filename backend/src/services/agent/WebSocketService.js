const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

/**
 * Service for WebSocket communication
 */
class WebSocketService {
  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   * @param {string} jwtSecret - Secret for JWT verification
   */
  constructor(server, jwtSecret) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET;
    this.setupAuthentication();
    this.setupEventHandlers();
    
    logger.info('WebSocket service initialized');
  }
  
  /**
   * Set up authentication middleware for WebSocket connections
   */
  setupAuthentication() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        logger.warn('WebSocket connection attempt without token');
        return next(new Error('Authentication error'));
      }
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        socket.user = decoded;
        logger.debug(`WebSocket authenticated user: ${decoded.id}`);
        next();
      } catch (err) {
        logger.warn(`WebSocket authentication error: ${err.message}`);
        next(new Error('Authentication error'));
      }
    });
  }
  
  /**
   * Set up event handlers for WebSocket connections
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected to WebSocket: ${socket.user?.id || 'anonymous'}`);
      
      // Join user to their personal room for targeted messages
      if (socket.user?.id) {
        socket.join(`user:${socket.user.id}`);
      }
      
      socket.on('join-conversation', (conversationId) => {
        if (!conversationId) return;
        
        socket.join(`conversation:${conversationId}`);
        logger.debug(`User ${socket.user?.id || 'anonymous'} joined conversation: ${conversationId}`);
      });
      
      socket.on('leave-conversation', (conversationId) => {
        if (!conversationId) return;
        
        socket.leave(`conversation:${conversationId}`);
        logger.debug(`User ${socket.user?.id || 'anonymous'} left conversation: ${conversationId}`);
      });
      
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.user?.id || 'anonymous'}`);
      });
    });
  }
  
  /**
   * Emit an event to all clients in a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToConversation(conversationId, event, data) {
    if (!conversationId || !event) {
      logger.warn('Invalid parameters for emitToConversation');
      return;
    }
    
    this.io.to(`conversation:${conversationId}`).emit(event, data);
    logger.debug(`Emitted ${event} to conversation: ${conversationId}`);
  }
  
  /**
   * Emit an event to a specific user
   * @param {string} userId - The user ID
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToUser(userId, event, data) {
    if (!userId || !event) {
      logger.warn('Invalid parameters for emitToUser');
      return;
    }
    
    this.io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Emitted ${event} to user: ${userId}`);
  }
  
  /**
   * Broadcast an agent response to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} response - The agent response
   */
  broadcastAgentResponse(conversationId, response) {
    this.emitToConversation(conversationId, 'agent-response', response);
  }
  
  /**
   * Broadcast an update to a response
   * @param {string} conversationId - The conversation ID
   * @param {string} responseId - The response ID
   * @param {Object} update - The update data
   */
  broadcastResponseUpdate(conversationId, responseId, update) {
    this.emitToConversation(conversationId, 'response-update', {
      responseId,
      ...update
    });
  }
  
  /**
   * Broadcast an action proposal to a user
   * @param {string} userId - The user ID
   * @param {Object} proposal - The action proposal
   */
  broadcastActionProposal(userId, proposal) {
    this.emitToUser(userId, 'action-proposal', proposal);
  }
  
  /**
   * Broadcast an action result to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} result - The action result
   */
  broadcastActionResult(conversationId, result) {
    this.emitToConversation(conversationId, 'action-result', result);
  }
  
  /**
   * Broadcast a typing indicator to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {boolean} isTyping - Whether the agent is typing
   */
  broadcastTypingIndicator(conversationId, isTyping) {
    this.emitToConversation(conversationId, 'agent-typing', { isTyping });
  }
  
  /**
   * Broadcast an error message to a user
   * @param {string} userId - The user ID
   * @param {string} message - The error message
   * @param {string} code - The error code
   */
  broadcastError(userId, message, code = 'error') {
    this.emitToUser(userId, 'error', { message, code });
    logger.error(`Broadcasted error to user ${userId}: ${message}`);
  }
}

// Singleton instance
let instance = null;

/**
 * Initialize the WebSocket service
 * @param {Object} server - HTTP server instance
 * @param {string} jwtSecret - Secret for JWT verification
 * @returns {WebSocketService} - The WebSocket service instance
 */
function initializeWebSocketService(server, jwtSecret) {
  if (!instance && server) {
    instance = new WebSocketService(server, jwtSecret);
    logger.info('WebSocket service instance created');
  }
  return instance;
}

/**
 * Get the WebSocket service instance
 * @returns {WebSocketService|null} - The WebSocket service instance
 */
function getWebSocketService() {
  if (!instance) {
    logger.warn('WebSocket service accessed before initialization');
  }
  return instance;
}

module.exports = {
  WebSocketService,
  initializeWebSocketService,
  getWebSocketService
};