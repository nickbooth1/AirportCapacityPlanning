import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  FormControl, 
  FormControlLabel, 
  Switch, 
  Button, 
  CircularProgress, 
  Typography,
  Divider
} from '@mui/material';
import TimeSlotSelector from './TimeSlotSelector';
import StandSelector from './StandSelector';
import { getTimeSlots } from '../../lib/configApi';
import { getStands } from '../../lib/standsApi';

const CapacityForm = ({ onCalculate, loading }) => {
  const [useDefinedTimeSlots, setUseDefinedTimeSlots] = useState(true);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedStands, setSelectedStands] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [stands, setStands] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setError(null);
        
        const [timeSlotsData, standsData] = await Promise.all([
          getTimeSlots(),
          getStands()
        ]);
        
        setTimeSlots(timeSlotsData);
        setStands(standsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load required data. Please refresh the page.');
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    onCalculate({
      useDefinedTimeSlots,
      timeSlotIds: selectedTimeSlots,
      standIds: selectedStands.length > 0 ? selectedStands : undefined
    });
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={useDefinedTimeSlots}
                onChange={(e) => setUseDefinedTimeSlots(e.target.checked)}
                color="primary"
              />
            }
            label="Use defined time slots"
          />
          
          <Typography variant="body2" color="textSecondary">
            {useDefinedTimeSlots 
              ? 'Select specific time slots for capacity calculation' 
              : 'Use system-generated time slots based on operational settings'}
          </Typography>
        </Grid>
        
        {useDefinedTimeSlots && (
          <Grid item xs={12} md={6}>
            <TimeSlotSelector 
              timeSlots={timeSlots}
              selectedTimeSlots={selectedTimeSlots}
              setSelectedTimeSlots={setSelectedTimeSlots}
              loading={loadingData}
            />
          </Grid>
        )}
        
        <Grid item xs={12} md={useDefinedTimeSlots ? 6 : 12}>
          <StandSelector 
            stands={stands}
            selectedStands={selectedStands}
            setSelectedStands={setSelectedStands}
            loading={loadingData}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || loadingData || (useDefinedTimeSlots && selectedTimeSlots.length === 0)}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Calculating...' : 'Calculate Capacity'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CapacityForm; 