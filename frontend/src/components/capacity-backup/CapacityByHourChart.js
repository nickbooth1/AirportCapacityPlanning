import React from 'react';
import { Box, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CapacityByHourChart = ({ data }) => {
  const theme = useTheme();
  
  // Define color scheme for aircraft size categories
  const colors = {
    'A': theme.palette.primary.light,
    'B': theme.palette.primary.main,
    'C': theme.palette.secondary.light,
    'D': theme.palette.secondary.main,
    'E': theme.palette.error.light,
    'F': theme.palette.error.main
  };
  
  // Ensure data is sorted by hour
  const sortedData = [...data].sort((a, b) => a.hour - b.hour);
  
  // Get all unique aircraft size categories
  const sizeCategories = sortedData.length > 0 
    ? Object.keys(sortedData[0].available_slots).sort()
    : [];
  
  // Format data for the chart
  const chartData = sortedData.map(hourData => {
    const formattedHour = `${hourData.hour}:00`;
    return {
      hour: formattedHour,
      ...hourData.available_slots
    };
  });
  
  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="hour"
            label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Available Slots', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value, name) => [value, `Aircraft Size ${name}`]}
            labelFormatter={(label) => `Hour: ${label}`}
          />
          <Legend />
          
          {sizeCategories.map(category => (
            <Bar 
              key={category}
              dataKey={category}
              name={category}
              fill={colors[category] || theme.palette.primary.main}
              stackId="a"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CapacityByHourChart; 