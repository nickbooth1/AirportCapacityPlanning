import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NumbersIcon from '@mui/icons-material/Numbers';

/**
 * Component for providing step-by-step explanations of reasoning processes
 * in a more narrative, conversational format
 */
const StepByStepExplanation = ({ 
  reasoningData,
  showTitle = true,
  compact = false,
  showInsights = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  
  if (!reasoningData || !reasoningData.steps || reasoningData.steps.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa' }}>
        <Typography variant="body1" color="text.secondary">
          No explanation data available.
        </Typography>
      </Paper>
    );
  }
  
  const { 
    steps, 
    approach,
    explanations = [],
    insights = [],
    limitations = []
  } = reasoningData;
  
  // Toggle expanded state
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  // Toggle details for a specific step
  const toggleDetails = (stepId) => {
    setShowDetails(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };
  
  // Format reasoning steps with explanations in a conversational way
  const renderSteps = () => {
    return steps.map((step, index) => {
      const explanation = explanations.find(e => e.stepNumber === step.stepNumber) || {};
      const isLastStep = index === steps.length - 1;
      
      return (
        <Box key={step.stepId || index} sx={{ mb: compact ? 1 : 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              p: compact ? 1 : 2,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <Box 
              sx={{ 
                minWidth: '36px',
                height: '36px',
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                flexShrink: 0
              }}
            >
              {step.stepNumber}
            </Box>
            
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography 
                  variant={compact ? "body1" : "subtitle1"} 
                  sx={{ fontWeight: 'medium', flexGrow: 1 }}
                >
                  {step.description}
                </Typography>
                
                {explanation.success !== undefined && (
                  <Chip 
                    icon={explanation.success ? <CheckCircleOutlineIcon /> : <PriorityHighIcon />}
                    label={explanation.success ? "Completed" : "Failed"}
                    color={explanation.success ? "success" : "error"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                {explanation.explanation || step.description}
              </Typography>
              
              {!compact && (
                <>
                  <Button
                    size="small"
                    onClick={() => toggleDetails(step.stepId)}
                    endIcon={showDetails[step.stepId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ mb: 1 }}
                  >
                    {showDetails[step.stepId] ? "Hide details" : "Show details"}
                  </Button>
                  
                  <Collapse in={showDetails[step.stepId]}>
                    <Box sx={{ pl: 2, pr: 1, py: 1, borderLeft: '2px solid', borderColor: 'grey.300' }}>
                      {step.reasoning && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Reasoning:
                          </Typography>
                          <Typography variant="body2">
                            {step.reasoning}
                          </Typography>
                        </Box>
                      )}
                      
                      {step.expectedOutcome && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Expected outcome:
                          </Typography>
                          <Typography variant="body2">
                            {step.expectedOutcome}
                          </Typography>
                        </Box>
                      )}
                      
                      {explanation.result && (
                        <Box sx={{ mb: 0 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Result summary:
                          </Typography>
                          <Typography variant="body2">
                            {typeof explanation.result === 'object' 
                              ? JSON.stringify(explanation.result).substring(0, 150) + '...'
                              : explanation.result.toString().substring(0, 150) + '...'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </>
              )}
            </Box>
          </Box>
          
          {!isLastStep && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
              <ArrowForwardIcon 
                sx={{ 
                  transform: 'rotate(90deg)', 
                  color: 'grey.500',
                  fontSize: compact ? 18 : 24
                }} 
              />
            </Box>
          )}
        </Box>
      );
    });
  };
  
  // Render key insights
  const renderInsights = () => {
    if (!insights || insights.length === 0) return null;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Key Insights
        </Typography>
        <List>
          {insights.map((insight, index) => (
            <ListItem 
              key={index}
              alignItems="flex-start"
              sx={{ 
                p: 0, 
                mb: 2,
                backgroundColor: 'rgba(66, 133, 244, 0.08)',
                borderRadius: 1,
                p: 1.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LightbulbOutlinedIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2">
                    {insight.key}
                    {insight.confidence && (
                      <Tooltip title={`Confidence: ${Math.round(insight.confidence * 100)}%`}>
                        <Chip 
                          label={`${Math.round(insight.confidence * 100)}%`}
                          size="small"
                          sx={{ ml: 1, height: 20 }}
                        />
                      </Tooltip>
                    )}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span" sx={{ display: 'block', mt: 0.5 }}>
                      {insight.description}
                    </Typography>
                    {insight.relevance && (
                      <Typography 
                        variant="body2" 
                        component="span" 
                        sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
                      >
                        Why it matters: {insight.relevance}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };
  
  // Render limitations
  const renderLimitations = () => {
    if (!limitations || limitations.length === 0) return null;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Limitations & Considerations
        </Typography>
        <List sx={{ p: 0 }}>
          {limitations.map((limitation, index) => (
            <ListItem key={index} sx={{ p: 0, mb: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <HelpOutlineIcon color="warning" />
              </ListItemIcon>
              <ListItemText primary={limitation} />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };
  
  return (
    <Paper sx={{ p: compact ? 1.5 : 3, mb: 2 }}>
      {showTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NumbersIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Step-by-Step Reasoning
          </Typography>
          <Button
            onClick={handleExpandClick}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            size="small"
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </Box>
      )}
      
      {approach && (
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3, 
            backgroundColor: 'rgba(66, 133, 244, 0.05)',
            border: '1px solid rgba(66, 133, 244, 0.2)'
          }}
        >
          <CardContent sx={{ py: compact ? 1 : 2, px: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
              Approach Summary:
            </Typography>
            <Typography variant="body2">
              {approach}
            </Typography>
          </CardContent>
        </Card>
      )}
      
      <Collapse in={expanded} collapsedSize={compact ? 150 : 300}>
        <Box>
          {renderSteps()}
          
          {showInsights && (
            <>
              {renderInsights()}
              {renderLimitations()}
            </>
          )}
        </Box>
      </Collapse>
      
      {!expanded && (
        <Button
          fullWidth
          variant="outlined"
          onClick={handleExpandClick}
          sx={{ mt: 1 }}
          endIcon={<ExpandMoreIcon />}
        >
          Show full explanation
        </Button>
      )}
    </Paper>
  );
};

export default StepByStepExplanation;