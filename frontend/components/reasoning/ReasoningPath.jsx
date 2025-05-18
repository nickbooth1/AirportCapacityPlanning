import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Collapse,
  LinearProgress,
  Grid
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import CalculateIcon from '@mui/icons-material/Calculate';
import StorageIcon from '@mui/icons-material/Storage';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import CompareIcon from '@mui/icons-material/Compare';
import RecommendIcon from '@mui/icons-material/Recommend';
import VerifiedIcon from '@mui/icons-material/Verified';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Component for visualizing reasoning paths with dependencies
 */
const ReasoningPath = ({ 
  reasoningData,
  isLive = false, 
  onStepClick,
  showStepDetails = true,
  showTimeline = true
}) => {
  const [expandedSteps, setExpandedSteps] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeStepId, setActiveStepId] = useState(null);
  
  // If live execution is happening, set the active step to the first pending step
  useEffect(() => {
    if (isLive && reasoningData && reasoningData.steps) {
      const pendingStep = reasoningData.steps.find(step => step.status === 'pending');
      if (pendingStep) {
        setActiveStepId(pendingStep.stepId);
      }
    }
  }, [isLive, reasoningData]);
  
  if (!reasoningData || !reasoningData.steps || reasoningData.steps.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No reasoning path available.
        </Typography>
      </Paper>
    );
  }
  
  const { steps, explanations = [] } = reasoningData;
  
  // Toggle step details
  const toggleStepDetails = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };
  
  // Handle step click
  const handleStepClick = (step) => {
    setActiveStepId(step.stepId);
    if (onStepClick) {
      onStepClick(step);
    }
  };
  
  // Handle zoom level changes
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  // Get step icon based on type
  const getStepIcon = (type) => {
    switch (type) {
      case 'calculation':
        return <CalculateIcon />;
      case 'data_retrieval':
        return <StorageIcon />;
      case 'parameter_extraction':
        return <FindInPageIcon />;
      case 'comparison':
        return <CompareIcon />;
      case 'recommendation':
        return <RecommendIcon />;
      case 'validation':
        return <VerifiedIcon />;
      default:
        return <SettingsIcon />;
    }
  };
  
  // Get step status icon
  const getStatusIcon = (step) => {
    const explanation = explanations.find(e => e.stepNumber === step.stepNumber);
    
    if (!explanation) {
      return <PendingIcon fontSize="small" sx={{ ml: 1 }} />;
    }
    
    if (explanation.success) {
      return <CheckCircleIcon fontSize="small" color="success" sx={{ ml: 1 }} />;
    } else {
      return <ErrorIcon fontSize="small" color="error" sx={{ ml: 1 }} />;
    }
  };
  
  // Get color based on step type
  const getStepColor = (type) => {
    const colorMap = {
      calculation: 'primary',
      data_retrieval: 'info',
      parameter_extraction: 'secondary',
      comparison: 'warning',
      recommendation: 'error',
      validation: 'success'
    };
    
    return colorMap[type] || 'default';
  };
  
  // Render timeline view
  const renderTimeline = () => {
    return (
      <Timeline position="alternate" sx={{ mt: 2 }}>
        {steps.map((step, index) => {
          const explanation = explanations.find(e => e.stepNumber === step.stepNumber);
          const isActive = step.stepId === activeStepId;
          
          return (
            <TimelineItem key={step.stepId || index}>
              <TimelineOppositeContent color="text.secondary">
                Step {step.stepNumber}
                <Chip 
                  label={step.type || 'generic'} 
                  size="small" 
                  color={getStepColor(step.type)}
                  sx={{ ml: 1 }}
                />
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                <TimelineDot 
                  color={getStepColor(step.type)}
                  variant={isActive ? "filled" : "outlined"}
                  sx={{
                    cursor: 'pointer',
                    boxShadow: isActive ? 3 : 0,
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleStepClick(step)}
                >
                  {getStepIcon(step.type)}
                </TimelineDot>
                {index < steps.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent>
                <Card 
                  variant={isActive ? "elevation" : "outlined"}
                  elevation={isActive ? 3 : 0}
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 2
                    }
                  }}
                  onClick={() => handleStepClick(step)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
                        {step.description}
                      </Typography>
                      {getStatusIcon(step)}
                    </Box>
                    
                    {explanation && (
                      <Typography variant="body2" color="text.secondary">
                        {explanation.explanation || 'No explanation available'}
                      </Typography>
                    )}
                    
                    {showStepDetails && (
                      <>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepDetails(step.stepId);
                          }}
                          endIcon={expandedSteps[step.stepId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{ mt: 1 }}
                        >
                          {expandedSteps[step.stepId] ? "Hide details" : "Show details"}
                        </Button>
                        
                        <Collapse in={expandedSteps[step.stepId]}>
                          <Box sx={{ mt: 2, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                            {step.dependsOn && step.dependsOn.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Depends on:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {step.dependsOn.map((depId) => {
                                    const depStep = steps.find(s => s.stepId === depId);
                                    return (
                                      <Chip 
                                        key={depId}
                                        label={depStep ? `Step ${depStep.stepNumber}` : depId}
                                        size="small"
                                        variant="outlined"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (depStep) handleStepClick(depStep);
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}
                            
                            {step.parameters && Object.keys(step.parameters).length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Parameters:
                                </Typography>
                                <Box sx={{ pl: 1, mt: 0.5 }}>
                                  {Object.entries(step.parameters).map(([key, value]) => (
                                    <Typography key={key} variant="body2">
                                      <strong>{key}:</strong> {JSON.stringify(value)}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            {explanation && explanation.result && (
                              <Box sx={{ mb: 0 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Result:
                                </Typography>
                                <Box sx={{ 
                                  backgroundColor: 'action.hover',
                                  p: 1,
                                  borderRadius: 1,
                                  mt: 0.5,
                                  maxHeight: 100,
                                  overflow: 'auto'
                                }}>
                                  <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                                    {JSON.stringify(explanation.result, null, 2)}
                                  </pre>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </>
                    )}
                    
                    {isLive && step.status === 'in_progress' && (
                      <LinearProgress sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    );
  };
  
  // Render grid view
  const renderGridView = () => {
    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {steps.map((step, index) => {
          const explanation = explanations.find(e => e.stepNumber === step.stepNumber);
          const isActive = step.stepId === activeStepId;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={step.stepId || index}>
              <Card 
                variant={isActive ? "elevation" : "outlined"}
                elevation={isActive ? 3 : 0}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
                onClick={() => handleStepClick(step)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Step {step.stepNumber}
                    </Typography>
                    <Chip 
                      label={step.type || 'generic'} 
                      size="small" 
                      color={getStepColor(step.type)}
                      sx={{ ml: 1 }}
                    />
                    {getStatusIcon(step)}
                  </Box>
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    {step.description}
                  </Typography>
                  
                  {explanation && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {explanation.explanation || 'No explanation available'}
                    </Typography>
                  )}
                  
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Depends on:
                      </Typography>
                      {step.dependsOn.map((depId) => {
                        const depNumber = depId.match(/step-(\d+)/)?.[1];
                        return (
                          <Chip 
                            key={depId} 
                            label={depNumber ? `Step ${depNumber}` : depId} 
                            size="small" 
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  
                  {isLive && step.status === 'in_progress' && (
                    <LinearProgress sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Reasoning Path
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Zoom out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ mx: 1 }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>
          
          <Tooltip title="Zoom in">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}>
        {showTimeline ? renderTimeline() : renderGridView()}
      </Box>
    </Paper>
  );
};

export default ReasoningPath;