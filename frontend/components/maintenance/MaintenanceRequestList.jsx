// components/maintenance/MaintenanceRequestList.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Grid
} from '@mui/material';
import Link from 'next/link'; // Use Next.js Link
import api from '../../lib/api'; // Assume api utility exists

const MaintenanceRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [standFilter, setStandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Add a retry counter
  const [retries, setRetries] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add a small delay before retrying
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
        
        const [requestsRes, statusTypesRes] = await Promise.all([
          api.get('/maintenance/requests'),
          api.get('/maintenance/status-types')
        ]);
        
        setRequests(requestsRes.data);
        setStatusTypes(statusTypesRes.data);
        setRetries(0); // Reset retries on success
        setLoading(false); // Always set loading to false after successful API calls
      } catch (err) {
        console.error('API Error:', err);
        if (retries < maxRetries) {
          setRetries(prev => prev + 1);
          setError(`Connection failed. Retrying... (${retries+1}/${maxRetries})`);
        } else {
          setError(
            'Failed to load maintenance data. Please ensure the backend is running. ' +
            'Error: ' + (err.message || 'Unknown error')
          );
          setLoading(false); // Set loading to false after max retries
        }
      }
    };
    
    fetchData();
  }, [retries]);
  
  // Apply filters
  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (standFilter) params.append('stand_id', standFilter);
      if (statusFilter) params.append('status_id', statusFilter);
      if (startDateFilter) params.append('start_datetime', startDateFilter);
      if (endDateFilter) params.append('end_datetime', endDateFilter);
      
      const response = await api.get(`/maintenance/requests?${params.toString()}`);
      setRequests(response.data);
    } catch (err) {
      setError('Failed to apply filters: ' + (err.message || 'Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset filters
  const resetFilters = async () => {
    setStandFilter('');
    setStatusFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/maintenance/requests');
      setRequests(response.data);
    } catch (err) {
      setError('Failed to reset filters: ' + (err.message || 'Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add manual retry function  
  const handleRetry = () => {
    setRetries(0); // Reset counter to trigger useEffect
    setLoading(true);
  };
  
  // Render functions
  const renderStatusBadge = (statusId) => {
    const status = statusTypes.find(s => s.id === statusId);
    if (!status) return 'Unknown';
    
    let color;
    switch (status.name) {
      case 'Approved': color = 'success.main'; break;
      case 'Rejected': color = 'error.main'; break;
      case 'In Progress': color = 'info.main'; break;
      case 'Completed': color = 'grey.500'; break;
      case 'Cancelled': color = 'secondary.main'; break;
      default: color = 'primary.main'; // Requested
    }
    
    return (
      <Box sx={{ 
        bgcolor: color, 
        color: 'white', 
        borderRadius: 1, 
        px: 1, 
        py: 0.5,
        display: 'inline-block',
        fontSize: '0.75rem',
        fontWeight: 'medium'
      }}>
        {status.name}
      </Box>
    );
  };
  
  return (
    <Box>
      {/* Filter Controls */} 
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filters</Typography>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
                <TextField
                    label="Stand ID/Name"
                    value={standFilter}
                    onChange={(e) => setStandFilter(e.target.value)}
                    size="small"
                    fullWidth
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                    >
                        <MenuItem value="">All</MenuItem>
                        {statusTypes.map(status => (
                            <MenuItem key={status.id} value={status.id}>{status.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
             <Grid item xs={12} sm={6} md={3}>
                <TextField
                    label="Start Date After"
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    fullWidth
                />
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
                <TextField
                    label="End Date Before"
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    fullWidth
                />
             </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                <Button variant="contained" onClick={applyFilters} disabled={loading}>Apply Filters</Button>
                <Button variant="outlined" onClick={resetFilters} disabled={loading}>Reset</Button>
            </Grid>
        </Grid>
       </Paper>

      {/* Error Display */} 
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading Indicator */} 
      {loading && (
        <Box display="flex" justifyContent="center" sx={{ my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Requests Table */} 
      {!loading && (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="maintenance requests table">
            <TableHead>
                <TableRow>
                <TableCell>Stand</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Requestor</TableCell>
                <TableCell>Start Date/Time</TableCell>
                <TableCell>End Date/Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {requests.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} align="center">No maintenance requests found</TableCell>
                </TableRow>
                ) : (
                requests.map(request => (
                    <TableRow key={request.id}>
                    <TableCell>{request.stand?.name || request.stand_id}</TableCell>
                    <TableCell>{request.title}</TableCell>
                    <TableCell>{request.requestor_name}</TableCell>
                    <TableCell>{new Date(request.start_datetime).toLocaleString()}</TableCell>
                    <TableCell>{new Date(request.end_datetime).toLocaleString()}</TableCell>
                    <TableCell>{renderStatusBadge(request.status_id)}</TableCell>
                    <TableCell>{request.priority}</TableCell>
                    <TableCell>
                        <Link href={`/maintenance/requests/${request.id}`} passHref>
                             <Button size="small">View</Button>
                        </Link>
                        {/* Add Edit/Delete buttons later */}
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </TableContainer>
      )}
      
      {/* Action Button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/maintenance/requests/new" passHref>
          <Button variant="contained" color="primary">
            Create New Request
          </Button>
        </Link>
      </Box>
    </Box>
  );
};

export default MaintenanceRequestList; 