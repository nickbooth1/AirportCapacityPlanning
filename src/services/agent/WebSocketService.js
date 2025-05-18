import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor(server, jwtSecret) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.jwtSecret = jwtSecret;
    this.setupAuthentication();
    this.setupEventHandlers();
  }
  
  setupAuthentication() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.id}`);
      
      // Join user to their personal room for targeted messages
      socket.join(`user:${socket.user.id}`);
      
      socket.on('join-conversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.user.id} joined conversation: ${conversationId}`);
      });
      
      socket.on('leave-conversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${socket.user.id} left conversation: ${conversationId}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.id}`);
      });
    });
  }
  
  emitToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
  
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  broadcastAgentResponse(conversationId, response) {
    this.emitToConversation(conversationId, 'agent-response', response);
  }
  
  broadcastResponseUpdate(conversationId, responseId, update) {
    this.emitToConversation(conversationId, 'response-update', {
      responseId,
      ...update
    });
  }
  
  broadcastActionProposal(userId, proposal) {
    this.emitToUser(userId, 'action-proposal', proposal);
  }
  
  broadcastActionResult(conversationId, result) {
    this.emitToConversation(conversationId, 'action-result', result);
  }
}

export default WebSocketService; 