import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Divider, Alert, CircularProgress } from '@mui/material';
import NewCapacityForm from './NewCapacityForm';
import NewCapacityResults from './NewCapacityResults';
import { calculateNewStandCapacity, getLatestCapacityResults } from '../../lib/capacityApi';
import { getTimeSlots } from '../../lib/configApi';
import { getStands } from '../../lib/standsApi';

const NewStandCapacityCalculator = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // Auto-calculate on page load
  useEffect(() => {
    const calculateCapacity = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get the latest results from the database first
        const latestResults = await getLatestCapacityResults();
        console.log('API response from getLatestCapacityResults:', latestResults);
        
        if (latestResults) {
          console.log('Found latest capacity results:', latestResults);
          
          // Ensure required data exists
          if (!latestResults.bestCaseCapacity || !latestResults.worstCaseCapacity) {
            console.warn('Latest results missing capacity data');
            setError('Capacity data is missing from the latest results');
            setLoading(false);
            return;
          }
          
          // Ensure visualization data exists
          if (!latestResults.visualization) {
            console.warn('Latest results missing visualization data');
            // Create a minimal visualization placeholder to avoid UI errors
            latestResults.visualization = {
              byHour: [],
              bodyTypeVisualization: []
            };
          }
          
          setResults(latestResults);
          setLoading(false);
          return; // Exit if we found saved results
        }
        
        console.log('No saved capacity results found, calculating new ones');
        
        // If no saved results, calculate new capacity
        const newResults = await calculateNewStandCapacity({ useDefinedTimeSlots: true });
        console.log('Capacity calculation complete:', newResults);
        
        if (newResults && newResults.success === true && newResults.data) {
          // Handle new API response format
          console.log('Processing new API response format with success property');
          
          // Ensure visualization data exists
          if (!newResults.data.visualization) {
            console.warn('New results missing visualization data');
            // Create a minimal visualization placeholder to avoid UI errors
            newResults.data.visualization = {
              byHour: [],
              bodyTypeVisualization: []
            };
          }
          
          setResults(newResults.data);
        } else if (newResults) {
          // Handle legacy API format
          console.log('Processing legacy API response format');
          
          // Ensure visualization data exists
          if (!newResults.visualization) {
            console.warn('Legacy results missing visualization data');
            // Create a minimal visualization placeholder to avoid UI errors
            newResults.visualization = {
              byHour: [],
              bodyTypeVisualization: []
            };
          }
          
          setResults(newResults);
        } else {
          throw new Error('Failed to calculate capacity - empty response');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error calculating capacity:', error);
        setError(error.message || 'An error occurred while calculating stand capacity');
        setLoading(false);
      }
    };
    
    calculateCapacity();
  }, []);
  
  const handleCalculate = async (options) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the actual API - always use time slots from configuration
      options.useDefinedTimeSlots = true;
      const data = await calculateNewStandCapacity(options);
      setResults(data);
      
      // If no data is returned, show an error
      if (!data) {
        setError('No results were returned from the capacity calculation.');
      }
    } catch (err) {
      console.error('Failed to calculate capacity:', err);
      setError('Failed to calculate stand capacity. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Stand Capacity Calculator
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Calculate the maximum capacity of your stands based on aircraft types, turnaround times, and adjacency rules.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <NewCapacityForm onCalculate={handleCalculate} loading={loading} />
      </Paper>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && !results && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {results && !loading && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <NewCapacityResults results={results} />
        </Paper>
      )}
    </Box>
  );
};

export default NewStandCapacityCalculator; 