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
import CapacityTable from './CapacityTable';
import CapacityChart from './CapacityChart';
import { Download as DownloadIcon } from '@mui/icons-material';

const CapacityResults = ({ results, loading, error }) => {
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('table');
  
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
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  const handleExportCSV = () => {
    // Implement CSV export logic
    const capacity = tabValue === 0 ? results.bestCaseCapacity : results.worstCaseCapacity;
    const scenarioName = tabValue === 0 ? 'Best Case' : 'Worst Case';
    
    // Extract all aircraft types across all time slots
    const aircraftTypes = new Set();
    Object.values(capacity).forEach(slotData => {
      Object.keys(slotData).forEach(type => aircraftTypes.add(type));
    });
    
    // Create CSV header row
    let csv = `Time Slot,${Array.from(aircraftTypes).join(',')}\n`;
    
    // Add data rows
    results.timeSlots.forEach(slot => {
      const slotData = capacity[slot.name] || {};
      const rowValues = Array.from(aircraftTypes).map(type => slotData[type] || 0);
      csv += `${slot.name},${rowValues.join(',')}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stand_capacity_${scenarioName.replace(' ', '')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Capacity Results</Typography>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Best Case Capacity" />
          <Tab label="Worst Case Capacity" />
        </Tabs>
      </Box>
      
      <Box mb={2}>
        <Button
          variant={viewMode === 'table' ? 'contained' : 'outlined'}
          onClick={() => handleViewModeChange('table')}
          size="small"
          sx={{ mr: 1 }}
        >
          Table View
        </Button>
        <Button
          variant={viewMode === 'chart' ? 'contained' : 'outlined'}
          onClick={() => handleViewModeChange('chart')}
          size="small"
        >
          Chart View
        </Button>
      </Box>
      
      <Box>
        {viewMode === 'table' ? (
          <CapacityTable 
            data={tabValue === 0 ? results.bestCaseCapacity : results.worstCaseCapacity} 
            timeSlots={results.timeSlots}
            scenario={tabValue === 0 ? 'best' : 'worst'}
          />
        ) : (
          <CapacityChart 
            data={tabValue === 0 ? results.bestCaseCapacity : results.worstCaseCapacity} 
            timeSlots={results.timeSlots}
            scenario={tabValue === 0 ? 'best' : 'worst'}
          />
        )}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom>Calculation Metadata</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Calculated At: {new Date(results.metadata.calculatedAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Stand Count: {results.metadata.stands.total}
              {results.metadata.stands.filtered !== undefined && 
                ` (${results.metadata.stands.filtered} filtered)`}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Aircraft Type Count: {results.metadata.aircraftTypes.total}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default CapacityResults; 