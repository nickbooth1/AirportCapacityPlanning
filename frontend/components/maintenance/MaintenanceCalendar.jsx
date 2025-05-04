// components/maintenance/MaintenanceCalendar.jsx
import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react'; // Changed from Calendar to FullCalendar
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box, Paper, Typography, FormControl, InputLabel, 
  Select, MenuItem, TextField, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid,
  CircularProgress, Alert
} from '@mui/material';
import Link from 'next/link';
import api from '../../lib/api';

const MaintenanceCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const calendarRef = useRef(null);
  
  // Filter states
  const [terminalFilter, setTerminalFilter] = useState('');
  const [standFilter, setStandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [terminals, setTerminals] = useState([]);
  const [stands, setStands] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);

  // Fetch initial data and filter options
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [terminalsRes, standsRes, statusTypesRes] = await Promise.all([
          api.get('/terminals'),
          api.get('/stands'),
          api.get('/maintenance/status-types')
        ]);
        setTerminals(terminalsRes.data);
        setStands(standsRes.data);
        setStatusTypes(statusTypesRes.data);
        // Fetch initial calendar events after getting filter options
        await fetchCalendarEvents(); 
      } catch (err) {
        setError('Failed to load filter options.');
        console.error(err);
        setLoading(false); // Stop loading if filter options fail
      }
    };
    fetchInitialData();
  }, []);

  // Function to fetch calendar events based on current filters and view
  const fetchCalendarEvents = async () => {
    if (!calendarRef.current) return; // Wait for calendar to initialize

    const calendarApi = calendarRef.current.getApi();
    const view = calendarApi.view;
    const startDate = view.activeStart.toISOString();
    const endDate = view.activeEnd.toISOString();

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      if (terminalFilter) params.append('terminalId', terminalFilter);
      if (standFilter) params.append('standId', standFilter);
      if (statusFilter) params.append('statusId', statusFilter);

      const response = await api.get(`/maintenance/calendar?${params.toString()}`);
      setEvents(response.data);
    } catch (err) {
      setError('Failed to load calendar events. Please ensure the backend is running and migrations are applied.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and refetch events
  const handleApplyFilters = () => {
    fetchCalendarEvents();
  };
  
  // Reset filters and refetch events
  const handleResetFilters = async () => {
    setTerminalFilter('');
    setStandFilter('');
    setStatusFilter('');
    // Need to fetch events again after resetting filters
    // We can call fetchCalendarEvents directly, but let's add a slight delay 
    // or check if the state update has completed if needed.
    // For simplicity, we assume the state updates before the fetch call.
    setTimeout(fetchCalendarEvents, 0); 
  };
  
  // Event click handler
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setDialogOpen(true);
  };
  
  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null); // Clear selected event on close
  };
  
  return (
    <Box>
      {/* Filter Controls */} 
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Calendar Filters</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Terminal</InputLabel>
              <Select value={terminalFilter} onChange={(e) => setTerminalFilter(e.target.value)} label="Terminal">
                <MenuItem value="">All Terminals</MenuItem>
                {terminals.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
           <Grid item xs={12} sm={6} md={3}>
             <FormControl size="small" fullWidth>
                <InputLabel>Stand</InputLabel>
                <Select value={standFilter} onChange={(e) => setStandFilter(e.target.value)} label="Stand">
                    <MenuItem value="">All Stands</MenuItem>
                    {stands.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
             </FormControl>
           </Grid>
           <Grid item xs={12} sm={6} md={3}>
             <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                    <MenuItem value="">All Statuses</MenuItem>
                    {statusTypes.map(st => <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>)}
                </Select>
             </FormControl>
           </Grid>
           <Grid item xs={12} sm={6} md={3} display="flex" gap={1}>
               <Button variant="contained" onClick={handleApplyFilters} disabled={loading} fullWidth>Apply</Button>
               <Button variant="outlined" onClick={handleResetFilters} disabled={loading} fullWidth>Reset</Button>
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

      {/* Calendar */} 
      <Paper sx={{ p: { xs: 1, sm: 2 } }}> 
        <FullCalendar
          ref={calendarRef} // Add ref
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events} // Use fetched events
          eventClick={handleEventClick}
          datesSet={fetchCalendarEvents} // Refetch events when view changes
          height="auto"
          weekends={true}
        />
      </Paper>
      
      {/* Event Detail Dialog */} 
      {selectedEvent && (
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedEvent.title}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={1}>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Stand:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{selectedEvent.extendedProps.standName}</Typography></Grid>
              
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Terminal:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{selectedEvent.extendedProps.terminalName || 'N/A'}</Typography></Grid>

              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Status:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{selectedEvent.extendedProps.status}</Typography></Grid>
              
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Priority:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{selectedEvent.extendedProps.priority}</Typography></Grid>
              
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Start:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{new Date(selectedEvent.start).toLocaleString()}</Typography></Grid>
              
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">End:</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2">{new Date(selectedEvent.end).toLocaleString()}</Typography></Grid>

              <Grid item xs={12}><Typography variant="caption" color="textSecondary">Requestor:</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2">{selectedEvent.extendedProps.requestor}</Typography></Grid>
              
              <Grid item xs={12}><Typography variant="caption" color="textSecondary">Description:</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.extendedProps.description}</Typography></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
            <Link href={`/maintenance/requests/${selectedEvent.id}`} passHref>
              <Button variant="contained">View Full Details</Button>
            </Link>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default MaintenanceCalendar; 