// components/maintenance/MaintenanceImpact.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, FormControl, 
  InputLabel, Select, MenuItem, Button, TextField,
  CircularProgress, Alert
} from '@mui/material';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../lib/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MaintenanceImpact = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(startDate.getMonth() + 1)));
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchImpactData = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await api.get(`/maintenance/impact?startDate=${startDateStr}&endDate=${endDateStr}`);
      setImpactData(response.data);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load capacity impact data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts and when dates change
  useEffect(() => {
    fetchImpactData();
  }, []);

  const handleDateChange = () => {
    fetchImpactData();
  };

  // Prepare chart data
  const getChartData = () => {
    if (!impactData || !impactData.impactByDay) return null;

    const days = Object.keys(impactData.impactByDay).sort();
    const standsAffectedData = days.map(day => impactData.impactByDay[day].standsAffected);
    const totalHoursData = days.map(day => Math.round(impactData.impactByDay[day].totalHours * 10) / 10);
    
    return {
      labels: days,
      datasets: [
        {
          label: 'Stands Affected',
          data: standsAffectedData,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgb(53, 162, 235)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Maintenance Hours',
          data: totalHoursData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Stands Affected'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Maintenance Hours'
        }
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Capacity Impact by Day',
      },
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Maintenance Capacity Impact
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleDateChange}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Impact Analysis'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : impactData ? (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle1">Total Stands Affected</Typography>
                  <Typography variant="h4">{impactData.totalStandsAffected}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle1">Total Maintenance Hours</Typography>
                  <Typography variant="h4">{Math.round(impactData.totalMaintenanceHours * 10) / 10}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Impact
            </Typography>
            {getChartData() && (
              <Box sx={{ height: 400 }}>
                <Bar options={chartOptions} data={getChartData()} />
              </Box>
            )}
          </Paper>

          {impactData.impactByStand && impactData.impactByStand.length > 0 && (
            <Paper sx={{ p: 3, mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Impact by Stand
              </Typography>
              <Grid container spacing={2}>
                {impactData.impactByStand.map(standImpact => (
                  <Grid item xs={12} md={4} key={standImpact.standId}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography variant="subtitle1">Stand {standImpact.standId}</Typography>
                      <Typography variant="body2">Total Hours: {Math.round(standImpact.totalHours * 10) / 10}</Typography>
                      <Typography variant="body2">Maintenance Periods: {standImpact.periods.length}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </>
      ) : (
        <Alert severity="info">
          Please select a date range and update to see capacity impact analysis.
        </Alert>
      )}
    </Box>
  );
};

export default MaintenanceImpact; 