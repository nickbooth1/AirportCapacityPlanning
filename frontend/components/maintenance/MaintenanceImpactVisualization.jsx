import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, 
  CircularProgress, Alert, Divider
} from '@mui/material';
import { parseISO } from 'date-fns';
import MaintenanceImpactSummary from './MaintenanceImpactSummary';
import MaintenanceImpactChart from './MaintenanceImpactChart';
import MaintenanceImpactText from './MaintenanceImpactText';
import { getRequestCapacityImpact } from '../../api/maintenanceApi';

/**
 * A component that integrates all maintenance impact visualization components
 */
const MaintenanceImpactVisualization = ({ requestId }) => {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  useEffect(() => {
    fetchImpactData();
  }, [requestId]);
  
  const fetchImpactData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getRequestCapacityImpact(requestId);
      
      // We don't need to parse date fields here as they're not being returned
      // by the server for the summary object
      
      setImpactData(data);
    } catch (err) {
      console.error('Error fetching capacity impact data:', err);
      setError(err.message || 'Failed to load capacity impact data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  if (loading) {
    return (
      <Box textAlign="center" p={5}>
        <CircularProgress size={40} />
        <Typography variant="h6" mt={2}>
          Calculating capacity impact...
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          This may take a few moments as we analyze the full impact on stand capacity
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 3, mb: 3 }}>
        <Typography variant="subtitle1">Error loading capacity impact data</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }
  
  if (!impactData) {
    return (
      <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
        <Typography variant="subtitle1">No capacity impact data available</Typography>
        <Typography variant="body2">
          The capacity impact could not be calculated for this maintenance request.
        </Typography>
      </Alert>
    );
  }
  
  return (
    <Box mt={3} mb={3}>
      <Typography variant="h4" mb={3}>
        Stand Capacity Impact Analysis
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label="Summary" />
          <Tab label="Chart Visualization" />
          <Tab label="Detailed Analysis" />
        </Tabs>
        <Divider />
        
        {/* Summary Tab */}
        {activeTab === 0 && (
          <Box p={3}>
            <MaintenanceImpactSummary data={impactData} loading={false} />
          </Box>
        )}
        
        {/* Chart Visualization Tab */}
        {activeTab === 1 && (
          <Box p={3}>
            <MaintenanceImpactChart data={impactData} loading={false} />
          </Box>
        )}
        
        {/* Detailed Analysis Tab */}
        {activeTab === 2 && (
          <Box p={3}>
            <MaintenanceImpactText data={impactData} loading={false} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default MaintenanceImpactVisualization; 