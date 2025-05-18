import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper, Avatar, IconButton } from '@mui/material';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EmbeddedVisualization from './EmbeddedVisualization';

const MessagePaper = styled(Paper)(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.background.paper,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  maxWidth: '80%',
  borderRadius: isUser ? '20px 20px 0 20px' : '20px 20px 20px 0',
}));

const MessageContainer = styled(Box)(({ theme, isUser }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
}));

/**
 * ChatMessage component for displaying a single message in the chat
 */
const ChatMessage = ({ 
  message, 
  isUser, 
  visualizations, 
  onFeedback, 
  timestamp,
  showFeedback = false 
}) => {
  const handleFeedback = (rating) => {
    if (onFeedback && !isUser) {
      onFeedback(rating);
    }
  };

  return (
    <MessageContainer isUser={isUser}>
      <Box display="flex" alignItems="flex-end" flexDirection={isUser ? 'row-reverse' : 'row'}>
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            marginRight: isUser ? 0 : 1,
            marginLeft: isUser ? 1 : 0
          }}
        >
          {isUser ? 'U' : 'AI'}
        </Avatar>
        <Box>
          <MessagePaper isUser={isUser} elevation={1}>
            <Typography variant="body1" component="div" style={{ whiteSpace: 'pre-wrap' }}>
              {message}
            </Typography>
          </MessagePaper>
          
          {visualizations && visualizations.length > 0 && (
            <Box mt={1}>
              {visualizations.map((viz, index) => (
                <EmbeddedVisualization 
                  key={viz.id || index} 
                  visualization={viz} 
                />
              ))}
            </Box>
          )}
          
          {showFeedback && !isUser && (
            <Box display="flex" justifyContent="flex-end" mt={1}>
              <IconButton 
                size="small" 
                color="primary" 
                onClick={() => handleFeedback(5)}
                aria-label="Helpful"
              >
                <ThumbUp fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => handleFeedback(1)}
                aria-label="Not helpful"
              >
                <ThumbDown fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>
      {timestamp && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            mt: 0.5, 
            ml: isUser ? 0 : 5, 
            mr: isUser ? 5 : 0,
            alignSelf: isUser ? 'flex-end' : 'flex-start'
          }}
        >
          {new Date(timestamp).toLocaleTimeString()}
        </Typography>
      )}
    </MessageContainer>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.string.isRequired,
  isUser: PropTypes.bool,
  visualizations: PropTypes.array,
  onFeedback: PropTypes.func,
  timestamp: PropTypes.string,
  showFeedback: PropTypes.bool
};

export default ChatMessage; 