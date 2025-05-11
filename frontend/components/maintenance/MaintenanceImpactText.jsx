import React from 'react';
import { 
  Box, Typography, Paper, Alert,
  CircularProgress, useTheme
} from '@mui/material';

/**
 * Component to display a human-readable explanation of capacity impact
 */
const MaintenanceImpactText = ({ data, loading }) => {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Box textAlign="center" p={3}>
        <CircularProgress />
        <Typography variant="subtitle1" mt={2}>
          Loading impact analysis...
        </Typography>
      </Box>
    );
  }
  
  if (!data || !data.summary) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="subtitle1" color="text.secondary">
          No impact data available
        </Typography>
      </Box>
    );
  }
  
  const { summary } = data;
  
  // Determine severity color based on percentage reduction
  const getSeverityColor = (percentage) => {
    if (percentage < 5) return theme.palette.success.main;
    if (percentage < 10) return theme.palette.info.main;
    if (percentage < 20) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  
  const severityColor = getSeverityColor(summary.percentageReduction);
  
  // Generate the impact explanation text
  const generateExplanation = () => {
    const messages = [];
    
    // Main impact statement
    messages.push(`The maintenance request for ${summary.standName} will result in a ${summary.percentageReduction}% reduction in overall stand capacity during the maintenance period of ${summary.totalAffectedHours} hours.`);
    
    // Aircraft movements impact
    messages.push(`${summary.totalCapacityReduction} aircraft movements will be affected during this period.`);
    
    // Peak impact
    if (summary.peakImpactTimeSlot && summary.peakReductionValue) {
      messages.push(`The highest impact will occur during ${summary.peakImpactTimeSlot}, with a reduction of ${summary.peakReductionValue} aircraft movements.`);
    }
    
    // Aircraft type impact
    if (summary.mostAffectedAircraftType) {
      messages.push(`The most affected aircraft type will be ${summary.mostAffectedAircraftType}.`);
    }
    
    // Impact recommendation
    let recommendationMsg = '';
    if (summary.percentageReduction < 5) {
      recommendationMsg = 'This maintenance has minimal impact on airport operations and can proceed without special considerations.';
    } else if (summary.percentageReduction < 10) {
      recommendationMsg = 'This maintenance has low impact on operations but operational teams should be notified in advance.';
    } else if (summary.percentageReduction < 20) {
      recommendationMsg = 'This maintenance has a noticeable impact on operations. Consider scheduling during off-peak hours if possible.';
    } else if (summary.percentageReduction < 30) {
      recommendationMsg = 'This maintenance will significantly affect capacity. Close coordination with operational teams is recommended, and alternative stands should be designated.';
    } else {
      recommendationMsg = 'This maintenance has a critical impact on capacity. Consider rescheduling to a less busy period or breaking into smaller maintenance windows if possible.';
    }
    
    messages.push(recommendationMsg);
    
    return messages;
  };
  
  const explanationParagraphs = generateExplanation();
  
  // Get alert severity based on percentage reduction
  const getAlertSeverity = (percentage) => {
    if (percentage < 5) return 'success';
    if (percentage < 10) return 'info';
    if (percentage < 20) return 'warning';
    return 'error';
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" mb={3}>
        Impact Analysis
      </Typography>
      
      <Alert 
        severity={getAlertSeverity(summary.percentageReduction)}
        sx={{ mb: 3 }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {summary.impactDescription}
        </Typography>
      </Alert>
      
      <Box sx={{ ml: 2 }}>
        {explanationParagraphs.map((paragraph, index) => (
          <Typography 
            key={index} 
            variant="body1" 
            paragraph 
            sx={{ 
              fontWeight: index === 0 ? 'bold' : 'normal',
              color: index === 0 ? severityColor : 'text.primary'
            }}
          >
            {paragraph}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

export default MaintenanceImpactText; 