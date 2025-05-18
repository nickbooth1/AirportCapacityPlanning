import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Grid,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoIcon from '@mui/icons-material/Info';
import EmbeddedVisualization from './EmbeddedVisualization';

/**
 * Component for visualizing multi-step reasoning processes
 */
const ReasoningVisualizer = ({ reasoning, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [expanded, setExpanded] = useState({});
  const [showAll, setShowAll] = useState(false);

  // Check if reasoning data is available
  if (!reasoning || !reasoning.steps || reasoning.steps.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" color="text.secondary">
          No reasoning steps available for this query.
        </Typography>
      </Paper>
    );
  }

  const { steps, stepExecutionSummary, explanations = [] } = reasoning;

  // Handle step navigation
  const handleNext = () => {
    setActiveStep((prevActiveStep) => Math.min(prevActiveStep + 1, steps.length));
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => Math.max(prevActiveStep - 1, 0));
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Toggle expanded state for a specific step detail
  const toggleExpanded = (stepId) => {
    setExpanded((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  // Toggle showing all steps at once
  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  // Get chip color based on step type
  const getStepTypeColor = (type) => {
    const colorMap = {
      calculation: 'primary',
      parameter_extraction: 'secondary',
      data_retrieval: 'info',
      validation: 'success',
      comparison: 'warning',
      recommendation: 'error',
      default: 'default',
    };
    return colorMap[type] || colorMap.default;
  };

  // Get step status icon
  const getStepStatusIcon = (step) => {
    const explanation = explanations.find((e) => e.stepNumber === step.stepNumber);
    if (!explanation) return null;
    
    return explanation.success ? (
      <CheckCircleOutlineIcon color="success" sx={{ ml: 1 }} />
    ) : (
      <ErrorOutlineIcon color="error" sx={{ ml: 1 }} />
    );
  };

  return (
    <>
      {stepExecutionSummary && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f9ff' }}>
          <Box display="flex" alignItems="center" mb={1}>
            <InfoIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">Reasoning Approach</Typography>
          </Box>
          <Typography variant="body1">{stepExecutionSummary}</Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={toggleShowAll}
          startIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {showAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </Box>

      {showAll ? (
        // Expanded view showing all steps at once
        <Paper sx={{ p: 2, mb: 2 }}>
          {steps.map((step, index) => {
            const stepExplanation = explanations.find((e) => e.stepNumber === step.stepNumber);
            
            return (
              <Box key={step.stepId || index} sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    label={`Step ${step.stepNumber}`}
                    color="primary"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={step.type || 'generic'}
                    color={getStepTypeColor(step.type)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                    {step.description}
                  </Typography>
                  {getStepStatusIcon(step)}
                </Box>
                
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {stepExplanation?.explanation || step.description}
                </Typography>
                
                <Box
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'primary.main',
                    mb: 1
                  }}
                  onClick={() => toggleExpanded(step.stepId)}
                >
                  <Typography variant="body2">
                    {expanded[step.stepId] ? 'Hide Details' : 'Show Details'}
                  </Typography>
                  {expanded[step.stepId] ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </Box>
                
                <Collapse in={expanded[step.stepId]}>
                  <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider', mb: 2 }}>
                    {step.parameters && Object.keys(step.parameters).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Parameters:
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          {Object.entries(step.parameters).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {step.dependsOn && step.dependsOn.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Depends on steps:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 2 }}>
                          {step.dependsOn.map((depId) => {
                            const depNumber = depId.match(/step-(\d+)/)?.[1];
                            return (
                              <Chip 
                                key={depId} 
                                label={`Step ${depNumber || depId}`} 
                                size="small" 
                                variant="outlined"
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                    
                    {stepExplanation?.result && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Result:
                        </Typography>
                        <Box 
                          sx={{ 
                            pl: 2, 
                            p: 1, 
                            backgroundColor: 'background.paper',
                            borderRadius: 1,
                            maxHeight: '200px',
                            overflow: 'auto'
                          }}
                        >
                          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                            {JSON.stringify(stepExplanation.result, null, 2)}
                          </pre>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
                
                {index < steps.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            );
          })}
        </Paper>
      ) : (
        // Stepper view showing one step at a time
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => {
              const stepExplanation = explanations.find((e) => e.stepNumber === step.stepNumber);
              
              return (
                <Step key={step.stepId || index}>
                  <StepLabel
                    optional={
                      <Box display="flex" alignItems="center">
                        <Chip
                          label={step.type || 'generic'}
                          color={getStepTypeColor(step.type)}
                          size="small"
                        />
                        {getStepStatusIcon(step)}
                      </Box>
                    }
                  >
                    <Typography variant="subtitle1">{step.description}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {stepExplanation?.explanation || step.description}
                    </Typography>
                    
                    <Box
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'primary.main',
                        mb: 1
                      }}
                      onClick={() => toggleExpanded(step.stepId)}
                    >
                      <Typography variant="body2">
                        {expanded[step.stepId] ? 'Hide Details' : 'Show Details'}
                      </Typography>
                      {expanded[step.stepId] ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </Box>
                    
                    <Collapse in={expanded[step.stepId]}>
                      <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider', mb: 2 }}>
                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Parameters:
                            </Typography>
                            <Box sx={{ pl: 2 }}>
                              {Object.entries(step.parameters).map(([key, value]) => (
                                <Typography key={key} variant="body2">
                                  <strong>{key}:</strong> {JSON.stringify(value)}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {step.dependsOn && step.dependsOn.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Depends on steps:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 2 }}>
                              {step.dependsOn.map((depId) => {
                                const depNumber = depId.match(/step-(\d+)/)?.[1];
                                return (
                                  <Chip 
                                    key={depId} 
                                    label={`Step ${depNumber || depId}`} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                        
                        {stepExplanation?.result && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Result:
                            </Typography>
                            <Box 
                              sx={{ 
                                pl: 2, 
                                p: 1, 
                                backgroundColor: 'background.paper',
                                borderRadius: 1,
                                maxHeight: '200px',
                                overflow: 'auto'
                              }}
                            >
                              <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                                {JSON.stringify(stepExplanation.result, null, 2)}
                              </pre>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                    
                    <Box sx={{ mb: 2, mt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        {index === steps.length - 1 ? 'Finish' : 'Continue'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
          
          {activeStep === steps.length && (
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ mt: 2, mb: 2 }}>
                All reasoning steps completed.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button onClick={handleReset} sx={{ mr: 1 }}>
                  Review Steps
                </Button>
                <Button variant="contained" onClick={handleComplete}>
                  Show Final Answer
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
};

export default ReasoningVisualizer;