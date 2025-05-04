import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { calculateCapacity, getCapacitySettings } from '../api/capacityApi';
import CapacitySummary from '../components/capacity/CapacitySummary';
import CapacityByHourChart from '../components/capacity/CapacityByHourChart';
import CapacityByAircraftSizeChart from '../components/capacity/CapacityByAircraftSizeChart';
import Layout from '../components/Layout';

const CapacityPage = () => {
  const [date, setDate] = useState(new Date());
  const [capacityData, setCapacityData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch capacity settings on component mount
    const fetchSettings = async () => {
      try {
        const settingsData = await getCapacitySettings();
        setSettings(settingsData);
      } catch (err) {
        console.error('Failed to fetch capacity settings:', err);
        setError('Failed to load settings. Please try again later.');
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const data = await calculateCapacity(formattedDate);
      setCapacityData(data);
    } catch (err) {
      console.error('Capacity calculation failed:', err);
      setError('Failed to calculate capacity. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const pageContent = (
    <Container maxWidth="lg">
      <Box sx={{ pt: 4, pb: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stand Capacity Planner
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Calculate Maximum Theoretical Capacity
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              This tool calculates the maximum theoretical stand capacity based on operational settings, 
              turnaround times, and stand constraints.
            </Typography>
          </Box>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Calculation Date"
                  value={date}
                  onChange={(newDate) => setDate(newDate)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleCalculate}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Calculate Capacity'}
              </Button>
            </Grid>
          </Grid>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
        
        {capacityData && (
          <>
            <CapacitySummary data={capacityData} />
            
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Capacity by Hour
                  </Typography>
                  <CapacityByHourChart data={capacityData.capacity_by_hour} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Capacity by Aircraft Size
                  </Typography>
                  <CapacityByAircraftSizeChart data={capacityData.capacity_summary.total_available_stand_hours} />
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Container>
  );
  
  return (
    <Layout title="Stand Capacity Planner">
      {pageContent}
    </Layout>
  );
};

export default CapacityPage; 