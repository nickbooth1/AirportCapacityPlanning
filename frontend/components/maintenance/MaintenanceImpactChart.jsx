import React, { useState } from 'react';
import { 
  Box, Paper, Typography, CircularProgress, 
  ToggleButtonGroup, ToggleButton, FormControl,
  InputLabel, Select, MenuItem, useTheme
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * Component to display a comparative chart of capacity before/after maintenance
 */
const MaintenanceImpactChart = ({ data, loading }) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('comparative'); // 'comparative' or 'differential'
  const [aircraftType, setAircraftType] = useState('total');
  
  if (loading) {
    return (
      <Box textAlign="center" p={3}>
        <CircularProgress />
        <Typography variant="subtitle1" mt={2}>
          Loading chart data...
        </Typography>
      </Box>
    );
  }
  
  if (!data || !data.timeSlots || !data.baselineCapacity || !data.impactedCapacity) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="subtitle1" color="text.secondary">
          No chart data available
        </Typography>
      </Box>
    );
  }
  
  // Get all unique aircraft types from the data
  const getAircraftTypes = () => {
    const types = new Set();
    
    // Extract all aircraft types from baseline capacity data
    data.timeSlots.forEach(timeSlot => {
      const baselineSlot = data.baselineCapacity.byTimeSlot[timeSlot] || {};
      Object.keys(baselineSlot).forEach(type => types.add(type));
    });
    
    // Return as array with 'total' option first
    return ['total', ...Array.from(types)];
  };
  
  const aircraftTypes = getAircraftTypes();
  
  // Format data for the chart
  const formatChartData = () => {
    return data.timeSlots.map(timeSlot => {
      const baselineSlot = data.baselineCapacity.byTimeSlot[timeSlot] || {};
      const impactedSlot = data.impactedCapacity.byTimeSlot[timeSlot] || {};
      const differentialSlot = data.differential.byTimeSlot[timeSlot] || {};
      
      // Calculate totals for this time slot
      let baselineTotal = 0;
      let impactedTotal = 0;
      
      Object.values(baselineSlot).forEach(value => { baselineTotal += value; });
      Object.values(impactedSlot).forEach(value => { impactedTotal += value; });
      
      // Create the data point for this time slot
      const dataPoint = {
        name: timeSlot,
        // If showing a specific aircraft type, use that data, otherwise use totals
        baseline: aircraftType === 'total' ? baselineTotal : (baselineSlot[aircraftType] || 0),
        impacted: aircraftType === 'total' ? impactedTotal : (impactedSlot[aircraftType] || 0),
        differential: aircraftType === 'total' ? differentialSlot.total : (differentialSlot.byAircraftType?.[aircraftType] || 0)
      };
      
      return dataPoint;
    });
  };
  
  const chartData = formatChartData();
  
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  const handleAircraftTypeChange = (event) => {
    setAircraftType(event.target.value);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" mb={2}>
        Capacity Impact Visualization
      </Typography>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton value="comparative">
            Comparative View
          </ToggleButton>
          <ToggleButton value="differential">
            Differential View
          </ToggleButton>
        </ToggleButtonGroup>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Aircraft Type</InputLabel>
          <Select
            value={aircraftType}
            onChange={handleAircraftTypeChange}
            label="Aircraft Type"
          >
            <MenuItem value="total">All Aircraft Types</MenuItem>
            {aircraftTypes.filter(type => type !== 'total').map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Box height={400}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ angle: -45, textAnchor: 'end', dy: 10 }}
              height={60}
            />
            <YAxis 
              label={{ 
                value: 'Aircraft Movements', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip 
              formatter={(value, name) => {
                // Format based on the series name
                const formattedName = 
                  name === 'baseline' ? 'Without Maintenance' :
                  name === 'impacted' ? 'With Maintenance' : 
                  'Impact (Difference)';
                
                return [value, formattedName];
              }}
            />
            <Legend 
              formatter={(value) => {
                // Format legend labels
                if (value === 'baseline') return 'Without Maintenance';
                if (value === 'impacted') return 'With Maintenance';
                return 'Impact (Difference)';
              }}
            />
            
            {viewMode === 'comparative' ? (
              // Comparative view shows baseline and impacted bars
              <>
                <Bar 
                  dataKey="baseline" 
                  fill={theme.palette.primary.main} 
                  name="baseline"
                />
                <Bar 
                  dataKey="impacted" 
                  fill={theme.palette.secondary.main} 
                  name="impacted"
                />
              </>
            ) : (
              // Differential view shows only the difference
              <Bar 
                dataKey="differential" 
                fill={theme.palette.error.main} 
                name="differential"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default MaintenanceImpactChart; 