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
  Link as MuiLink
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  ScheduleRounded as ScheduleIcon,
  LocationCity as LocationCityIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import Link from 'next/link';

const ConfigIndexPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <MuiLink color="inherit" component={Link} href="/">
            Home
          </MuiLink>
          <Typography color="textPrimary">Configuration</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Configuration
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Manage operational parameters and rules used for capacity calculations.
        </Typography>
        
        <Grid container spacing={4} mt={2}>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationCityIcon fontSize="large" color="primary" />
                  <Typography variant="h5" component="h2" ml={1}>
                    Airport Configuration
                  </Typography>
                </Box>
                <Typography>
                  Configure your base airport, manage terminals and piers, allocate airlines to terminals, and assign ground handling agents.
                  This supports stand allocation and capacity planning.
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  component={Link} 
                  href="/config/airport-configuration"
                >
                  Configure Airport
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
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
                <Button 
                  size="small" 
                  color="primary" 
                  component={Link} 
                  href="/config/settings"
                >
                  Manage Settings
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
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
                <Button 
                  size="small" 
                  color="primary" 
                  component={Link} 
                  href="/config/turnaround-rules"
                >
                  Manage Rules
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <TimeIcon fontSize="large" color="primary" />
                  <Typography variant="h5" component="h2" ml={1}>
                    Time Slots
                  </Typography>
                </Box>
                <Typography>
                  Define custom time slots that can be referenced throughout the system.
                  Create slots for operational periods like morning peak, afternoon lull, or evening rush.
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  component={Link} 
                  href="/config/time-slots"
                >
                  Manage Time Slots
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