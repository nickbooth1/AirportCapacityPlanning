import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Divider, CircularProgress } from '@mui/material';
import CapacityResults from './CapacityResults';
import { calculateStandCapacity, getLatestCapacityResults } from '../../lib/capacityApi';
import { getTimeSlots } from '../../lib/configApi';
import { getStands } from '../../lib/standsApi';

const StandCapacityCalculator = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  useEffect(() => {
    // Calculate capacity automatically on page load
    const calculateCapacity = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get the latest results
        let latestResults = null;
        try {
          latestResults = await getLatestCapacityResults();
          if (latestResults) {
            console.log('Found latest capacity results:', latestResults);
            setResults(latestResults);
            setLoading(false);
            return; // Exit if we found saved results
          }
        } catch (err) {
          console.warn('No saved capacity results found, calculating new ones:', err);
          // Continue to calculate new results
        }
        
        // If no saved results, calculate new ones
        const [timeSlots, stands] = await Promise.all([
          getTimeSlots(),
          getStands()
        ]);
        
        // Only proceed if we have time slots
        if (timeSlots && timeSlots.length > 0) {
          const timeSlotIds = timeSlots.map(slot => slot.id);
          
          console.log('Calculating capacity with time slots:', timeSlotIds);
          // Calculate capacity using all time slots and all stands
          const data = await calculateStandCapacity({
            useDefinedTimeSlots: true,
            timeSlotIds: timeSlotIds
          });
          
          console.log('Capacity calculation complete:', data);
          setResults(data);
        } else {
          setError('No time slots defined. Please create time slots in the configuration.');
        }
      } catch (err) {
        console.error('Error calculating capacity:', err);
        setError(`Error calculating capacity: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    calculateCapacity();
  }, []);
  
  return (
    <Paper elevation={0} variant="outlined">
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          Stand Capacity Results
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          This shows the maximum capacity for each aircraft type across all stands, calculated using defined time slots.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Box p={3}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        {results && !loading && !error && (
          <CapacityResults results={results} loading={false} error={null} />
        )}
      </Box>
    </Paper>
  );
};

export default StandCapacityCalculator; 