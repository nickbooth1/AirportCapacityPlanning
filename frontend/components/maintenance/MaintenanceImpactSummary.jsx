import React from 'react';
import { 
  Box, Typography, Paper, Grid, Chip,
  CircularProgress, useTheme
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  AirplanemodeActive as AirplaneIcon
} from '@mui/icons-material';

/**
 * Component to display a summary of capacity impact metrics
 */
const MaintenanceImpactSummary = ({ data, loading }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box textAlign="center" p={3}>
        <CircularProgress />
        <Typography variant="subtitle1" mt={2}>
          Loading impact data...
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

  // Get impact severity level
  const getImpactSeverity = () => {
    const { percentageReduction } = summary;
    if (percentageReduction < 5) return 'Minimal';
    if (percentageReduction < 10) return 'Low';
    if (percentageReduction < 20) return 'Medium';
    if (percentageReduction < 30) return 'High';
    return 'Critical';
  };

  const severityColor = getSeverityColor(summary.percentageReduction);
  const impactSeverity = getImpactSeverity();

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" mb={3} gutterBottom>
        Capacity Impact Summary
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stand Info */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Affected Stand
            </Typography>
            <Typography variant="h6">
              {summary.standName}
            </Typography>
          </Box>
        </Grid>
        
        {/* Duration */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              <Box display="flex" alignItems="center">
                <ScheduleIcon fontSize="small" sx={{ mr: 0.5 }} />
                Duration
              </Box>
            </Typography>
            <Typography variant="h6">
              {summary.totalAffectedHours} hours
            </Typography>
          </Box>
        </Grid>
        
        {/* Impact Level */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              <Box display="flex" alignItems="center">
                <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                Impact Level
              </Box>
            </Typography>
            <Chip 
              label={impactSeverity}
              sx={{ 
                backgroundColor: severityColor, 
                color: '#fff',
                fontWeight: 'bold',
                mt: 0.5
              }} 
            />
          </Box>
        </Grid>
        
        {/* Most Affected Aircraft */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              <Box display="flex" alignItems="center">
                <AirplaneIcon fontSize="small" sx={{ mr: 0.5 }} />
                Most Affected Aircraft
              </Box>
            </Typography>
            <Typography variant="h6">
              {summary.mostAffectedAircraftType || 'None'}
            </Typography>
          </Box>
        </Grid>
        
        {/* Capacity Reduction */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Total Capacity Reduction
            </Typography>
            <Typography variant="h5" fontWeight="bold" color={severityColor}>
              {summary.totalCapacityReduction} aircraft movements
            </Typography>
          </Box>
        </Grid>
        
        {/* Percentage Reduction */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Percentage Reduction
            </Typography>
            <Typography variant="h5" fontWeight="bold" color={severityColor}>
              {summary.percentageReduction}%
            </Typography>
          </Box>
        </Grid>
        
        {/* Peak Impact Details */}
        <Grid item xs={12}>
          <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Peak Impact
            </Typography>
            <Typography variant="body1">
              {summary.peakReductionValue} aircraft movements during {summary.peakImpactTimeSlot}
            </Typography>
          </Box>
        </Grid>
        
        {/* Impact Description */}
        <Grid item xs={12}>
          <Box mt={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Impact Analysis
            </Typography>
            <Typography variant="body1" mt={1}>
              {summary.impactDescription}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MaintenanceImpactSummary; 