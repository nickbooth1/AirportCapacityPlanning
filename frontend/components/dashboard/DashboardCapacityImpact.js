import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const timeRanges = {
  week: {
    label: 'Week',
    getRange: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 })
    })
  },
  month: {
    label: 'Month',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  },
  quarter: {
    label: 'Quarter',
    getRange: () => ({
      start: startOfQuarter(new Date()),
      end: endOfQuarter(new Date())
    })
  }
};

const DashboardCapacityImpact = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (start, end) => {
    try {
      setLoading(true);
      const startDateStr = format(start, 'yyyy-MM-dd');
      const endDateStr = format(end, 'yyyy-MM-dd');
      
      // Direct fetch to the API
      const url = new URL(`${API_BASE_URL}/api/capacity/impact-analysis`);
      url.searchParams.append('startDate', startDateStr);
      url.searchParams.append('endDate', endDateStr);
      
      console.log('Dashboard capacity impact fetch URL:', url.toString());
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch capacity impact data');
      }
      
      const result = await response.json();
      setData(result.dailyImpacts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard capacity impact:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { start, end } = timeRanges[timeRange].getRange();
    fetchData(start, end);
  }, [timeRange]);

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <Typography>No capacity impact data available for the selected period.</Typography>
      </Box>
    );
  }

  const chartData = data.map(dailyData => ({
    date: format(parseISO(dailyData.date), 'MMM dd'),
    remainingCapacity: dailyData.finalNetCapacity.total,
    potentialImpact: dailyData.maintenanceImpacts.potential.reduction.total || 0,
    definiteImpact: dailyData.maintenanceImpacts.definite.reduction.total || 0,
    originalData: dailyData
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const originalData = dataPoint.originalData;

    return (
      <Paper sx={{ p: 1.5, maxWidth: '250px' }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body2" fontSize="0.8rem">
          Original Capacity: {originalData.originalDailyCapacity.total}
        </Typography>
        <Typography variant="body2" fontSize="0.8rem">
          Net Available: {originalData.finalNetCapacity.total}
        </Typography>
        <Typography variant="body2" fontSize="0.8rem" color="error.main">
          Definite Impact: {originalData.maintenanceImpacts.definite.reduction.total || 0}
        </Typography>
        <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
          Potential Impact: {originalData.maintenanceImpacts.potential.reduction.total || 0}
        </Typography>
      </Paper>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Maintenance Impact on Capacity</Typography>
        <ToggleButtonGroup
          size="small"
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
        >
          {Object.entries(timeRanges).map(([key, { label }]) => (
            <ToggleButton key={key} value={key}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      
      <Box height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 40, bottom: 40 }}
            stackOffset="expand"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="remainingCapacity"
              name="Available"
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
      </Box>
    </Paper>
  );
};

export default DashboardCapacityImpact; 