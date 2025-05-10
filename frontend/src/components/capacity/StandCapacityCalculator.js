import React, { useState } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import CapacityForm from './CapacityForm';
import CapacityResults from './CapacityResults';
import { calculateStandCapacity } from '../../lib/capacityApi';

const StandCapacityCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  const handleCalculate = async (options) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await calculateStandCapacity(options);
      setResults(data);
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
          Calculate stand capacity based on turnaround times, stand availability, and adjacency rules.
        </Typography>
        
        <CapacityForm onCalculate={handleCalculate} loading={loading} />
      </Paper>
      
      {results && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <CapacityResults results={results} loading={loading} error={error} />
        </Paper>
      )}
      
      {error && !results && (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StandCapacityCalculator; 