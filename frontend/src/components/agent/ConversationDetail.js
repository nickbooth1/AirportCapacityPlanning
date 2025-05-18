import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { AgentService } from '../../api/AgentService';
import ChatPanel from '../common/ChatPanel';

const ConversationDetail = ({ conversationId }) => {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { connected, joinConversation, setupConversationListeners } = useWebSocket();
  const router = useRouter();
  const viewStateRef = useRef(null);
  
  // Parse view state from URL hash if present
  useEffect(() => {
    if (router.asPath.includes('#')) {
      try {
        const hashPart = router.asPath.split('#')[1];
        const decodedState = JSON.parse(decodeURIComponent(hashPart));
        viewStateRef.current = decodedState;
      } catch (e) {
        console.error('Failed to parse view state from URL', e);
      }
    }
  }, [router.asPath]);
  
  // Fetch conversation
  useEffect(() => {
    if (!conversationId) return;
    
    setLoading(true);
    AgentService.getConversation(conversationId)
      .then(data => {
        setConversation(data);
        setLoading(false);
        
        // Update metadata for sharing
        const metaTitle = document.querySelector('meta[property="og:title"]');
        const metaDesc = document.querySelector('meta[property="og:description"]');
        
        if (metaTitle && data) {
          metaTitle.content = `Conversation #${conversationId} | AirportAI Agent`;
        }
        
        if (metaDesc && data && data.messages && data.messages.length > 0) {
          metaDesc.content = data.messages[0].content.substring(0, 150) + 
            (data.messages[0].content.length > 150 ? '...' : '');
        }
      })
      .catch(err => {
        console.error('Error fetching conversation:', err);
        setError(err);
        setLoading(false);
      });
  }, [conversationId]);
  
  // Setup WebSocket listeners
  useEffect(() => {
    if (!conversationId || !connected) return;
    
    joinConversation(conversationId);
    
    const cleanup = setupConversationListeners(conversationId, {
      onAgentResponse: (response) => {
        setConversation(prev => {
          if (!prev) return prev;
          
          // Add the new message if it doesn't exist
          const messageExists = prev.messages.some(msg => msg.id === response.id);
          if (!messageExists) {
            return {
              ...prev,
              messages: [...prev.messages, response]
            };
          }
          
          return prev;
        });
      },
      
      onResponseUpdate: (update) => {
        setConversation(prev => {
          if (!prev) return prev;
          
          // Update an existing message
          return {
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === update.responseId ? { ...msg, ...update } : msg
            )
          };
        });
      }
    });
    
    return cleanup;
  }, [conversationId, connected, joinConversation, setupConversationListeners]);
  
  // Update URL hash when visualization state changes
  const updateViewState = (newState) => {
    viewStateRef.current = newState;
    
    // Update URL hash with encoded state
    const encodedState = encodeURIComponent(JSON.stringify(newState));
    router.replace(`/agent/conversations/${conversationId}#${encodedState}`, undefined, { shallow: true });
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box mt={4}>
        <Alert severity="error">
          Error loading conversation: {error.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }
  
  if (!conversation) {
    return (
      <Box mt={4}>
        <Alert severity="warning">
          Conversation not found or you don't have permission to view it.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', my: 3, px: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Conversation
      </Typography>
      
      <ChatPanel 
        conversation={conversation}
        initialViewState={viewStateRef.current}
        onViewStateChange={updateViewState}
      />
    </Box>
  );
};

export default ConversationDetail; 