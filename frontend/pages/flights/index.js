import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
  Modal,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import FlightsTable from '../../components/flights/FlightsTable';
import FlightsFilter from '../../components/flights/FlightsFilter';
import FlightStatistics from '../../components/flights/FlightStatistics';
import flightDataApi from '../../api/flightDataApi';
import { addDays } from 'date-fns';
import { format } from 'date-fns';
import { useRouter } from 'next/router';

// Modal styles
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 800,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflow: 'auto'
};

/**
 * Flights Page
 * 
 * Main page for viewing, managing, and analyzing flight data.
 */
const FlightsPage = () => {
  const router = useRouter();
  // State for flights data
  const [flights, setFlights] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('scheduled_datetime');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedFlights, setSelectedFlights] = useState([]);
  
  // State for filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: null,  // Remove default date filter
    endDate: null,    // Remove default date filter
    flightType: 'all',
    airline: 'all',
    terminal: 'all',
    status: 'all'
  });
  
  // State for stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // State for modals
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flightToDelete, setFlightToDelete] = useState(null);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // State for reference data
  const [airlines, setAirlines] = useState([]);
  const [terminals, setTerminals] = useState([]);
  
  // State for uploaded schedules
  const [uploadedSchedules, setUploadedSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  
  // State for deleting schedules
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [scheduleDeleteDialogOpen, setScheduleDeleteDialogOpen] = useState(false);
  const [scheduleDeleteName, setScheduleDeleteName] = useState('');
  
  // Fetch flights data
  const fetchFlights = async () => {
    try {
      setLoading(true);
      
      // Add the selected schedule to filters if not "all"
      const filterParams = { ...filters };
      if (selectedSchedule !== 'all') {
        filterParams.uploadId = selectedSchedule;
      }
      
      const data = await flightDataApi.getFlights(
        filterParams,
        page + 1, // API uses 1-indexed pages
        pageSize,
        sortBy,
        sortOrder
      );
      
      setFlights(data.data);
      setTotalCount(data.meta.total);
    } catch (error) {
      showNotification('Failed to load flights data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch statistics
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Add uploadId to stats parameters if a specific schedule is selected
      const statsParams = {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
      
      if (selectedSchedule !== 'all') {
        statsParams.uploadId = selectedSchedule;
      }
      
      const data = await flightDataApi.getFlightStats(statsParams);
      
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  // Fetch reference data (airlines, terminals)
  const fetchReferenceData = async () => {
    try {
      // Fetch airlines
      const airlinesResponse = await fetch(`/api/airlines`);
      const airlinesData = await airlinesResponse.json();
      setAirlines(airlinesData.data || []); // Extract the data array from response
      
      // Fetch terminals
      const terminalsResponse = await fetch(`/api/terminals`);
      const terminalsData = await terminalsResponse.json();
      setTerminals(terminalsData.data || []); // Extract the data array from response
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };
  
  // Fetch uploaded schedules
  const fetchUploadedSchedules = async () => {
    try {
      const data = await flightDataApi.getUploadedSchedules();
      setUploadedSchedules(data.data || []);
    } catch (error) {
      console.error('Failed to load uploaded schedules:', error);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchFlights();
    fetchStats();
    fetchReferenceData();
    fetchUploadedSchedules();
  }, []);
  
  // Reload when page, pageSize, sortBy, sortOrder changes
  useEffect(() => {
    fetchFlights();
  }, [page, pageSize, sortBy, sortOrder]);
  
  // Reload when selectedSchedule changes
  useEffect(() => {
    fetchFlights();
    fetchStats();
  }, [selectedSchedule]);
  
  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
    
    // Reload data with new filters
    fetchFlights();
    fetchStats();
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(0); // Reset to first page when page size changes
  };
  
  // Handle sort change
  const handleSortChange = (property, order) => {
    setSortBy(property);
    setSortOrder(order);
  };
  
  // Handle flight selection
  const handleSelectFlight = (selected) => {
    setSelectedFlights(selected);
  };
  
  const handleSelectAllFlights = (selected) => {
    setSelectedFlights(selected ? flights.map(f => f.id) : []);
  };
  
  const handleDeleteClick = (id) => {
    setFlightToDelete([id]);
    setDeleteDialogOpen(true);
  };
  
  const handleBulkDeleteClick = () => {
    setFlightToDelete(selectedFlights);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    try {
      if (Array.isArray(flightToDelete)) {
        // Bulk delete
        const results = await Promise.all(
          flightToDelete.map(id => flightDataApi.deleteFlight(id))
        );
        
        // Count successful deletions
        const successCount = results.filter(Boolean).length;
        
        if (successCount === flightToDelete.length) {
          showNotification(`Successfully deleted ${successCount} flights`, 'success');
        } else {
          showNotification(`Deleted ${successCount} of ${flightToDelete.length} flights`, 'warning');
        }
      } else {
        // Single delete
        await flightDataApi.deleteFlight(flightToDelete);
        showNotification('Flight deleted successfully', 'success');
      }
      
      // Refresh flights and stats
      fetchFlights();
      fetchStats();
      setSelectedFlights([]);
    } catch (error) {
      console.error('Error deleting flights:', error);
      showNotification('Failed to delete flights', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setFlightToDelete(null);
    }
  };
  
  const handleUploadSuccess = () => {
    showNotification('Flight data uploaded successfully', 'success');
    // Refresh flights and stats after successful upload
    fetchFlights();
    fetchStats();
    fetchUploadedSchedules();
  };
  
  const handleUploadError = (error) => {
    showNotification(`Upload failed: ${error}`, 'error');
  };
  
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const handleNotificationClose = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleScheduleChange = (event) => {
    setSelectedSchedule(event.target.value);
    setPage(0); // Reset to first page when changing schedule
  };
  
  const formatDateRange = () => {
    if (filters.startDate && filters.endDate) {
      return `${format(filters.startDate, 'MMM d, yyyy')} - ${format(filters.endDate, 'MMM d, yyyy')}`;
    } else if (filters.startDate) {
      return `From ${format(filters.startDate, 'MMM d, yyyy')}`;
    } else if (filters.endDate) {
      return `Until ${format(filters.endDate, 'MMM d, yyyy')}`;
    } else {
      return 'All dates';
    }
  };
  
  const clearFilters = () => {
    const resetFilters = {
      searchTerm: '',
      startDate: null,
      endDate: null,
      flightType: 'all',
      airline: 'all',
      terminal: 'all',
      status: 'all'
    };
    
    setFilters(resetFilters);
    setSelectedSchedule('all');
    
    // Reload data with reset filters
    fetchFlights();
    fetchStats();
  };
  
  const handleDeleteSchedule = (id, name) => {
    setScheduleToDelete(id);
    setScheduleDeleteName(name);
    setScheduleDeleteDialogOpen(true);
  };
  
  const confirmScheduleDelete = async () => {
    try {
      await flightDataApi.deleteUpload(scheduleToDelete);
      showNotification(`Schedule "${scheduleDeleteName}" deleted successfully`, 'success');
      
      // Refresh uploaded schedules list
      fetchUploadedSchedules();
      
      // If the deleted schedule was selected, reset to 'all'
      if (selectedSchedule === scheduleToDelete) {
        setSelectedSchedule('all');
      }
      
      // Refresh flights and stats
      fetchFlights();
      fetchStats();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification(`Failed to delete schedule: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
      setScheduleDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };
  
  return (
    <Layout title="Flights">
      <Head>
        <title>Flights - Airport Capacity Planner</title>
      </Head>
      
      <Box sx={{ mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              Flight Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {formatDateRange()}
            </Typography>
          </Grid>
          
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Schedule Selector */}
              <FormControl sx={{ minWidth: 200, mr: 1 }}>
                <InputLabel id="schedule-select-label">Flight Schedule</InputLabel>
                <Select
                  labelId="schedule-select-label"
                  id="schedule-select"
                  value={selectedSchedule}
                  label="Flight Schedule"
                  onChange={handleScheduleChange}
                >
                  <MenuItem value="all">All Schedules</MenuItem>
                  {uploadedSchedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={schedule.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography>
                            {schedule.display_name || schedule.filename}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={schedule.upload_status} 
                            color={schedule.upload_status === 'completed' ? 'success' : 
                                   schedule.upload_status === 'processing' ? 'warning' : 'default'}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSchedule(schedule.id, schedule.display_name || schedule.filename);
                          }}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  fetchFlights();
                  fetchStats();
                  fetchUploadedSchedules();
                }}
              >
                Refresh
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={flights.length === 0}
              >
                Export
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={selectedFlights.length === 0}
                onClick={handleBulkDeleteClick}
              >
                Delete Selected
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={() => router.push('/flights/upload')}
              >
                Upload Flights
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      {/* Filters */}
      <FlightsFilter
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        airlines={airlines}
        terminals={terminals}
      />
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Flights Table" />
          <Tab label="Statistics" />
        </Tabs>
      </Paper>
      
      {/* Tab content */}
      {activeTab === 0 ? (
        // Flights table
        <FlightsTable
          flights={flights}
          loading={loading}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onChangePage={handlePageChange}
          onChangeRowsPerPage={handleRowsPerPageChange}
          onChangeSort={handleSortChange}
          onSelectFlight={handleSelectFlight}
          onSelectAllFlights={handleSelectAllFlights}
          onDeleteFlight={handleDeleteClick}
          onEditFlight={() => {}}
          onDuplicateFlight={() => {}}
          selectedFlights={selectedFlights}
        />
      ) : (
        // Statistics
        <FlightStatistics
          stats={stats}
          loading={loadingStats}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {Array.isArray(flightToDelete) 
            ? `Delete ${flightToDelete.length} Flights`
            : 'Delete Flight'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {Array.isArray(flightToDelete)
              ? `Are you sure you want to delete ${flightToDelete.length} selected flights? This action cannot be undone.`
              : 'Are you sure you want to delete this flight? This action cannot be undone.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Schedule confirmation dialog */}
      <Dialog
        open={scheduleDeleteDialogOpen}
        onClose={() => setScheduleDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Flight Schedule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the schedule "{scheduleDeleteName}"? 
            This will permanently delete all {scheduleToDelete ? 
              uploadedSchedules.find(s => s.id === scheduleToDelete)?.flightCount || 'associated' : ''} flights 
            in this schedule and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmScheduleDelete} 
            variant="contained" 
            color="error" 
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default FlightsPage; 