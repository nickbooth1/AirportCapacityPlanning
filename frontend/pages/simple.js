import React from 'react';
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material';
import Link from 'next/link';

export default function SimplePage() {
  return (
    <Container maxWidth="lg">
      <Box my={4} textAlign="center">
        <Typography variant="h3" component="h1" gutterBottom>
          Airport Capacity Planner - Simple Page
        </Typography>
        <Typography variant="h5" component="h2" color="textSecondary" gutterBottom>
          Basic functionality test page
        </Typography>
      </Box>
      
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Terminal Management
            </Typography>
            <Typography variant="body1" paragraph>
              Configure and manage airport terminals with ease
            </Typography>
            <Box mt="auto">
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                href="/terminals"
                fullWidth
              >
                Manage Terminals
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Pier Configuration
            </Typography>
            <Typography variant="body1" paragraph>
              Design and optimize pier layouts for efficient operations
            </Typography>
            <Box mt="auto">
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                href="/piers"
                fullWidth
              >
                Configure Piers
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Stand Allocation
            </Typography>
            <Typography variant="body1" paragraph>
              Allocate aircraft stands based on constraints and requirements
            </Typography>
            <Box mt="auto">
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                href="/stands"
                fullWidth
              >
                Manage Stands
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}