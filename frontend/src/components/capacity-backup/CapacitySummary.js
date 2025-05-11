import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { format } from 'date-fns';

const CapacitySummary = ({ data }) => {
  const {
    calculation_timestamp,
    operating_day,
    settings,
    capacity_summary,
    capacity_by_pier
  } = data;
  
  // Format timestamp
  const formattedTimestamp = calculation_timestamp ? 
    format(new Date(calculation_timestamp), 'MMM d, yyyy h:mm a') : 'N/A';
  
  // Format operating day
  const formattedOperatingDay = operating_day ?
    format(new Date(operating_day), 'MMMM d, yyyy') : 'N/A';
  
  // Get total available hours
  const totalAvailableStandHours = capacity_summary?.total_available_stand_hours || {};
  const totalCapacity = capacity_summary?.grand_total || 0;
  
  // Get aircraft categories
  const aircraftCategories = Object.keys(totalAvailableStandHours).sort();
  
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Capacity Summary
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Calculated on {formattedTimestamp} for {formattedOperatingDay}
        </Typography>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ p: 2, textAlign: 'center', height: '100%' }}
          >
            <Typography variant="h3" color="primary">
              {totalCapacity}
            </Typography>
            <Typography variant="subtitle1">
              Total Capacity
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ p: 2, textAlign: 'center', height: '100%' }}
          >
            <Typography variant="h3" color="primary">
              {settings?.slot_duration_minutes || 'N/A'}
            </Typography>
            <Typography variant="subtitle1">
              Slot Duration (min)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ p: 2, textAlign: 'center', height: '100%' }}
          >
            <Typography variant="h3" color="primary">
              {settings?.total_hours || 'N/A'}
            </Typography>
            <Typography variant="subtitle1">
              Operating Hours
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ p: 2, textAlign: 'center', height: '100%' }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
              {aircraftCategories.map(category => (
                <Chip 
                  key={category}
                  label={`${category}: ${totalAvailableStandHours[category]}`}
                  variant="outlined"
                  color="primary"
                  size="small"
                />
              ))}
            </Box>
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              By Aircraft Size
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {capacity_by_pier && capacity_by_pier.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Capacity by Pier
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pier ID</TableCell>
                  <TableCell align="right">Total Slots</TableCell>
                  <TableCell align="right">Stand Count</TableCell>
                  {aircraftCategories.map(category => (
                    <TableCell key={category} align="right">
                      Size {category}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {capacity_by_pier.map(pier => (
                  <TableRow key={pier.pier_id}>
                    <TableCell component="th" scope="row">
                      {pier.pier_id}
                    </TableCell>
                    <TableCell align="right">{pier.total_slots}</TableCell>
                    <TableCell align="right">{pier.stand_count}</TableCell>
                    {aircraftCategories.map(category => (
                      <TableCell key={category} align="right">
                        {pier.slots_by_size?.[category] || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
};

export default CapacitySummary; 