import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  Chat as ChatIcon, 
  History, 
  Bookmark,
  Science,
  ArrowForward
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import ChatPanel from '../../src/components/agent/ChatPanel';

// Import the real AgentService
import AgentService from '../../src/api/AgentService';

export default function AgentHubPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);
  
  React.useEffect(() => {
    // Fetch conversations and insights
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would actually fetch this data
        const convos = await AgentService.getConversations()
          .catch(() => []);
        
        const userInsights = await AgentService.getInsights()
          .catch(() => []);
        
        setConversations(convos || []);
        setInsights(userInsights || []);
        
        // Create a new conversation if none exists
        if (!activeConversation && !(convos && convos.length > 0)) {
          const newConversation = await AgentService.createConversation();
          setActiveConversation(newConversation);
        } else if (convos && convos.length > 0) {
          setActiveConversation(convos[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
  };
  
  const handleCreateNewConversation = async () => {
    try {
      setLoading(true);
      const newConversation = await AgentService.createConversation();
      setActiveConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInsightSelect = (insight) => {
    router.push(`/agent/insights/${insight.id}`);
  };

  return (
    <Layout title="AirportAI Agent">
      <Head>
        <title>AirportAI Agent | Airport Capacity Planner</title>
        <meta property="og:title" content="AirportAI Agent" />
        <meta property="og:description" content="Interact with AirportAI Assistant to get insights about airport operations" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/agent`} />
      </Head>
      
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AirportAI Agent
        </Typography>
        
        {/* New Feature Highlight */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 3, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'info.light',
            color: 'info.contrastText'
          }}
        >
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>
              New Feature: What-If Analysis
            </Typography>
            <Typography variant="body1">
              Explore hypothetical scenarios and analyze their impact on airport capacity. 
              Create, compare, and visualize different what-if scenarios to make better decisions.
            </Typography>
          </Box>
          <Link href="/agent/scenarios" passHref>
            <Button 
              variant="contained" 
              color="primary" 
              endIcon={<ArrowForward />}
              sx={{ ml: 2, whiteSpace: 'nowrap' }}
            >
              Try What-If Analysis
            </Button>
          </Link>
        </Paper>
        
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
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                ) : activeTab === 0 ? (
                  conversations.length > 0 ? (
                    <Box>
                      <Typography variant="button" display="block" sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }} onClick={handleCreateNewConversation}>
                        + New Conversation
                      </Typography>
                      
                      {conversations.map(convo => (
                        <Box 
                          key={convo.id}
                          onClick={() => handleConversationSelect(convo)}
                          sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            borderRadius: 1,
                            cursor: 'pointer',
                            bgcolor: activeConversation?.id === convo.id ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Typography variant="subtitle2" noWrap>
                            {convo.title || 'Untitled Conversation'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {new Date(convo.updatedAt || convo.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box textAlign="center" mt={4}>
                      <Typography variant="body2" color="text.secondary">
                        No conversation history yet
                      </Typography>
                      <Typography 
                        variant="button" 
                        display="block" 
                        sx={{ mt: 2, cursor: 'pointer', color: 'primary.main' }} 
                        onClick={handleCreateNewConversation}
                      >
                        Start a New Conversation
                      </Typography>
                    </Box>
                  )
                ) : (
                  insights.length > 0 ? (
                    <Box>
                      {insights.map(insight => (
                        <Box 
                          key={insight.id}
                          onClick={() => handleInsightSelect(insight)}
                          sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Typography variant="subtitle2" noWrap>
                            {insight.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {new Date(insight.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box textAlign="center" mt={4}>
                      <Typography variant="body2" color="text.secondary">
                        No saved insights yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Save insights during conversations to see them here
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={9}>
            {loading && !activeConversation ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
              </Box>
            ) : activeConversation ? (
              <ChatPanel conversation={activeConversation} />
            ) : (
              <Paper 
                elevation={2} 
                sx={{ 
                  height: '80vh', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 3
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No active conversation
                </Typography>
                <Typography 
                  variant="button" 
                  sx={{ cursor: 'pointer', color: 'primary.main', mt: 2 }} 
                  onClick={handleCreateNewConversation}
                >
                  Start a New Conversation
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
        
        {/* Quick Access Tiles */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Science sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                What-If Analysis
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Create and compare scenarios to understand capacity impacts
              </Typography>
              <Link href="/agent/scenarios" passHref>
                <Button variant="outlined" color="primary">
                  Open What-If Tool
                </Button>
              </Link>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <ChatIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                AI Assistant
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Get answers and insights about airport operations
              </Typography>
              <Button 
                variant="outlined" 
                color="success"
                onClick={handleCreateNewConversation}
              >
                Start New Chat
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Bookmark sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Saved Insights
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Access your saved insights and analysis results
              </Typography>
              <Button 
                variant="outlined" 
                color="warning"
                onClick={() => setActiveTab(1)}
              >
                View Insights
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}