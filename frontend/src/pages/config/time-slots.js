import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import TimeSlotsList from '../../components/config/TimeSlotsList';

const TimeSlotsPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href="/config">
            Configuration
          </Link>
          <Typography color="textPrimary">Time Slots</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Time Slots Configuration
        </Typography>
        
        <TimeSlotsList />
      </Box>
    </Container>
  );
};

export default TimeSlotsPage; 