import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
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

const CapacityChart = ({ data, timeSlots, scenario }) => {
  const theme = useTheme();
  
  // Extract all unique aircraft types across all time slots
  const aircraftTypes = new Set();
  
  Object.values(data).forEach(slotData => {
    Object.keys(slotData).forEach(aircraftType => {
      aircraftTypes.add(aircraftType);
    });
  });
  
  const sortedAircraftTypes = Array.from(aircraftTypes).sort();
  
  // Transform data for the chart
  const chartData = timeSlots.map(slot => {
    const slotData = data[slot.name] || {};
    const result = {
      name: slot.name,
      timeRange: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
    };
    
    sortedAircraftTypes.forEach(aircraftType => {
      result[aircraftType] = slotData[aircraftType] || 0;
    });
    
    return result;
  });
  
  // Generate colors for different aircraft types
  const generateColor = (index, total) => {
    const baseColor = scenario === 'best' 
      ? theme.palette.success.main 
      : theme.palette.warning.main;
    
    // Create a lighter or darker variation
    const opacity = 0.7 + (index / total) * 0.3;
    return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0');
  };
  
  return (
    <Box height={400}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                  {payload.value}
                </text>
                <text x={0} y={0} dy={30} textAnchor="middle" fill="#999" fontSize={10}>
                  {chartData.find(item => item.name === payload.value)?.timeRange}
                </text>
              </g>
            )}
          />
          <YAxis label={{ value: 'Aircraft Count', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [value, `Aircraft Type: ${name}`]}
            labelFormatter={(label) => {
              const item = chartData.find(item => item.name === label);
              return `${label} (${item?.timeRange})`;
            }}
          />
          <Legend />
          {sortedAircraftTypes.map((aircraftType, index) => (
            <Bar 
              key={aircraftType}
              dataKey={aircraftType} 
              name={aircraftType}
              fill={generateColor(index, sortedAircraftTypes.length)}
              stackId={scenario === 'stacked' ? 'a' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CapacityChart; 