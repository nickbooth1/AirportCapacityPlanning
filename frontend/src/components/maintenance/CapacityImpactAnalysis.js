import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, ButtonGroup, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, startOfDay, endOfDay, addWeeks, addMonths, subDays } from 'date-fns';
import CapacityImpactChart from './CapacityImpactChart';
import { getCapacityImpactAnalysis } from '../../api/capacityApi';

/**
 * CapacityImpactAnalysis component
 * Handles date selection, data fetching, and rendering of the capacity impact chart
 * @returns {JSX.Element} Rendered component
 */
const CapacityImpactAnalysis = () => {
  // State for date range selection
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(addDays(new Date(), 7)));
  const [selectedRange, setSelectedRange] = useState('7days');
  
  // State for the API data
  const [impactData, setImpactData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch impact data when date range changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Format dates for the API
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Call the API
        const response = await getCapacityImpactAnalysis(formattedStartDate, formattedEndDate);
        console.log('API Response:', response); // Debug output
        setImpactData(response.dailyImpacts || []);
      } catch (err) {
        console.error('Error fetching capacity impact data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  // Handle date range button clicks
  const handleRangeChange = (range) => {
    const now = new Date();
    let newStartDate = startOfDay(now);
    let newEndDate;
    
    switch (range) {
      case '7days':
        newEndDate = endOfDay(addDays(now, 6)); // 7 days including today
        break;
      case '14days':
        newEndDate = endOfDay(addDays(now, 13)); // 14 days including today
        break;
      case '30days':
        newEndDate = endOfDay(addDays(now, 29)); // 30 days including today
        break;
      case 'month':
        newEndDate = endOfDay(addMonths(now, 1));
        break;
      case 'quarter':
        newEndDate = endOfDay(addMonths(now, 3));
        break;
      default:
        newEndDate = endOfDay(addDays(now, 6));
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setSelectedRange(range);
  };

  // Handle manual date changes
  const handleStartDateChange = (date) => {
    setStartDate(startOfDay(date));
    setSelectedRange('custom');
  };

  const handleEndDateChange = (date) => {
    setEndDate(endOfDay(date));
    setSelectedRange('custom');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 3, mb: 4, minHeight: '600px' }}>
        <Typography variant="h5" gutterBottom>
          Maintenance Impact on Stand Capacity
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button 
                onClick={() => handleRangeChange('7days')}
                variant={selectedRange === '7days' ? 'contained' : 'outlined'}
              >
                7 Days
              </Button>
              <Button 
                onClick={() => handleRangeChange('14days')}
                variant={selectedRange === '14days' ? 'contained' : 'outlined'}
              >
                14 Days
              </Button>
              <Button 
                onClick={() => handleRangeChange('30days')}
                variant={selectedRange === '30days' ? 'contained' : 'outlined'}
              >
                30 Days
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button 
                onClick={() => handleRangeChange('month')}
                variant={selectedRange === 'month' ? 'contained' : 'outlined'}
              >
                Month
              </Button>
              <Button 
                onClick={() => handleRangeChange('quarter')}
                variant={selectedRange === 'quarter' ? 'contained' : 'outlined'}
              >
                Quarter
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="date-range-label">Custom Range</InputLabel>
              <Select
                labelId="date-range-label"
                value={selectedRange}
                label="Custom Range"
                onChange={(e) => handleRangeChange(e.target.value)}
              >
                <MenuItem value="7days">Next 7 Days</MenuItem>
                <MenuItem value="14days">Next 14 Days</MenuItem>
                <MenuItem value="30days">Next 30 Days</MenuItem>
                <MenuItem value="month">Next Month</MenuItem>
                <MenuItem value="quarter">Next Quarter</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              sx={{ width: '100%' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate}
              sx={{ width: '100%' }}
            />
          </Grid>
        </Grid>
        
        <Box mt={3} sx={{ height: 400, width: '100%' }}>
          {loading && <Typography>Loading data...</Typography>}
          {error && <Typography color="error">Error: {error.message}</Typography>}
          {!loading && !error && impactData.length === 0 && (
            <Typography>No impact data available for the selected period.</Typography>
          )}
          <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto', background: '#f5f5f5', padding: '8px' }}>
            {JSON.stringify(impactData, null, 2)}
          </pre>
          <CapacityImpactChart
            data={impactData}
            loading={loading}
            error={error}
          />
        </Box>
        
        {impactData.length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Typography variant="body1">
              {`Analyzing capacity impact from ${format(startDate, 'MMM dd, yyyy')} to ${format(endDate, 'MMM dd, yyyy')}`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • Total Maintenance Requests: {impactData.reduce((total, day) => 
                total + (day.maintenanceImpacts.definite.requests.length + day.maintenanceImpacts.potential.requests.length), 0)}
            </Typography>
            <Typography variant="body2">
              • Average Daily Impact: {Math.round(impactData.reduce((total, day) => 
                total + (day.originalDailyCapacity.total - day.finalNetCapacity.total), 0) / impactData.length)} aircraft movements
            </Typography>
            <Typography variant="body2">
              • Maximum Daily Impact: {Math.max(...impactData.map(day => 
                day.originalDailyCapacity.total - day.finalNetCapacity.total))} aircraft movements
            </Typography>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default CapacityImpactAnalysis; 