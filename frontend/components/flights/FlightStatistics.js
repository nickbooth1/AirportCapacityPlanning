import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Colors for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#FAAAA3'
];

// Status colors for pie chart
const STATUS_COLORS = {
  'valid': '#4CAF50',
  'invalid': '#F44336',
  'warning': '#FFC107'
};

// Flight nature colors
const FLIGHT_NATURE_COLORS = {
  'A': '#2196F3', // Arrival - blue
  'D': '#FF9800'  // Departure - orange
};

/**
 * FlightStatistics Component
 * 
 * Displays statistics about flight data including counts, charts, 
 * and distribution graphs.
 */
const FlightStatistics = ({
  stats = null,
  loading = false
}) => {
  // Format data for hourly bar chart
  const formatHourlyData = (hourlyStats) => {
    return hourlyStats?.map(item => ({
      hour: `${item.hour}:00`,
      count: item.count
    })) || [];
  };
  
  // Format data for validation status pie chart
  const formatStatusData = (statusStats) => {
    return statusStats?.map(item => ({
      name: item.validation_status || 'Unknown',
      value: parseInt(item.count, 10)
    })) || [];
  };
  
  // Format data for flight nature (arrivals/departures)
  const formatFlightNatureData = (flightNatureStats) => {
    return flightNatureStats?.map(item => ({
      name: item.type === 'A' ? 'Arrival' : 'Departure',
      value: parseInt(item.count, 10)
    })) || [];
  };
  
  // Format data for airline bar chart
  const formatAirlineData = (airlineStats) => {
    return airlineStats?.map(item => ({
      name: item.airline_code,
      flights: parseInt(item.count, 10)
    })).slice(0, 5) || [];
  };
  
  // Get percentage for stat cards
  const getPercentage = (count, total) => {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  };
  
  // Format terminal data
  const formatTerminalData = (terminalStats) => {
    return terminalStats?.map(item => ({
      name: item.terminal || 'Unassigned',
      value: parseInt(item.count, 10)
    })) || [];
  };
  
  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Flight Statistics
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Paper>
    );
  }
  
  // No data state
  if (!stats) {
    return (
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Flight Statistics
        </Typography>
        <Typography variant="body1" color="textSecondary">
          No statistics available. Please adjust your filters or try again later.
        </Typography>
      </Paper>
    );
  }
  
  // Get counts for quick stats
  const totalFlights = stats.total || 0;
  const validFlights = stats.byStatus?.find(s => s.validation_status === 'valid')?.count || 0;
  const invalidFlights = stats.byStatus?.find(s => s.validation_status === 'invalid')?.count || 0;
  const arrivalFlights = stats.byFlightNature?.find(s => s.type === 'A')?.count || 0;
  const departureFlights = stats.byFlightNature?.find(s => s.type === 'D')?.count || 0;
  
  // Prepare chart data
  const hourlyData = formatHourlyData(stats.byHour);
  const statusData = formatStatusData(stats.byStatus);
  const airlineData = formatAirlineData(stats.byAirline);
  const terminalData = formatTerminalData(stats.byTerminal);
  const flightNatureData = formatFlightNatureData(stats.byFlightNature);
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Flight Statistics
      </Typography>
      
      {/* Quick stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Flights
              </Typography>
              <Typography variant="h4" sx={{ my: 1 }}>
                {totalFlights}
              </Typography>
              <Typography variant="body2">
                100% of all flights
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Valid Flights
              </Typography>
              <Typography variant="h4" sx={{ my: 1 }}>
                {validFlights}
              </Typography>
              <Typography variant="body2">
                {getPercentage(validFlights, totalFlights)}% of all flights
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Arrivals
              </Typography>
              <Typography variant="h4" sx={{ my: 1 }}>
                {arrivalFlights}
              </Typography>
              <Typography variant="body2">
                {getPercentage(arrivalFlights, totalFlights)}% of all flights
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Departures
              </Typography>
              <Typography variant="h4" sx={{ my: 1 }}>
                {departureFlights}
              </Typography>
              <Typography variant="body2">
                {getPercentage(departureFlights, totalFlights)}% of all flights
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Divider sx={{ mb: 4 }} />
      
      {/* Charts */}
      <Grid container spacing={3}>
        {/* Flight distribution by hour */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Flight Distribution by Hour
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2196F3" name="Flights" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Flight Nature distribution */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Arrivals vs Departures
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={flightNatureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {flightNatureData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Arrival' ? FLIGHT_NATURE_COLORS['A'] : FLIGHT_NATURE_COLORS['D']} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} flights`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Top airlines */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Top Airlines
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={airlineData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="flights" fill="#8884d8" name="Flights" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        {/* Terminal distribution */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Terminal Distribution
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={terminalData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {terminalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} flights`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

FlightStatistics.propTypes = {
  /** Flight statistics data */
  stats: PropTypes.shape({
    total: PropTypes.number,
    byStatus: PropTypes.arrayOf(
      PropTypes.shape({
        validation_status: PropTypes.string,
        count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      })
    ),
    byAirline: PropTypes.arrayOf(
      PropTypes.shape({
        airline_code: PropTypes.string,
        count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      })
    ),
    byTerminal: PropTypes.arrayOf(
      PropTypes.shape({
        terminal: PropTypes.string,
        count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      })
    ),
    byFlightNature: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      })
    ),
    byHour: PropTypes.arrayOf(
      PropTypes.shape({
        hour: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      })
    )
  }),
  
  /** Loading state */
  loading: PropTypes.bool
};

export default FlightStatistics; 