import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress, 
         Card, CardContent, IconButton, Tooltip, Divider, 
         Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RouteIcon from '@mui/icons-material/Route';
import { io } from 'socket.io-client';
import { useRouter } from 'next/router';
import ChatMessage from './ChatMessage';
import EmbeddedVisualization from './EmbeddedVisualization';
import ActionApproval from './ActionApproval';
import StepByStepExplanation from '../reasoning/StepByStepExplanation';
import { initiateReasoning } from '../../src/api/reasoningService';

const Chat = ({ contextId: initialContextId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [contextId, setContextId] = useState(initialContextId);
  const [pendingActionProposal, setPendingActionProposal] = useState(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Initialize socket connection
  useEffect(() => {
    // Get JWT token from localStorage or wherever it's stored
    const token = localStorage.getItem('token');
    
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token },
      withCredentials: true
    });
    
    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setError('Failed to connect to the agent. Please try refreshing the page.');
    });
    
    socketInstance.on('agent-response', (response) => {
      console.log('Received agent response:', response);
      
      setMessages(prev => [...prev, {
        id: response.id,
        type: 'agent',
        text: response.text,
        visualizations: response.visualizations || [],
        timestamp: new Date()
      }]);
      
      setLoading(false);
      setIsAgentTyping(false);
    });
    
    socketInstance.on('agent-typing', ({ isTyping }) => {
      setIsAgentTyping(isTyping);
    });
    
    socketInstance.on('action-proposal', (proposal) => {
      console.log('Received action proposal:', proposal);
      setPendingActionProposal(proposal);
    });
    
    socketInstance.on('action-result', (result) => {
      console.log('Received action result:', result);
      
      // Add action result as a system message
      setMessages(prev => [...prev, {
        id: result.responseId,
        type: 'system',
        text: result.message,
        timestamp: new Date()
      }]);
      
      setPendingActionProposal(null);
    });
    
    socketInstance.on('response-update', (update) => {
      console.log('Received response update:', update);
      
      setMessages(prev => prev.map(msg => 
        msg.id === update.responseId 
          ? { ...msg, ...update, visualizations: update.visualizations || msg.visualizations } 
          : msg
      ));
    });
    
    socketInstance.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err.message || 'An error occurred with the agent connection');
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);
  
  // Join conversation room when contextId changes
  useEffect(() => {
    if (socket && contextId) {
      socket.emit('join-conversation', contextId);
      
      // Fetch conversation history
      fetchConversationHistory(contextId);
    }
  }, [socket, contextId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const fetchConversationHistory = async (contextId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/context/${contextId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation history');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform messages to our format
        const formattedMessages = data.data.messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'agent',
          text: msg.content,
          visualizations: msg.visualizations || [],
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      setError('Failed to load conversation history');
    }
  };
  
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isComplexQuery, setIsComplexQuery] = useState(false);
  const [reasoningId, setReasoningId] = useState(null);
  
  // Handle menu opening
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle menu closing
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle reasoning exploration
  const handleExploreReasoning = () => {
    if (reasoningId) {
      router.push(`/agent/reasoning?id=${reasoningId}`);
    }
    handleMenuClose();
  };
  
  // Detect if a query is complex
  const detectComplexQuery = (query) => {
    // Simple heuristic to detect complex queries that might benefit from multi-step reasoning
    const complexityIndicators = [
      'compare', 'comparison', 'difference', 'versus', 'vs',
      'analyze', 'analysis', 'impact', 'effect',
      'optimize', 'optimization', 'best', 'ideal',
      'forecast', 'predict', 'projection', 'future',
      'if', 'scenario', 'what if', 'what would happen',
      'why', 'how come', 'explain', 'elaborate'
    ];
    
    const lowerQuery = query.toLowerCase();
    const containsIndicator = complexityIndicators.some(indicator => lowerQuery.includes(indicator));
    const hasMultipleClauses = (query.match(/[,.;:]|and|but|or|however|therefore/g) || []).length >= 2;
    const isLongQuery = query.length > 100;
    
    return containsIndicator || (hasMultipleClauses && isLongQuery);
  };
  
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = {
      id: `temp-${Date.now()}`,
      type: 'user',
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    
    // Detect if this is a complex query that might benefit from multi-step reasoning
    const isComplex = detectComplexQuery(input);
    setIsComplexQuery(isComplex);
    
    try {
      // If this is a complex query, consider using advanced reasoning
      if (isComplex) {
        try {
          // Initiate the reasoning process in parallel with regular query processing
          const reasoningResult = await initiateReasoning(input, contextId);
          if (reasoningResult.success && reasoningResult.data.reasoningId) {
            setReasoningId(reasoningResult.data.reasoningId);
          }
        } catch (reasoningError) {
          console.warn('Failed to initiate reasoning process:', reasoningError);
          // Continue with regular query processing even if reasoning fails
        }
      }
      
      // Process the query normally
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: input,
          contextId: contextId,
          enableMultiStepReasoning: isComplex // Let the backend know this might need enhanced reasoning
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message to agent');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // If this is a new conversation, update the contextId
        if (!contextId && data.data.contextId) {
          setContextId(data.data.contextId);
          
          // Join the new conversation room
          if (socket) {
            socket.emit('join-conversation', data.data.contextId);
          }
        }
        
        // If this requires approval, save the proposal
        if (data.data.requiresApproval && data.data.proposalId) {
          setPendingActionProposal({
            id: data.data.proposalId,
            description: data.data.response.text,
            actionType: data.data.actionType
          });
        }
        
        // If there's a reasoning ID in the response, save it
        if (data.data.reasoningId) {
          setReasoningId(data.data.reasoningId);
        }
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  const handleApproveAction = async () => {
    if (!pendingActionProposal) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/actions/approve/${pendingActionProposal.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve action');
      }
      
      // Action result will be received via WebSocket
      setLoading(true);
    } catch (error) {
      console.error('Error approving action:', error);
      setError(error.message);
    }
  };
  
  const handleRejectAction = async (reason = '') => {
    if (!pendingActionProposal) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/actions/reject/${pendingActionProposal.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject action');
      }
      
      // Action result will be received via WebSocket
      setPendingActionProposal(null);
    } catch (error) {
      console.error('Error rejecting action:', error);
      setError(error.message);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFeedback = async (responseId, isPositive, comment = '') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          responseId,
          rating: isPositive ? 5 : 1,
          comment
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      // Update the message to show feedback was given
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, feedback: isPositive ? 'positive' : 'negative' } 
          : msg
      ));
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.message);
    }
  };
  
  const handleSaveInsight = async (responseId, title, category, notes = '') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/insights/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          responseId,
          title,
          category,
          notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save insight');
      }
      
      const data = await response.json();
      
      // Update the message to show it was saved
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, savedAsInsight: data.data.id } 
          : msg
      ));
    } catch (error) {
      console.error('Error saving insight:', error);
      setError(error.message);
    }
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      maxHeight: '80vh',
      minHeight: '500px'
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          p: 2,
          backgroundColor: '#f5f5f5',
          overflowY: 'auto'
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6">
              Welcome to the Airport Capacity AI Assistant
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, textAlign: 'center' }}>
              Ask questions about airport capacity, stand allocations, maintenance impact, and more.
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <Box key={message.id || index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <ChatMessage 
                    message={message}
                    onFeedback={(isPositive) => handleFeedback(message.id, isPositive)}
                    onSaveInsight={(title, category, notes) => handleSaveInsight(message.id, title, category, notes)}
                  />
                </Box>
                
                {message.type === 'agent' && message.reasoningData && (
                  <IconButton 
                    size="small" 
                    sx={{ ml: 1, mt: 1 }}
                    onClick={handleMenuOpen}
                    aria-label="More options"
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </Box>
              
              {message.visualizations && message.visualizations.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {message.visualizations.map((viz, i) => (
                    <EmbeddedVisualization key={i} visualization={viz} />
                  ))}
                </Box>
              )}
              
              {message.type === 'agent' && message.reasoningData && (
                <Box sx={{ mt: 2 }}>
                  <StepByStepExplanation 
                    reasoningData={message.reasoningData}
                    compact={true}
                    showTitle={true}
                    showInsights={false}
                  />
                </Box>
              )}
            </Box>
          ))
        )}
        
        {isAgentTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Assistant is typing...
            </Typography>
          </Box>
        )}
        
        {error && (
          <Card sx={{ mb: 2, backgroundColor: '#ffebee' }}>
            <CardContent>
              <Typography color="error">{error}</Typography>
            </CardContent>
          </Card>
        )}
        
        {pendingActionProposal && (
          <ActionApproval
            proposal={pendingActionProposal}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
          />
        )}
        
        <div ref={messagesEndRef} />
      </Paper>
      
      <Box sx={{ 
        display: 'flex', 
        mt: 2, 
        position: 'relative' 
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          disabled={loading}
          sx={{ 
            backgroundColor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              paddingRight: '100px'
            }
          }}
        />
        
        <Box sx={{ 
          position: 'absolute', 
          right: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          display: 'flex'
        }}>
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            <IconButton 
              color="primary" 
              onClick={handleSendMessage} 
              disabled={!input.trim() || loading}
            >
              <SendIcon />
            </IconButton>
          )}
        </Box>
      </Box>
      
      {/* Reasoning options menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleExploreReasoning}>
          <ListItemIcon>
            <RouteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Explore Reasoning Path</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <LightbulbIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Key Insights</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <AssessmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Full Analysis</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chat;