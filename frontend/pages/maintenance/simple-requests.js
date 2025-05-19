import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import Layout from '../../components/Layout';

/**
 * Simple version of the maintenance requests page without API dependencies
 * 
 * @returns {JSX.Element} Rendered component
 */
const SimpleMaintenanceRequestsPage = () => {
  return (
    <Layout title="Simple Maintenance Requests">
      <Typography variant="h4" gutterBottom>
        Maintenance Requests (Simple Version)
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Maintenance Impact on Stand Capacity
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Current Maintenance
                </Typography>
                <Typography variant="h3" component="div">
                  5
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active maintenance requests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Impact
                </Typography>
                <Typography variant="h3" component="div">
                  -15%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reduction in stand capacity
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  Upcoming
                </Typography>
                <Typography variant="h3" component="div">
                  8
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scheduled maintenance requests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Maintenance Requests
        </Typography>
        
        <Grid container spacing={3}>
          {/* Sample maintenance request cards */}
          {[1, 2, 3, 4, 5].map((item) => (
            <Grid item xs={12} md={6} key={item}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maintenance Request #{item}
                  </Typography>
                  <Typography variant="body1">
                    Stand: A{item}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start: 2025-05-{item + 10}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    End: 2025-05-{item + 15}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {item % 2 === 0 ? 'Scheduled Maintenance' : 'Emergency Repair'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small">View Details</Button>
                  <Button size="small" color="primary">Edit</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary">
            Create New Request
          </Button>
        </Box>
      </Paper>
    </Layout>
  );
};

export default SimpleMaintenanceRequestsPage;