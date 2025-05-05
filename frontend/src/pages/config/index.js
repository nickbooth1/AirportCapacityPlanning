import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Breadcrumbs,
  Link 
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  ScheduleRounded as ScheduleIcon,
  LocationCity as LocationCityIcon
} from '@mui/icons-material';

const ConfigIndexPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="textPrimary">Configuration</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Configuration
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Manage operational parameters and rules used for capacity calculations.
        </Typography>
        
        <Grid container spacing={4} mt={2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationCityIcon fontSize="large" color="primary" />
                  <Typography variant="h5" component="h2" ml={1}>
                    Airport Configuration
                  </Typography>
                </Box>
                <Typography>
                  Configure your base airport, allocate airlines to terminals, and assign ground handling agents.
                  This supports stand allocation and capacity planning.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary" href="/config/airport-configuration">
                  Configure Airport
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <SettingsIcon fontSize="large" color="primary" />
                  <Typography variant="h5" component="h2" ml={1}>
                    Operational Settings
                  </Typography>
                </Box>
                <Typography>
                  Configure airport operational parameters like default gap time between
                  aircraft and daily operating hours. These settings affect all capacity calculations.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary" href="/config/settings">
                  Manage Settings
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <ScheduleIcon fontSize="large" color="primary" />
                  <Typography variant="h5" component="h2" ml={1}>
                    Turnaround Rules
                  </Typography>
                </Box>
                <Typography>
                  Define minimum turnaround times for different aircraft types. These rules
                  determine how much time an aircraft needs on a stand before it can depart.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary" href="/config/turnaround-rules">
                  Manage Rules
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ConfigIndexPage; 