import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Divider,
  Button,
  CircularProgress,
  Grid
} from '@mui/material';
import CapacityChart from './CapacityChart';
import { Download as DownloadIcon } from '@mui/icons-material';

const CapacityResults = ({ results, loading, error }) => {
  const [tabValue, setTabValue] = useState(0);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!results) {
    return null;
  }
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Download capacity data as JSON
  const handleDownload = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'stand-capacity-results.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="capacity result tabs"
        >
          <Tab label="Best Case" id="capacity-tab-0" />
          <Tab label="Worst Case" id="capacity-tab-1" />
        </Tabs>
        
        <Button 
          startIcon={<DownloadIcon />} 
          onClick={handleDownload}
          variant="outlined"
          size="small"
        >
          Download Results
        </Button>
      </Box>
      
      <div role="tabpanel" hidden={tabValue !== 0} id="capacity-tabpanel-0">
        {tabValue === 0 && (
          <CapacityChart 
            data={results.bestCaseCapacity} 
            timeSlots={results.timeSlots}
            title="Best Case Capacity"
          />
        )}
      </div>
      
      <div role="tabpanel" hidden={tabValue !== 1} id="capacity-tabpanel-1">
        {tabValue === 1 && (
          <CapacityChart 
            data={results.worstCaseCapacity} 
            timeSlots={results.timeSlots}
            title="Worst Case Capacity"
          />
        )}
      </div>
      
      {results.metadata && (
        <Box mt={4}>
          <Divider />
          <Typography variant="subtitle1" gutterBottom mt={2}>
            Calculation Metadata
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                Calculated At: {new Date(results.metadata.calculatedAt).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                Stand Count: {results.metadata.stands.total}
                {results.metadata.stands.filtered !== results.metadata.stands.total && 
                  ` (${results.metadata.stands.filtered} filtered)`}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                Time Slots: {results.metadata.timeSlots.total}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default CapacityResults; 