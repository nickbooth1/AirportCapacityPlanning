import React from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

/**
 * CapacityImpactChart component
 * Displays the impact of maintenance on daily capacity as a stacked bar chart
 * @param {Object} props Component props
 * @param {Array} props.data Impact analysis data
 * @param {boolean} props.loading Loading state
 * @param {Object} props.error Error state
 * @returns {JSX.Element} Rendered component
 */
const CapacityImpactChart = ({ data, loading, error }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" border="1px dashed #ccc">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" border="1px dashed #ccc">
        <Typography color="error">
          Error loading capacity impact data: {error.message}
        </Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" border="1px dashed #ccc">
        <Typography>No capacity impact data available for the selected period.</Typography>
      </Box>
    );
  }

  // Transform data for the chart
  const chartData = data.map(dailyData => {
    // Format date for display
    const formattedDate = format(parseISO(dailyData.date), 'MMM dd');
    
    // Calculate the stacked segments
    const definiteImpact = {
      narrowBody: dailyData.maintenanceImpacts.definite.reduction.narrowBody || 0,
      wideBody: dailyData.maintenanceImpacts.definite.reduction.wideBody || 0,
      total: dailyData.maintenanceImpacts.definite.reduction.total || 0
    };
    
    const potentialImpact = {
      narrowBody: dailyData.maintenanceImpacts.potential.reduction.narrowBody || 0,
      wideBody: dailyData.maintenanceImpacts.potential.reduction.wideBody || 0,
      total: dailyData.maintenanceImpacts.potential.reduction.total || 0
    };
    
    return {
      date: formattedDate,
      // Base segment (remaining capacity)
      remainingCapacity: dailyData.finalNetCapacity.total,
      // Middle segment (potential impact)
      potentialImpact: potentialImpact.total,
      // Top segment (definite impact)
      definiteImpact: definiteImpact.total,
      // Store the original data for tooltip
      originalData: dailyData
    };
  });

  // Custom tooltip to show maintenance requests on hover
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    // Find the original data for this date
    const dataPoint = payload[0].payload;
    const originalData = dataPoint.originalData;

    // Get the maintenance requests for this date
    const definiteRequests = originalData.maintenanceImpacts.definite.requests || [];
    const potentialRequests = originalData.maintenanceImpacts.potential.requests || [];

    return (
      <Paper sx={{ p: 2, maxWidth: '300px' }}>
        <Typography variant="subtitle2" gutterBottom>
          {label} - Capacity Impact
        </Typography>
        <Typography variant="body2">
          Original Capacity: {originalData.originalDailyCapacity.total}
        </Typography>
        <Typography variant="body2">
          Net Available Capacity: {originalData.finalNetCapacity.total}
        </Typography>
        
        {definiteRequests.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, color: 'error.main' }}>
              Definite Impact ({definiteRequests.length} requests):
            </Typography>
            {definiteRequests.slice(0, 3).map((req, idx) => (
              <Typography key={idx} variant="body2" sx={{ fontSize: '0.8rem' }}>
                • Stand {req.standCode}: {req.title}
              </Typography>
            ))}
            {definiteRequests.length > 3 && (
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                ...and {definiteRequests.length - 3} more
              </Typography>
            )}
          </>
        )}
        
        {potentialRequests.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, color: 'text.secondary' }}>
              Potential Impact ({potentialRequests.length} requests):
            </Typography>
            {potentialRequests.slice(0, 3).map((req, idx) => (
              <Typography key={idx} variant="body2" sx={{ fontSize: '0.8rem' }}>
                • Stand {req.standCode}: {req.title}
              </Typography>
            ))}
            {potentialRequests.length > 3 && (
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                ...and {potentialRequests.length - 3} more
              </Typography>
            )}
          </>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%', height: 400, mb: 4, border: '1px solid #e0e0e0' }}>
      <Typography variant="h6" gutterBottom>
        Daily Capacity Impact from Maintenance
      </Typography>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            stackOffset="expand"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: 'Capacity (Aircraft Movements)', angle: -90, position: 'insideLeft', offset: -5 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="remainingCapacity" 
              name="Available Capacity" 
              stackId="a" 
              fill="#4CAF50" 
            />
            <Bar 
              dataKey="potentialImpact" 
              name="Potential Impact" 
              stackId="a" 
              fill="#9E9E9E" 
            />
            <Bar 
              dataKey="definiteImpact" 
              name="Definite Impact" 
              stackId="a" 
              fill="#F44336" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Box>
  );
};

export default CapacityImpactChart; 