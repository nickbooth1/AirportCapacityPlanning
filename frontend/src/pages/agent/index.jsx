import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Tabs, 
  Tab
} from '@mui/material';
import { 
  Chat as ChatIcon, 
  History, 
  Bookmark
} from '@mui/icons-material';
import ChatPanel from '../../components/agent/ChatPanel';

/**
 * Agent Hub main page component
 */
const AgentHub = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextId, setContextId] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSubmitQuery = async (query, ctxId) => {
    // In a real implementation, this would call the API
    try {
      setLoading(true);
      setError(null);
      
      // Add user message immediately
      const userMessage = {
        id: 'user-msg-' + Date.now(),
        role: 'user',
        text: query,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add agent response
      const agentMessage = {
        id: 'agent-msg-' + Date.now(),
        role: 'agent',
        text: `This is a simulated response to your query: "${query}"`,
        visualizations: [],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, agentMessage]);
      
      // Update context ID if needed
      if (!ctxId) {
        setContextId('context-' + Date.now());
      }
    } catch (err) {
      console.error('Error submitting query:', err);
      setError('Failed to process your query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (proposalId) => {
    console.log('Approving action:', proposalId);
    // In a real implementation, this would call the API
  };

  const handleRejectAction = async (proposalId, reason) => {
    console.log('Rejecting action:', proposalId, 'Reason:', reason);
    // In a real implementation, this would call the API
  };

  const handleFeedback = async (responseId, rating) => {
    console.log('Feedback for response:', responseId, 'Rating:', rating);
    // In a real implementation, this would call the API
  };

  const handleSaveInsight = async (data) => {
    console.log('Saving insight:', data);
    // In a real implementation, this would call the API
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Agent Hub</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<History />} label="History" />
              <Tab icon={<Bookmark />} label="Insights" />
            </Tabs>
            
            <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
              <Typography variant="body1">
                This sidebar would contain conversation history and saved insights.
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={2}>
                Not implemented in Phase 1 prototype.
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <ChatPanel
            onSubmit={handleSubmitQuery}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
            onFeedback={handleFeedback}
            onSaveInsight={handleSaveInsight}
            messages={messages}
            loading={loading}
            error={error?.toString()}
            contextId={contextId}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default AgentHub; 