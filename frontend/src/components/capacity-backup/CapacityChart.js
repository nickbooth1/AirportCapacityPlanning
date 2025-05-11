import React, { useState, useEffect } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CapacityChart = ({ data, timeSlots, title }) => {
  const [selectedAircraftType, setSelectedAircraftType] = useState('');
  const [chartData, setChartData] = useState([]);
  const [availableAircraftTypes, setAvailableAircraftTypes] = useState([]);
  
  useEffect(() => {
    if (!data || !timeSlots) return;
    
    // Get all unique aircraft types from the data
    const aircraftTypes = new Set();
    
    // First pass to collect all aircraft types
    Object.values(data).forEach(slotData => {
      Object.keys(slotData).forEach(type => {
        if (type !== 'undefined') {
          aircraftTypes.add(type);
        }
      });
    });
    
    setAvailableAircraftTypes(Array.from(aircraftTypes).sort());
    
    // Set default selected aircraft type if not already set
    if (!selectedAircraftType && aircraftTypes.size > 0) {
      setSelectedAircraftType(Array.from(aircraftTypes)[0]);
    }
    
    // Format data for the chart
    const formattedData = timeSlots.map(slot => {
      const slotData = data[slot.name] || {};
      
      return {
        name: slot.name,
        ...selectedAircraftType ? 
          { [selectedAircraftType]: slotData[selectedAircraftType] || 0 } : 
          {}
      };
    });
    
    setChartData(formattedData);
  }, [data, timeSlots, selectedAircraftType]);
  
  const handleAircraftTypeChange = (event) => {
    setSelectedAircraftType(event.target.value);
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="aircraft-type-label">Aircraft Type</InputLabel>
        <Select
          labelId="aircraft-type-label"
          id="aircraft-type-select"
          value={selectedAircraftType}
          onChange={handleAircraftTypeChange}
          label="Aircraft Type"
        >
          {availableAircraftTypes.map(type => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedAircraftType && (
              <Bar dataKey={selectedAircraftType} fill="#8884d8" name={`${selectedAircraftType}`} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default CapacityChart; 