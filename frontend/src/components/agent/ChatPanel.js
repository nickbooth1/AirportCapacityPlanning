import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import Chat from '../../../components/agent/Chat';

const ChatPanel = ({ conversation }) => {
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: '80vh', 
        display: 'flex', 
        flexDirection: 'column',
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}
      >
        <Typography variant="h6">
          {conversation.title || 'New Conversation'}
        </Typography>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Chat contextId={conversation.id} />
      </Box>
    </Paper>
  );
};

export default ChatPanel;