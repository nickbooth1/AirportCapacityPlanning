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

const StandSelector = ({ stands, selectedStands, setSelectedStands, loading }) => {
  const handleChange = (event) => {
    setSelectedStands(event.target.value);
  };
  
  return (
    <FormControl fullWidth>
      <InputLabel id="stands-label">Stands (Optional)</InputLabel>
      <Select
        labelId="stands-label"
        id="stands-select"
        multiple
        value={selectedStands}
        onChange={handleChange}
        input={<OutlinedInput id="select-multiple-chip" label="Stands (Optional)" />}
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
        disabled={loading}
      >
        {loading ? (
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
  );
};

export default StandSelector; 