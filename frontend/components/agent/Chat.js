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
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/context/${contextId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch conversation history (${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform messages to our format
        const formattedMessages = data.data.messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'agent',
          text: msg.content,
          visualizations: msg.visualizations || [],
          reasoningData: msg.reasoningData || null,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
      } else {
        throw new Error(data.error || 'Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      setError(`Failed to load conversation history: ${error.message}`);
    } finally {
      setLoading(false);
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
    
    // Store the query text in case we need to retry
    const queryText = input;
    
    try {
      // If this is a complex query, consider using advanced reasoning
      if (isComplex) {
        try {
          // Initiate the reasoning process in parallel with regular query processing
          const reasoningResult = await initiateReasoning(queryText, contextId);
          if (reasoningResult.success && reasoningResult.data?.reasoningId) {
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
          query: queryText,
          contextId: contextId,
          enableMultiStepReasoning: isComplex // Let the backend know this might need enhanced reasoning
        })
      });
      
      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        
        // Add a system message about the error
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'system',
          text: `Error: ${errorMessage}\n\nPlease try again or refresh the page if the problem persists.`,
          timestamp: new Date()
        }]);
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // If this is a new conversation, update the contextId
        if (!contextId && data.data?.contextId) {
          setContextId(data.data.contextId);
          
          // Join the new conversation room
          if (socket) {
            socket.emit('join-conversation', data.data.contextId);
          }
        }
        
        // If this requires approval, save the proposal
        if (data.data?.requiresApproval && data.data?.proposalId) {
          setPendingActionProposal({
            id: data.data.proposalId,
            description: data.data.response?.text || 'Action requires approval',
            actionType: data.data.actionType,
            parameters: data.data.parameters
          });
        }
        
        // If there's a reasoning ID in the response, save it
        if (data.data?.reasoningId) {
          setReasoningId(data.data.reasoningId);
        }
        
        // If no WebSocket response is received within 10 seconds, show a timeout message
        const timeoutId = setTimeout(() => {
          setIsAgentTyping(false);
          setLoading(false);
          setMessages(prev => {
            // Only add timeout message if the latest message is still the user's message
            if (prev[prev.length - 1].type === 'user') {
              return [...prev, {
                id: `timeout-${Date.now()}`,
                type: 'system',
                text: 'The agent is taking longer than expected to respond. Your message was received, and a response will appear when ready.',
                timestamp: new Date()
              }];
            }
            return prev;
          });
        }, 10000);
        
        // Clear timeout if component unmounts
        return () => clearTimeout(timeoutId);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Error: ${error.message}`);
      setLoading(false);
      setIsAgentTyping(false);
    }
  };
  
  const handleApproveAction = async () => {
    if (!pendingActionProposal) return;
    
    try {
      setLoading(true);
      
      // Add a system message about the approval
      setMessages(prev => [...prev, {
        id: `approval-${Date.now()}`,
        type: 'system',
        text: `Approving action: ${pendingActionProposal.description.split('\n')[0]}...`,
        timestamp: new Date()
      }]);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/actions/approve/${pendingActionProposal.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to approve action (${response.status})`);
      }
      
      // Action result will be received via WebSocket
      
      // If no WebSocket response is received within 15 seconds, show a timeout message
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setMessages(prev => [...prev, {
          id: `timeout-action-${Date.now()}`,
          type: 'system',
          text: 'The action is taking longer than expected to complete. The request was received and will be processed.',
          timestamp: new Date()
        }]);
        
        setPendingActionProposal(null);
      }, 15000);
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error approving action:', error);
      setError(`Error approving action: ${error.message}`);
      setLoading(false);
      
      // Add error message as system message
      setMessages(prev => [...prev, {
        id: `error-approval-${Date.now()}`,
        type: 'system',
        text: `Error approving action: ${error.message}\n\nPlease try again or contact support.`,
        timestamp: new Date()
      }]);
      
      // Keep the proposal UI visible so user can retry
    }
  };
  
  const handleRejectAction = async (reason = '') => {
    if (!pendingActionProposal) return;
    
    try {
      // Add a system message about the rejection
      setMessages(prev => [...prev, {
        id: `rejection-${Date.now()}`,
        type: 'system',
        text: `Action rejected${reason ? `: ${reason}` : ''}`,
        timestamp: new Date()
      }]);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agent/actions/reject/${pendingActionProposal.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to reject action (${response.status})`);
      }
      
      // Hide the proposal UI
      setPendingActionProposal(null);
    } catch (error) {
      console.error('Error rejecting action:', error);
      setError(`Error rejecting action: ${error.message}`);
      
      // Add error message as system message
      setMessages(prev => [...prev, {
        id: `error-rejection-${Date.now()}`,
        type: 'system',
        text: `Error rejecting action: ${error.message}\n\nPlease try again or refresh the page.`,
        timestamp: new Date()
      }]);
      
      // Keep the proposal UI visible so user can retry
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
      // Optimistically update UI to show feedback was given
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, feedback: isPositive ? 'positive' : 'negative' } 
          : msg
      ));
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to submit feedback (${response.status})`);
      }
      
      // Success - notification could be added here if needed
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      // Revert the optimistic update
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, feedback: undefined } 
          : msg
      ));
      
      // Show error briefly
      setError(`Error submitting feedback: ${error.message}`);
      
      // Clear error after 4 seconds
      setTimeout(() => {
        setError(null);
      }, 4000);
    }
  };
  
  const handleSaveInsight = async (responseId, title, category, notes = '') => {
    try {
      // Optimistically update UI to show saving is in progress
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, savingInsight: true } 
          : msg
      ));
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save insight (${response.status})`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.id) {
        throw new Error('Invalid response from server when saving insight');
      }
      
      // Add a system message about the saved insight
      setMessages(prev => [
        ...prev.map(msg => 
          msg.id === responseId 
            ? { ...msg, savedAsInsight: data.data.id, savingInsight: false } 
            : msg
        ),
        {
          id: `insight-saved-${Date.now()}`,
          type: 'system',
          text: `Insight saved: "${title}" in category ${category}`,
          timestamp: new Date()
        }
      ]);
      
    } catch (error) {
      console.error('Error saving insight:', error);
      
      // Revert the optimistic update
      setMessages(prev => prev.map(msg => 
        msg.id === responseId 
          ? { ...msg, savingInsight: false, savedAsInsight: undefined } 
          : msg
      ));
      
      // Show error message
      setError(`Error saving insight: ${error.message}`);
      
      // Add error as system message for better visibility
      setMessages(prev => [...prev, {
        id: `error-insight-${Date.now()}`,
        type: 'system',
        text: `Error saving insight: ${error.message}. Please try again.`,
        timestamp: new Date()
      }]);
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