import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
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
        
        // Auto-select all time slots
        if (timeSlotsData && timeSlotsData.length > 0) {
          setSelectedTimeSlots(timeSlotsData.map(slot => slot.id));
        }
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
      useDefinedTimeSlots: true,
      timeSlotIds: selectedTimeSlots,
      standIds: selectedStands.length > 0 ? selectedStands : undefined
    });
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TimeSlotSelector 
            timeSlots={timeSlots}
            selectedTimeSlots={selectedTimeSlots}
            setSelectedTimeSlots={setSelectedTimeSlots}
            loading={loadingData}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
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
            disabled={loading || loadingData || selectedTimeSlots.length === 0}
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