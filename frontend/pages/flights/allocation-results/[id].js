import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, Typography, Container, Grid, Paper, 
  Tabs, Tab, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip
} from '@mui/material';
import Layout from '../../../components/Layout';
import flightDataApi from '../../../api/flightDataApi';
import StandTimelineGantt from '../../../components/flights/StandTimelineGantt';

// Define tab panels
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`allocation-tabpanel-${index}`}
      aria-labelledby={`allocation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Component for displaying stand utilization in a tabular format
const StandUtilizationTable = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return <Alert severity="info">No utilization data available</Alert>;
  }

  // Group metrics by stand
  const standMetrics = {};
  metrics.forEach(metric => {
    if (!standMetrics[metric.stand_name]) {
      standMetrics[metric.stand_name] = {
        name: metric.stand_name,
        terminal: metric.terminal,
        metrics: []
      };
    }
    standMetrics[metric.stand_name].metrics.push(metric);
  });

  // Helper function to safely format utilization percentage
  const formatUtilization = (value) => {
    // Convert to number if it's a string or handle null/undefined
    const numValue = parseFloat(value);
    // Check if it's a valid number before using toFixed
    return !isNaN(numValue) ? `${numValue.toFixed(1)}%` : '0.0%';
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="utilization table">
        <TableHead>
          <TableRow>
            <TableCell>Stand</TableCell>
            <TableCell>Terminal</TableCell>
            <TableCell>Period</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>End</TableCell>
            <TableCell>Utilization</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.values(standMetrics).map(stand => (
            stand.metrics.map((metric, index) => (
              <TableRow key={`${stand.name}-${index}`}>
                {index === 0 ? (
                  <>
                    <TableCell rowSpan={stand.metrics.length}>{stand.name}</TableCell>
                    <TableCell rowSpan={stand.metrics.length}>{stand.terminal}</TableCell>
                  </>
                ) : null}
                <TableCell>{metric.time_period}</TableCell>
                <TableCell>{new Date(metric.period_start).toLocaleString()}</TableCell>
                <TableCell>{new Date(metric.period_end).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={formatUtilization(metric.utilization_percentage)} 
                    color={getUtilizationColor(parseFloat(metric.utilization_percentage) || 0)}
                  />
                </TableCell>
              </TableRow>
            ))
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Determine color based on utilization percentage
const getUtilizationColor = (percentage) => {
  if (percentage > 90) return 'error';
  if (percentage > 70) return 'warning';
  if (percentage > 40) return 'success';
  return 'default';
};

// Component for displaying allocation issues
const IssuesPanel = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return <Alert severity="success">No issues detected</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Detected Issues ({issues.length})
      </Typography>
      {issues.map((issue, index) => (
        <Paper key={index} sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {issue.issue_type.replace(/_/g, ' ').toUpperCase()}
            </Typography>
            <Chip 
              label={issue.severity.toUpperCase()} 
              color={issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'warning' : 'info'} 
              size="small" 
            />
          </Box>
          <Typography variant="body1">{issue.description}</Typography>
          {issue.recommendation && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2">Recommendation:</Typography>
              <Typography variant="body2">{issue.recommendation}</Typography>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};

// Main component
const AllocationResultsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [unallocatedFlights, setUnallocatedFlights] = useState([]);
  const [utilizationMetrics, setUtilizationMetrics] = useState([]);
  const [issues, setIssues] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  // Fetch data
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch schedule information
      const scheduleResponse = await flightDataApi.getFlightSchedule(id);
      setSchedule(scheduleResponse.data);

      // Fetch allocations
      const allocationsResponse = await flightDataApi.getScheduleAllocations(id);
      setAllocations(allocationsResponse.data);

      // Fetch unallocated flights
      const unallocatedResponse = await flightDataApi.getUnallocatedFlights(id);
      setUnallocatedFlights(unallocatedResponse.data);

      // Fetch utilization metrics
      const metricsResponse = await flightDataApi.getUtilizationMetrics(id);
      setUtilizationMetrics(metricsResponse.data.metrics);

      // Fetch issues
      const issuesResponse = await flightDataApi.getAllocationIssues(id);
      setIssues(issuesResponse.data);

    } catch (err) {
      console.error('Error fetching allocation results:', err);
      setError(err.message || 'Failed to load allocation results');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Layout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container>
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!schedule) {
    return (
      <Layout>
        <Container>
          <Alert severity="warning" sx={{ mt: 4 }}>
            Flight schedule not found
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Stand Allocation Results
          </Typography>

          <Paper sx={{ mb: 4, p: 3 }}>
            <Typography variant="h6">Schedule: {schedule.name}</Typography>
            <Typography variant="body1">
              {schedule.description}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Status: ${schedule.status.toUpperCase()}`} color="primary" />
              <Chip 
                label={`Success Rate: ${schedule.allocated_flights > 0 
                  ? Math.round((schedule.allocated_flights / (schedule.allocated_flights + schedule.unallocated_flights)) * 100)
                  : 0}%`} 
                color="success" 
              />
              <Chip label={`Allocated: ${schedule.allocated_flights}`} color="success" />
              <Chip label={`Unallocated: ${schedule.unallocated_flights}`} color="warning" />
            </Box>
          </Paper>

          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Overview" />
              <Tab label="Allocated Flights" />
              <Tab label="Unallocated Flights" />
              <Tab label="Timeline" />
              <Tab label="Utilization" />
              <Tab label="Issues" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Allocation Summary</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography>
                        Total Flights: {schedule.allocated_flights + schedule.unallocated_flights}
                      </Typography>
                      <Typography>
                        Allocated Flights: {schedule.allocated_flights} 
                        ({schedule.allocated_flights > 0 
                          ? Math.round((schedule.allocated_flights / (schedule.allocated_flights + schedule.unallocated_flights)) * 100)
                          : 0}%)
                      </Typography>
                      <Typography>
                        Unallocated Flights: {schedule.unallocated_flights}
                      </Typography>
                      {schedule.validated_at && (
                        <Typography>
                          Validated: {new Date(schedule.validated_at).toLocaleString()}
                        </Typography>
                      )}
                      {schedule.allocated_at && (
                        <Typography>
                          Allocated: {new Date(schedule.allocated_at).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Issues Overview</Typography>
                    {issues.length > 0 ? (
                      <Box>
                        <Typography>Found {issues.length} issues:</Typography>
                        <Box sx={{ mt: 1 }}>
                          {Array.from(new Set(issues.map(issue => issue.issue_type))).map(type => {
                            const count = issues.filter(issue => issue.issue_type === type).length;
                            return (
                              <Chip 
                                key={type}
                                label={`${type.replace(/_/g, ' ')}: ${count}`}
                                sx={{ mr: 1, mb: 1 }}
                                color="warning"
                              />
                            );
                          })}
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          {Array.from(new Set(issues.map(issue => issue.severity))).map(severity => {
                            const count = issues.filter(issue => issue.severity === severity).length;
                            return (
                              <Chip 
                                key={severity}
                                label={`${severity}: ${count}`}
                                sx={{ mr: 1, mb: 1 }}
                                color={severity === 'critical' ? 'error' : severity === 'high' ? 'warning' : 'info'}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    ) : (
                      <Typography>No issues detected</Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>Allocated Flights</Typography>
              {allocations.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="allocated flights table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Flight</TableCell>
                        <TableCell>Airline</TableCell>
                        <TableCell>Aircraft</TableCell>
                        <TableCell>Nature</TableCell>
                        <TableCell>Scheduled</TableCell>
                        <TableCell>Stand</TableCell>
                        <TableCell>Terminal</TableCell>
                        <TableCell>Period</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocations.map((allocation, index) => (
                        <TableRow key={index}>
                          <TableCell>{allocation.flight_number}</TableCell>
                          <TableCell>{allocation.airline_iata}</TableCell>
                          <TableCell>{allocation.aircraft_type_iata}</TableCell>
                          <TableCell>{allocation.flight_nature === 'A' ? 'Arrival' : 'Departure'}</TableCell>
                          <TableCell>{new Date(allocation.scheduled_datetime).toLocaleString()}</TableCell>
                          <TableCell>{allocation.stand_name}</TableCell>
                          <TableCell>{allocation.terminal}</TableCell>
                          <TableCell>
                            {new Date(allocation.start_time).toLocaleTimeString()} - 
                            {new Date(allocation.end_time).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No allocated flights found</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>Unallocated Flights</Typography>
              {unallocatedFlights.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="unallocated flights table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Flight</TableCell>
                        <TableCell>Airline</TableCell>
                        <TableCell>Aircraft</TableCell>
                        <TableCell>Nature</TableCell>
                        <TableCell>Scheduled</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unallocatedFlights.map((flight, index) => (
                        <TableRow key={index}>
                          <TableCell>{flight.flight_number}</TableCell>
                          <TableCell>{flight.airline_iata}</TableCell>
                          <TableCell>{flight.aircraft_type_iata}</TableCell>
                          <TableCell>{flight.flight_nature === 'A' ? 'Arrival' : 'Departure'}</TableCell>
                          <TableCell>{new Date(flight.scheduled_datetime).toLocaleString()}</TableCell>
                          <TableCell>{flight.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success">All flights were allocated successfully</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>Stand Timeline</Typography>
              <StandTimelineGantt allocations={allocations} />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" gutterBottom>Stand Utilization</Typography>
              <StandUtilizationTable metrics={utilizationMetrics} />
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              <Typography variant="h6" gutterBottom>Allocation Issues</Typography>
              <IssuesPanel issues={issues} />
            </TabPanel>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AllocationResultsPage; 