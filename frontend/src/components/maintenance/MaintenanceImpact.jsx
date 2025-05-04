// components/maintenance/MaintenanceImpact.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, CircularProgress, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'; // Use V3 adapter
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../lib/api';

const MaintenanceImpact = () => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    date.setHours(23, 59, 59, 999);
    return date;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [impactData, setImpactData] = useState(null);
  
  const fetchImpactData = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    if (startDate >= endDate) {
      setError('Start date must be before end date');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await api.get(`/api/maintenance/impact?${params.toString()}`);
      setImpactData(response.data);
    } catch (err) {
      setError('Failed to fetch maintenance impact data. Please ensure the backend is running and migrations are applied.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchImpactData();
  }, []); // Fetch on initial load
  
  const handleApplyDates = () => {
    fetchImpactData();
  };
  
  // Prepare data for the chart
  const prepareChartData = () => {
    if (!impactData || !impactData.impactByDay) return [];
    // Sort data by date for the chart
    return Object.entries(impactData.impactByDay)
        .map(([date, data]) => ({ ...data, date }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString() })); 
  };
  
  return (
    <Box>
      {/* Date Range Selection */} 
      <Paper sx={{ p: 2, mb: 3 }}>
         <Typography variant="h6" gutterBottom>Select Date Range</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField fullWidth {...params} size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={5} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField fullWidth {...params} size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={2} md={4}>
            <Button 
              variant="contained" 
              onClick={handleApplyDates} 
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Apply'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error display */} 
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      {/* Loading indicator */} 
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Impact Summary */} 
      {impactData && !loading && (
        <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="overline" color="textSecondary">Total Stands Affected</Typography>
                    <Typography variant="h3">{impactData.totalStandsAffected}</Typography>
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="overline" color="textSecondary">Total Maintenance Hours</Typography>
                    <Typography variant="h3">{Math.round(impactData.totalMaintenanceHours)}</Typography>
                </Paper>
            </Grid>

            {/* Daily Impact Chart */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Daily Impact</Typography>
                    <Box sx={{ height: 400, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prepareChartData()} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" angle={-45} textAnchor="end" height={70} interval={0}/>
                            <YAxis yAxisId="left" label={{ value: 'Stands Affected', angle: -90, position: 'insideLeft' }}/>
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Hours', angle: 90, position: 'insideRight' }}/>
                            <Tooltip />
                            <Legend verticalAlign="top" height={36}/>
                            <Bar yAxisId="left" dataKey="standsAffected" name="Stands Affected" fill="#8884d8" />
                            <Bar yAxisId="right" dataKey="hours" name="Maintenance Hours" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
            
            {/* Impact By Stand */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Impact By Stand</Typography>
                    <TableContainer>
                    <Table size="small">
                        <TableHead>
                        <TableRow>
                            <TableCell>Stand ID</TableCell>
                            <TableCell align="right">Maintenance Hours</TableCell>
                            <TableCell align="right">Maintenance Periods</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {impactData.impactByStand.length === 0 ? (
                             <TableRow><TableCell colSpan={3} align="center">No impact data for selected range.</TableCell></TableRow>
                        ) : (
                            impactData.impactByStand.map((stand) => (
                                <TableRow key={stand.standId}>
                                <TableCell>{stand.standId}</TableCell> {/* Consider fetching stand name if needed */} 
                                <TableCell align="right">{Math.round(stand.totalHours * 10) / 10}</TableCell>
                                <TableCell align="right">{stand.periods.length}</TableCell>
                                </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </Paper>
            </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MaintenanceImpact; 