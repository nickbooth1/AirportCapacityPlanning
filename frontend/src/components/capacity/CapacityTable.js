import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography
} from '@mui/material';

const CapacityTable = ({ data, timeSlots, scenario }) => {
  // Extract all unique aircraft types across all time slots
  const aircraftTypes = new Set();
  
  Object.values(data).forEach(slotData => {
    Object.keys(slotData).forEach(aircraftType => {
      aircraftTypes.add(aircraftType);
    });
  });
  
  const sortedAircraftTypes = Array.from(aircraftTypes).sort();
  
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Aircraft Type</strong></TableCell>
            {timeSlots.map((slot) => (
              <TableCell key={slot.id || slot.name} align="center">
                <Typography variant="body2" noWrap>
                  {slot.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" noWrap>
                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedAircraftTypes.map((aircraftType) => (
            <TableRow key={aircraftType}>
              <TableCell component="th" scope="row">
                <strong>{aircraftType}</strong>
              </TableCell>
              {timeSlots.map((slot) => {
                const slotData = data[slot.name] || {};
                const capacity = slotData[aircraftType] || 0;
                
                return (
                  <TableCell 
                    key={`${slot.id || slot.name}-${aircraftType}`} 
                    align="center"
                    sx={{ 
                      bgcolor: capacity > 0 
                        ? scenario === 'best' 
                          ? 'success.light' 
                          : 'warning.light'
                        : 'grey.100',
                      fontWeight: capacity > 0 ? 'bold' : 'normal'
                    }}
                  >
                    {capacity}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CapacityTable; 