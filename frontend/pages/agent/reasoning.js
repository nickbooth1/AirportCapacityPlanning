import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Layout from '../../components/Layout';
import ReasoningVisualizer from '../../components/agent/ReasoningVisualizer';
import StepByStepExplanation from '../../components/reasoning/StepByStepExplanation';
import ReasoningPath from '../../components/reasoning/ReasoningPath';
import { fetchReasoningData, fetchReasoningHistory } from '../../src/api/reasoningService';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reasoning-tabpanel-${index}`}
      aria-labelledby={`reasoning-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ReasoningPage = () => {
  const router = useRouter();
  const { id: reasoningId } = router.query;
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [reasoningData, setReasoningData] = useState(null);
  const [reasoningHistory, setReasoningHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch reasoning data when the component mounts
  useEffect(() => {
    if (reasoningId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Fetch the reasoning data
          const data = await fetchReasoningData(reasoningId);
          setReasoningData(data);
          
          // Fetch reasoning history
          const history = await fetchReasoningHistory(reasoningId);
          setReasoningHistory(history);
          
          setLoading(false);
        } catch (err) {
          console.error("Error fetching reasoning data:", err);
          setError("Failed to load reasoning data. Please try again later.");
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [reasoningId]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  
  // Handle navigation back to agent page
  const handleBackToAgent = () => {
    router.push('/agent');
  };
  
  // Render the page content
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      );
    }
    
    if (!reasoningData) {
      return (
        <Alert severity="info">
          No reasoning data available for the specified ID.
        </Alert>
      );
    }
    
    return (
      <>
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Reasoning Analysis: {reasoningData.queryTitle || 'Complex Query'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              {reasoningData.originalQuery}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {reasoningData.tags && reasoningData.tags.map(tag => (
                <Chip key={tag} label={tag} size="small" />
              ))}
              
              <Chip 
                label={`Confidence: ${Math.round((reasoningData.confidence || 0) * 100)}%`}
                color="primary"
                size="small"
              />
              
              <Chip 
                label={`Steps: ${reasoningData.steps?.length || 0}`}
                color="secondary"
                size="small"
              />
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            aria-label="reasoning view tabs"
          >
            <Tab label="Step by Step Explanation" id="reasoning-tab-0" />
            <Tab label="Visual Reasoning Path" id="reasoning-tab-1" />
            <Tab label="Detailed View" id="reasoning-tab-2" />
            {reasoningHistory.length > 0 && <Tab label="Reasoning History" id="reasoning-tab-3" />}
          </Tabs>
        </Box>
        
        <TabPanel value={selectedTab} index={0}>
          <StepByStepExplanation 
            reasoningData={reasoningData}
            showTitle={false}
            showInsights={true}
          />
          {reasoningData.finalAnswer && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: '#f8fdf9', border: '1px solid #c8e6c9' }}>
              <Typography variant="h6" gutterBottom>
                Final Answer
              </Typography>
              <Typography variant="body1">
                {reasoningData.finalAnswer.answer}
              </Typography>
            </Paper>
          )}
        </TabPanel>
        
        <TabPanel value={selectedTab} index={1}>
          <ReasoningPath 
            reasoningData={reasoningData}
            showTimeline={true}
          />
        </TabPanel>
        
        <TabPanel value={selectedTab} index={2}>
          <ReasoningVisualizer 
            reasoning={reasoningData}
          />
        </TabPanel>
        
        {reasoningHistory.length > 0 && (
          <TabPanel value={selectedTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Previous Reasoning Iterations
            </Typography>
            <Grid container spacing={3}>
              {reasoningHistory.map((item, index) => (
                <Grid item xs={12} md={6} key={item.id || index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : `Iteration ${index + 1}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {item.query || 'No query available'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                        <Chip 
                          label={`Steps: ${item.stepCount || 'N/A'}`}
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          label={`Confidence: ${Math.round((item.confidence || 0) * 100)}%`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          size="small"
                          onClick={() => router.push(`/agent/reasoning?id=${item.id}`)}
                        >
                          View Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        )}
      </>
    );
  };
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToAgent}
            sx={{ mr: 2 }}
          >
            Back to Agent
          </Button>
          <Typography variant="h4" component="h1">
            Advanced Reasoning Explorer
          </Typography>
        </Box>
        
        {renderContent()}
      </Container>
    </Layout>
  );
};

export default ReasoningPage;