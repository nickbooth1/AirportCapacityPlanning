import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, 
         Dialog, DialogTitle, DialogContent, DialogActions,
         TextField, Button, FormControl, InputLabel, Select,
         Tooltip } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';

const ChatMessage = ({ message, onFeedback, onSaveInsight }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [insightDialogOpen, setInsightDialogOpen] = useState(false);
  const [insightTitle, setInsightTitle] = useState('');
  const [insightCategory, setInsightCategory] = useState('general');
  const [insightNotes, setInsightNotes] = useState('');
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleSaveInsightClick = () => {
    handleMenuClose();
    setInsightDialogOpen(true);
    // Generate a default title based on message content
    setInsightTitle(message.text.substring(0, 40) + (message.text.length > 40 ? '...' : ''));
  };
  
  const handleInsightSave = () => {
    onSaveInsight(insightTitle, insightCategory, insightNotes);
    setInsightDialogOpen(false);
    // Reset form
    setInsightTitle('');
    setInsightCategory('general');
    setInsightNotes('');
  };
  
  const renderContent = () => {
    // Using ReactMarkdown to render formatted content
    return (
      <Box sx={{ wordBreak: 'break-word' }}>
        <ReactMarkdown>{message.text}</ReactMarkdown>
      </Box>
    );
  };
  
  const isAgentMessage = message.type === 'agent';
  const isUserMessage = message.type === 'user';
  const isSystemMessage = message.type === 'system';
  
  const timeAgo = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : '';
  
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUserMessage ? 'flex-end' : 'flex-start',
          maxWidth: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            maxWidth: '85%',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              backgroundColor: isUserMessage 
                ? 'primary.main' 
                : isSystemMessage 
                  ? '#ffe0b2' // Light orange for system messages
                  : 'background.paper',
              color: isUserMessage ? 'white' : 'text.primary',
              borderRadius: 2,
              px: 2,
              py: 1.5,
              boxShadow: 1,
              position: 'relative',
            }}
          >
            {renderContent()}
            
            {isAgentMessage && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                <Tooltip title="Helpful">
                  <IconButton 
                    size="small"
                    onClick={() => onFeedback(true)}
                    color={message.feedback === 'positive' ? 'success' : 'default'}
                  >
                    <ThumbUpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Not helpful">
                  <IconButton 
                    size="small"
                    onClick={() => onFeedback(false)}
                    color={message.feedback === 'negative' ? 'error' : 'default'}
                  >
                    <ThumbDownIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Save as insight">
                  <IconButton 
                    size="small"
                    onClick={handleSaveInsightClick}
                    color={message.savedAsInsight ? 'primary' : 'default'}
                  >
                    <BookmarkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="More options">
                  <IconButton size="small" onClick={handleMenuOpen}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 0.5, 
            mx: 1,
            color: 'text.secondary',
            alignSelf: isUserMessage ? 'flex-end' : 'flex-start'
          }}
        >
          {isUserMessage ? 'You' : isSystemMessage ? 'System' : 'Assistant'} • {timeAgo}
        </Typography>
      </Box>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleSaveInsightClick}>Save as insight</MenuItem>
        <MenuItem onClick={handleMenuClose}>Copy text</MenuItem>
      </Menu>
      
      <Dialog 
        open={insightDialogOpen} 
        onClose={() => setInsightDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save as Insight</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="title"
            label="Title"
            fullWidth
            variant="outlined"
            value={insightTitle}
            onChange={(e) => setInsightTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={insightCategory}
              label="Category"
              onChange={(e) => setInsightCategory(e.target.value)}
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="capacity">Capacity</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="optimization">Optimization</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            id="notes"
            label="Notes (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={insightNotes}
            onChange={(e) => setInsightNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInsightSave}
            variant="contained"
            disabled={!insightTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatMessage;