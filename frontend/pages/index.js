import React from 'react';
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material';
import Link from 'next/link';
import Layout from '../components/Layout';
import DashboardCapacityImpact from '../components/dashboard/DashboardCapacityImpact';

export default function Home() {
  return (
    <Layout title="Airport Capacity Planner">
      <Container maxWidth="lg">
        <Box my={4} textAlign="center">
          <Typography variant="h3" component="h1" gutterBottom>
            Airport Capacity Planner
          </Typography>
          <Typography variant="h5" component="h2" color="textSecondary" gutterBottom>
            Optimize your terminal, pier, and stand management
          </Typography>
        </Box>

        <Box mb={4}>
          <DashboardCapacityImpact />
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
    </Layout>
  );
} 