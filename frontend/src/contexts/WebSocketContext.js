import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token } = useAuth();
  
  useEffect(() => {
    if (!token) return;
    
    // Use a fallback URL if the environment variable is not set
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      reconnectionDelayMax: 30000,
      reconnectionDelay: 3000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });
    
    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
      setConnected(true);
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setConnected(false);
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setConnected(false);
    });
    
    socketInstance.io.on('reconnect_attempt', (attempt) => {
      const delays = [3000, 10000, 30000];
      const delay = attempt <= delays.length ? delays[attempt - 1] : delays[delays.length - 1];
      console.log(`Reconnection attempt ${attempt} with delay ${delay}ms`);
      socketInstance.io.reconnectionDelay = delay;
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);
  
  const joinConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('join-conversation', conversationId);
    }
  };
  
  const leaveConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('leave-conversation', conversationId);
    }
  };
  
  // Setup event listeners for a conversation
  const setupConversationListeners = (conversationId, handlers) => {
    if (!socket || !connected) return () => {};
    
    // Set up event listeners
    if (handlers.onAgentResponse) {
      socket.on('agent-response', handlers.onAgentResponse);
    }
    
    if (handlers.onResponseUpdate) {
      socket.on('response-update', handlers.onResponseUpdate);
    }
    
    if (handlers.onActionProposal) {
      socket.on('action-proposal', handlers.onActionProposal);
    }
    
    if (handlers.onActionResult) {
      socket.on('action-result', handlers.onActionResult);
    }
    
    // Return cleanup function
    return () => {
      if (handlers.onAgentResponse) {
        socket.off('agent-response', handlers.onAgentResponse);
      }
      
      if (handlers.onResponseUpdate) {
        socket.off('response-update', handlers.onResponseUpdate);
      }
      
      if (handlers.onActionProposal) {
        socket.off('action-proposal', handlers.onActionProposal);
      }
      
      if (handlers.onActionResult) {
        socket.off('action-result', handlers.onActionResult);
      }
    };
  };
  
  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      connected, 
      joinConversation, 
      leaveConversation,
      setupConversationListeners
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketContext; 