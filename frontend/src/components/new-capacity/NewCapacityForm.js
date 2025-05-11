import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  FormHelperText,
  OutlinedInput,
  CircularProgress,
  Alert
} from '@mui/material';
import { getTimeSlots } from '../../lib/configApi';
import { getStands } from '../../lib/standsApi';

const NewCapacityForm = ({ onCalculate, loading }) => {
  // State for form values
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedStands, setSelectedStands] = useState([]);
  
  // State for data loading
  const [timeSlots, setTimeSlots] = useState([]);
  const [stands, setStands] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [loadingStands, setLoadingStands] = useState(false);
  const [error, setError] = useState(null);
  
  // Load time slots data
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setLoadingTimeSlots(true);
        // Call the API to get the time slots
        const data = await getTimeSlots();
        setTimeSlots(data);
        
        // Set all time slots as selected by default
        if (data && data.length > 0) {
          setSelectedTimeSlots(data.map(slot => slot.id));
        }
        
        // If no time slots are fetched, show an error
        if (!data || data.length === 0) {
          setError('No time slots found. Please configure time slots in the Configuration section.');
        }
      } catch (err) {
        console.error('Failed to load time slots:', err);
        setError('Failed to load time slots data. Please try refreshing the page.');
      } finally {
        setLoadingTimeSlots(false);
      }
    };
    
    fetchTimeSlots();
  }, []);
  
  // Load stands data
  useEffect(() => {
    const fetchStands = async () => {
      try {
        setLoadingStands(true);
        // Call the API to get the stands
        const data = await getStands();
        setStands(data);
        
        // If no stands are fetched, show an error
        if (!data || data.length === 0) {
          setError('No stands found. Please configure stands before using this tool.');
        }
      } catch (err) {
        console.error('Failed to load stands:', err);
        setError('Failed to load stands data. Please try refreshing the page.');
      } finally {
        setLoadingStands(false);
      }
    };
    
    fetchStands();
  }, []);
  
  // Handle time slots selection change
  const handleTimeSlotsChange = (event) => {
    setSelectedTimeSlots(event.target.value);
  };
  
  // Handle stands selection change
  const handleStandsChange = (event) => {
    setSelectedStands(event.target.value);
  };
  
  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    
    const options = {
      useDefinedTimeSlots: true, // Always use defined time slots
      timeSlotIds: selectedTimeSlots,
      standIds: selectedStands.length > 0 ? selectedStands : undefined
    };
    
    onCalculate(options);
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth disabled={loading || loadingTimeSlots}>
            <InputLabel id="time-slots-label">Time Slots</InputLabel>
            <Select
              labelId="time-slots-label"
              id="time-slots-select"
              multiple
              value={selectedTimeSlots}
              onChange={handleTimeSlotsChange}
              input={<OutlinedInput id="select-multiple-time-slots" label="Time Slots" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const slot = timeSlots.find(s => s.id === value);
                    return (
                      <Chip key={value} label={slot ? slot.name : value} />
                    );
                  })}
                </Box>
              )}
            >
              {loadingTimeSlots ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                  <Box component="span" sx={{ ml: 1 }}>Loading time slots...</Box>
                </MenuItem>
              ) : (
                timeSlots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {slot.name} ({slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)})
                  </MenuItem>
                ))
              )}
            </Select>
            <FormHelperText>
              Select specific time slots to calculate capacity for
            </FormHelperText>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth disabled={loading || loadingStands}>
            <InputLabel id="stands-label">Stands (Optional)</InputLabel>
            <Select
              labelId="stands-label"
              id="stands-select"
              multiple
              value={selectedStands}
              onChange={handleStandsChange}
              input={<OutlinedInput id="select-multiple-stands" label="Stands (Optional)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const stand = stands.find(s => s.id === value);
                    return (
                      <Chip key={value} label={stand ? stand.code : value} />
                    );
                  })}
                </Box>
              )}
            >
              {loadingStands ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                  <Box component="span" sx={{ ml: 1 }}>Loading stands...</Box>
                </MenuItem>
              ) : (
                stands.map((stand) => (
                  <MenuItem key={stand.id} value={stand.id}>
                    {stand.code} {stand.terminal_code && `(${stand.terminal_code})`}
                  </MenuItem>
                ))
              )}
            </Select>
            <FormHelperText>
              Select specific stands to calculate capacity for, or leave empty to include all stands
            </FormHelperText>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || loadingTimeSlots || loadingStands || selectedTimeSlots.length === 0}
            sx={{ mt: 2 }}
          >
            {loading ? 'Calculating...' : 'Calculate Capacity'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NewCapacityForm; 