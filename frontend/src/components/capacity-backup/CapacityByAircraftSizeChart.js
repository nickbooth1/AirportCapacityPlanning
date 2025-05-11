import React from 'react';
import { Box, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CapacityByAircraftSizeChart = ({ data }) => {
  const theme = useTheme();
  
  // Define color scheme for aircraft size categories
  const COLORS = {
    'A': theme.palette.primary.light,
    'B': theme.palette.primary.main,
    'C': theme.palette.secondary.light,
    'D': theme.palette.secondary.main,
    'E': theme.palette.error.light,
    'F': theme.palette.error.main
  };
  
  // Format data for the chart
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0) // Only include categories with positive values
    .map(([name, value]) => ({
      name,
      value,
      label: `Size ${name}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort by size category
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <div><strong>Aircraft Size {data.name}</strong></div>
          <div>Capacity: {data.value} slots</div>
          <div>Percentage: {((data.value / getTotalValue()) * 100).toFixed(1)}%</div>
        </Box>
      );
    }
    return null;
  };
  
  // Calculate total value for percentage calculations
  const getTotalValue = () => {
    return chartData.reduce((sum, entry) => sum + entry.value, 0);
  };
  
  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="label"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name] || theme.palette.primary.main} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CapacityByAircraftSizeChart; 