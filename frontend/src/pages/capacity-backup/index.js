import React from 'react';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import StandCapacityCalculator from '../../components/capacity/StandCapacityCalculator';

const CapacityPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="textPrimary">Capacity Planning</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Stand Capacity Planning
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Calculate the maximum capacity of your stands based on aircraft types, turnaround times, and stand adjacency rules.
        </Typography>
        
        <StandCapacityCalculator />
      </Box>
    </Container>
  );
};

export default CapacityPage; 