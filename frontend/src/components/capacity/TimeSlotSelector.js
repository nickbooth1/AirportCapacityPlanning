import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Chip, 
  Box, 
  OutlinedInput,
  CircularProgress
} from '@mui/material';

const TimeSlotSelector = ({ timeSlots, selectedTimeSlots, setSelectedTimeSlots, loading }) => {
  const handleChange = (event) => {
    setSelectedTimeSlots(event.target.value);
  };
  
  return (
    <FormControl fullWidth>
      <InputLabel id="time-slots-label">Time Slots</InputLabel>
      <Select
        labelId="time-slots-label"
        id="time-slots-select"
        multiple
        value={selectedTimeSlots}
        onChange={handleChange}
        input={<OutlinedInput id="select-multiple-chip" label="Time Slots" />}
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
        disabled={loading}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} />
            <Box component="span" sx={{ ml: 1 }}>Loading time slots...</Box>
          </MenuItem>
        ) : (
          timeSlots.map((slot) => (
            <MenuItem key={slot.id} value={slot.id}>
              {slot.name} ({slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)})
            </MenuItem>
          ))
        )}
      </Select>
      <FormHelperText>
        Select the time slots to calculate capacity for
      </FormHelperText>
    </FormControl>
  );
};

export default TimeSlotSelector; 