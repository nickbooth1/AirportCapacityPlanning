import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Alert, 
  Card, 
  CardContent, 
  Chip,
  Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import ChatIcon from '@mui/icons-material/Chat';
import { AgentService } from '../../api/AgentService';
import EmbeddedVisualization from './EmbeddedVisualization';

const InsightDetail = ({ insightId }) => {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  
  // Fetch insight
  useEffect(() => {
    if (!insightId) return;
    
    setLoading(true);
    AgentService.getInsight(insightId)
      .then(data => {
        setInsight(data);
        setLoading(false);
        
        // Update metadata for sharing
        const metaTitle = document.querySelector('meta[property="og:title"]');
        const metaDesc = document.querySelector('meta[property="og:description"]');
        
        if (metaTitle && data) {
          metaTitle.content = `${data.title} | AirportAI Insight`;
        }
        
        if (metaDesc && data) {
          metaDesc.content = data.description || 'View this insight from AirportAI Agent';
        }
      })
      .catch(err => {
        console.error('Error fetching insight:', err);
        setError(err);
        setLoading(false);
      });
  }, [insightId]);
  
  // Update URL hash when visualization state changes
  const updateViewState = (newState) => {
    viewStateRef.current = newState;
    
    // Update URL hash with encoded state
    const encodedState = encodeURIComponent(JSON.stringify(newState));
    router.replace(`/agent/insights/${insightId}#${encodedState}`, undefined, { shallow: true });
  };
  
  const handleContinueConversation = () => {
    if (insight && insight.conversationId) {
      router.push(`/agent/conversations/${insight.conversationId}`);
    }
  };
  
  const handleExportInsight = () => {
    if (!insight) return;
    
    // Generate a JSON file for download
    const dataStr = JSON.stringify(insight, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `insight-${insightId}.json`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };
  
  const handleShareInsight = () => {
    if (!insight) return;
    
    const shareUrl = `${window.location.origin}/agent/insights/${insightId}`;
    
    if (navigator.share) {
      navigator.share({
        title: insight.title,
        text: insight.description || 'Check out this insight from AirportAI',
        url: shareUrl
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback to copying link
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Link copied to clipboard'))
        .catch(err => console.error('Error copying link:', err));
    }
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
          Error loading insight: {error.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }
  
  if (!insight) {
    return (
      <Box mt={4}>
        <Alert severity="warning">
          Insight not found or you don't have permission to view it.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', my: 3, px: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {insight.title}
        </Typography>
        
        <Box>
          <Button 
            startIcon={<ChatIcon />} 
            variant="outlined" 
            onClick={handleContinueConversation}
            sx={{ mr: 1 }}
            disabled={!insight.conversationId}
          >
            Continue Conversation
          </Button>
          
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined" 
            onClick={handleExportInsight}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          
          <Button 
            startIcon={<ShareIcon />} 
            variant="outlined" 
            onClick={handleShareInsight}
          >
            Share
          </Button>
        </Box>
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography color="textSecondary" gutterBottom>
              Created: {new Date(insight.createdAt).toLocaleString()}
            </Typography>
            
            <Chip 
              label={insight.category} 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          
          {insight.description && (
            <Typography variant="body1" paragraph>
              {insight.description}
            </Typography>
          )}
          
          {insight.notes && (
            <Box mt={2} p={2} bgcolor="background.paper" borderRadius={1}>
              <Typography variant="body2" component="div">
                <strong>Notes:</strong>
                <div dangerouslySetInnerHTML={{ __html: insight.notes.replace(/\n/g, '<br>') }} />
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {insight.response && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Agent Response
            </Typography>
            
            <Typography variant="body1" paragraph>
              {insight.response.text}
            </Typography>
            
            {insight.response.visualizations && insight.response.visualizations.map(viz => (
              <Box key={viz.id} mt={3}>
                <EmbeddedVisualization 
                  visualization={viz} 
                  initialViewState={viewStateRef.current}
                  onViewStateChange={updateViewState}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default InsightDetail; 