// components/maintenance/MaintenanceRequestList.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'; // Use V3 adapter if needed
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
  const [startDateFilter, setStartDateFilter] = useState(null);
  const [endDateFilter, setEndDateFilter] = useState(null);
  
  // Fetch maintenance requests and status types
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [requestsRes, statusTypesRes] = await Promise.all([
          api.get('/api/maintenance/requests'),
          api.get('/api/maintenance/status-types')
        ]);
        
        setRequests(requestsRes.data);
        setStatusTypes(statusTypesRes.data);
      } catch (err) {
        setError('Failed to load maintenance data. Please ensure the backend is running and migrations are applied.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Apply filters
  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (standFilter) params.append('standId', standFilter); // Assuming filter by Stand ID for simplicity
      if (statusFilter) params.append('status', statusFilter);
      if (startDateFilter) params.append('startDate', startDateFilter.toISOString());
      if (endDateFilter) params.append('endDate', endDateFilter.toISOString());
      
      const response = await api.get(`/api/maintenance/requests?${params.toString()}`);
      setRequests(response.data);
    } catch (err) {
      setError('Failed to apply filters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset filters
  const resetFilters = async () => {
    setStandFilter('');
    setStatusFilter('');
    setStartDateFilter(null);
    setEndDateFilter(null);
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/maintenance/requests');
      setRequests(response.data);
    } catch (err) {
      setError('Failed to reset filters');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
                    label="Stand ID/Name" // Filter by Stand ID or Name
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
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                        label="Start Date After"
                        value={startDateFilter}
                        onChange={setStartDateFilter}
                        renderInput={(params) => <TextField size="small" fullWidth {...params} />}
                    />
                </LocalizationProvider>
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
                 <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                        label="End Date Before"
                        value={endDateFilter}
                        onChange={setEndDateFilter}
                        renderInput={(params) => <TextField size="small" fullWidth {...params} />}
                    />
                </LocalizationProvider>
             </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                <Button variant="contained" onClick={applyFilters} disabled={loading}>Apply Filters</Button>
                <Button variant="outlined" onClick={resetFilters} disabled={loading}>Reset</Button>
            </Grid>
        </Grid>
       </Paper>

      {/* Error Display */} 
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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
    </Box>
  );
};

export default MaintenanceRequestList; 