import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton, 
  Typography, 
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { Send } from '@mui/icons-material';

/**
 * Simple ChatPanel component for the agent chat interface
 */
const ChatPanel = ({ conversation = { messages: [] } }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState(conversation.messages || []);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      // Add user message
      const userMessage = {
        id: 'user-' + Date.now(),
        role: 'user',
        text: inputValue,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);
      
      // Simulate agent response
      setTimeout(() => {
        const agentMessage = {
          id: 'agent-' + Date.now(),
          role: 'agent',
          text: `This is a simulated response to your query: "${inputValue}"`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, agentMessage]);
        setLoading(false);
      }, 1500);
      
      setInputValue('');
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  // Render a message
  const renderMessage = (message) => {
    const isAgent = message.role !== 'user';
    
    return (
      <Box 
        key={message.id} 
        sx={{ 
          display: 'flex', 
          justifyContent: isAgent ? 'flex-start' : 'flex-end',
          mb: 2
        }}
      >
        <Card 
          sx={{ 
            maxWidth: '80%', 
            bgcolor: isAgent ? 'background.paper' : 'primary.light',
            color: isAgent ? 'text.primary' : 'primary.contrastText'
          }}
        >
          <CardContent>
            <Typography variant="body1">
              {message.text}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {new Date(message.timestamp).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">AirportAI Assistant</Typography>
        <Typography variant="caption" color="text.secondary">
          Ask questions about airport capacity, schedules, and operations
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          p: 2,
          backgroundColor: theme => theme.palette.grey[50]
        }}
      >
        {messages.length === 0 ? (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height="100%" 
            p={3}
          >
            <Typography color="text.secondary" align="center">
              No messages yet. Ask a question to get started.
            </Typography>
          </Box>
        ) : (
          messages.map(message => renderMessage(message))
        )}
        
        {loading && (
          <Box display="flex" alignItems="center" mt={2} mb={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary" ml={1}>
              Thinking...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
      
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <TextField
          fullWidth
          placeholder="Ask a question..."
          variant="outlined"
          size="small"
          value={inputValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={loading}
          multiline
          maxRows={4}
          sx={{ mr: 1 }}
          inputProps={{
            'aria-label': 'Ask a question',
          }}
        />
        <IconButton 
          color="primary" 
          type="submit" 
          disabled={!inputValue.trim() || loading}
          aria-label="Send message"
        >
          <Send />
        </IconButton>
      </Box>
    </Paper>
  );
};

ChatPanel.propTypes = {
  conversation: PropTypes.object
};

export default ChatPanel; 