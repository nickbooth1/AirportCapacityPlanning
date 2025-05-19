import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Paper, Grid, CircularProgress } from '@mui/material';

export default function TestPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/flights?page=1&pageSize=10');
        const data = await response.json();
        
        console.log('API response:', data);
        
        if (data && data.data) {
          setFlights(data.data);
        } else {
          setError('Invalid data format');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        API Test Page
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Status: 
          {loading ? ' Loading...' : error ? ` Error: ${error}` : ' Connected'}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            Backend URL: http://localhost:3001
          </Typography>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, bgcolor: '#ffebee' }}>
          <Typography color="error">
            Failed to load data. Error: {error}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {flights.map((flight) => (
            <Grid item xs={12} sm={6} md={4} key={flight.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6">
                  {flight.flight_number}
                </Typography>
                <Typography>
                  {flight.airline} ({flight.aircraft_type})
                </Typography>
                <Typography>
                  {flight.origin} → {flight.destination}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {new Date(flight.scheduled_datetime).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
} 