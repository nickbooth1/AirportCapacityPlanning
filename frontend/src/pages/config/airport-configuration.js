import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Autocomplete,
  TextField,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useAirportConfig } from '../../contexts/AirportConfigContext';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Airport Configuration Component
 * 
 * Allows users to configure their base airport and manage airline terminal allocations
 */
const AirportConfiguration = () => {
  // State for component
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [ghas, setGhas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [currentAllocation, setCurrentAllocation] = useState({
    id: null,
    airlineId: null,
    terminalId: null,
    ghaId: null
  });
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Get airport config context
  const { 
    airportConfig, 
    loading, 
    error, 
    updateBaseAirport,
    addAirlineAllocation,
    updateAirlineAllocation,
    deleteAirlineAllocation,
    refreshConfig
  } = useAirportConfig();

  // Fetch reference data (airports, airlines, terminals, GHAs)
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch data in parallel
        const [airportsRes, airlinesRes, terminalsRes, ghasRes] = await Promise.all([
          axios.get(`${API_URL}/airports`),
          axios.get(`${API_URL}/airlines`),
          axios.get(`${API_URL}/terminals`),
          axios.get(`${API_URL}/ghas`)
        ]);

        setAirports(airportsRes.data.data || []);
        setAirlines(airlinesRes.data.data || []);
        setTerminals(terminalsRes.data.data || []);
        setGhas(ghasRes.data.data || []);
      } catch (err) {
        console.error('Error fetching reference data:', err);
        showNotification('Failed to load reference data', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    fetchReferenceData();
  }, []);

  // Show a notification message
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Close the notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Handle base airport change
  const handleBaseAirportChange = async (event, value) => {
    if (value) {
      const success = await updateBaseAirport(value.id);
      if (success) {
        showNotification('Base airport updated successfully');
      }
    }
  };

  // Open allocation dialog for add/edit
  const handleOpenDialog = (allocation = null) => {
    if (allocation) {
      // Edit existing allocation
      setCurrentAllocation({
        id: allocation.id,
        airlineId: allocation.airline_id,
        terminalId: allocation.terminal_id,
        ghaId: allocation.gha_id
      });
    } else {
      // Add new allocation
      setCurrentAllocation({
        id: null,
        airlineId: null,
        terminalId: null,
        ghaId: null
      });
    }
    setOpenDialog(true);
  };

  // Close allocation dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Save allocation from dialog
  const handleSaveAllocation = async () => {
    // Validate required fields
    if (!currentAllocation.airlineId || !currentAllocation.terminalId) {
      showNotification('Airline and terminal are required', 'error');
      return;
    }

    let success;

    if (currentAllocation.id) {
      // Update existing allocation
      success = await updateAirlineAllocation(
        currentAllocation.id,
        currentAllocation
      );
      if (success) {
        showNotification('Allocation updated successfully');
      }
    } else {
      // Add new allocation
      success = await addAirlineAllocation(currentAllocation);
      if (success) {
        showNotification('Allocation added successfully');
      }
    }

    if (success) {
      handleCloseDialog();
    }
  };

  // Delete allocation
  const handleDeleteAllocation = async (id) => {
    if (window.confirm('Are you sure you want to delete this allocation?')) {
      const success = await deleteAirlineAllocation(id);
      if (success) {
        showNotification('Allocation deleted successfully');
      }
    }
  };

  // Get airport by ID
  const getAirportById = (id) => {
    return airports.find(airport => airport.id === id) || null;
  };

  // Render loading state
  if (loading || loadingData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/config" color="inherit">
            Configuration
          </MuiLink>
          <Typography color="textPrimary">Airport Configuration</Typography>
        </Breadcrumbs>

        <Typography variant="h4" gutterBottom>
          Airport Configuration
        </Typography>

        <Typography variant="body1" color="textSecondary" paragraph>
          Configure your base airport, allocate airlines to terminals, and assign ground handling agents.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Base Airport
          </Typography>
          <Autocomplete
            id="base-airport-select"
            options={airports}
            value={getAirportById(airportConfig.baseAirport?.id)}
            getOptionLabel={(option) => `${option.name} (${option.iata_code || option.icao_code})`}
            onChange={handleBaseAirportChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Base Airport"
                variant="outlined"
                fullWidth
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        </Paper>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Airline Terminal Allocations
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Allocation
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Airline</TableCell>
                  <TableCell>Terminal</TableCell>
                  <TableCell>Ground Handling Agent</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {airportConfig.airlineAllocations.length > 0 ? (
                  airportConfig.airlineAllocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        {allocation.airline_iata_code
                          ? `${allocation.airline_iata_code} - ${allocation.airline_name}`
                          : allocation.airline_name}
                      </TableCell>
                      <TableCell>{allocation.terminal_code} - {allocation.terminal_name}</TableCell>
                      <TableCell>{allocation.gha_name || 'Not assigned'}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenDialog(allocation)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteAllocation(allocation.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No airline terminal allocations found. Click 'Add Allocation' to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Allocation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAllocation.id ? 'Edit Allocation' : 'Add Allocation'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                id="airline-select"
                options={airlines}
                value={airlines.find(a => a.id === currentAllocation.airlineId) || null}
                getOptionLabel={(option) => 
                  option.iata_code 
                    ? `${option.iata_code} - ${option.name}` 
                    : option.name
                }
                onChange={(e, value) => 
                  setCurrentAllocation({
                    ...currentAllocation,
                    airlineId: value ? value.id : null
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Airline *"
                    variant="outlined"
                    required
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="terminal-select"
                options={terminals}
                value={terminals.find(t => t.id === currentAllocation.terminalId) || null}
                getOptionLabel={(option) => `${option.code} - ${option.name}`}
                onChange={(e, value) => 
                  setCurrentAllocation({
                    ...currentAllocation,
                    terminalId: value ? value.id : null
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Terminal *"
                    variant="outlined"
                    required
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="gha-select"
                options={ghas}
                value={ghas.find(g => g.id === currentAllocation.ghaId) || null}
                getOptionLabel={(option) => option.name}
                onChange={(e, value) => 
                  setCurrentAllocation({
                    ...currentAllocation,
                    ghaId: value ? value.id : null
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ground Handling Agent (Optional)"
                    variant="outlined"
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveAllocation} 
            color="primary" 
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AirportConfiguration; 