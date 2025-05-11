import React from 'react';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import NewStandCapacityCalculator from '../../components/new-capacity/NewStandCapacityCalculator';

const NewCapacityPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="textPrimary">NEW Stand Capacity Tool</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          NEW Stand Capacity Tool
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Advanced calculation of stand capacity based on aircraft types, turnaround times, adjacency rules, and time slots.
        </Typography>
        
        <NewStandCapacityCalculator />
      </Box>
    </Container>
  );
};

export default NewCapacityPage; 