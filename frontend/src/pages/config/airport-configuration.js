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
  DialogContentText,
  Alert,
  Snackbar,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Info as InfoIcon 
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

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
    id: null
  });
  
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
          axios.get(`${API_URL}/airports?limit=6000`),
          axios.get(`${API_URL}/airlines`),
          axios.get(`${API_URL}/terminals`),
          axios.get(`${API_URL}/ghas`)
        ]);

        // Helper function to extract data regardless of response format
        const extractData = (response) => {
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data && response.data.data) {
            return response.data.data;
          } else {
            return [];
          }
        };

        // Extract data from responses
        setAirports(extractData(airportsRes));
        setAirlines(extractData(airlinesRes));
        setTerminals(extractData(terminalsRes));
        setGhas(extractData(ghasRes));

        console.log('Data loaded. Terminals count:', extractData(terminalsRes).length);
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

  // Open confirmation dialog
  const openConfirmation = (title, message, action, id = null) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action,
      id
    });
  };

  // Close confirmation dialog
  const closeConfirmation = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false
    });
  };

  // Handle confirmation action
  const handleConfirmAction = async () => {
    if (confirmDialog.action && typeof confirmDialog.action === 'function') {
      await confirmDialog.action(confirmDialog.id);
    }
    closeConfirmation();
  };

  // Handle base airport change
  const handleBaseAirportChange = async (event, value) => {
    if (value) {
      // First, show confirmation dialog
      openConfirmation(
        'Change Base Airport?',
        `Are you sure you want to set ${value.name} (${value.iata_code || value.icao_code}) as your base airport? This will affect all airport-related configurations.`,
        async () => {
          const success = await updateBaseAirport(value.id);
          if (success) {
            showNotification('Base airport updated successfully');
          } else {
            showNotification('Failed to update base airport', 'error');
          }
        }
      );
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
    
    // Ensure we're sending integer IDs and not objects
    const allocationData = {
      airlineId: typeof currentAllocation.airlineId === 'object' ? currentAllocation.airlineId.id : currentAllocation.airlineId,
      terminalId: typeof currentAllocation.terminalId === 'object' ? currentAllocation.terminalId.id : currentAllocation.terminalId,
      ghaId: currentAllocation.ghaId ? (typeof currentAllocation.ghaId === 'object' ? currentAllocation.ghaId.id : currentAllocation.ghaId) : null
    };
    
    console.log('Sending allocation data:', allocationData);

    let success;
    let actionText = currentAllocation.id ? 'update' : 'add';

    try {
      if (currentAllocation.id) {
        // Update existing allocation
        success = await updateAirlineAllocation(
          currentAllocation.id,
          allocationData
        );
      } else {
        // Add new allocation
        success = await addAirlineAllocation(allocationData);
      }

      if (success) {
        showNotification(`Allocation ${actionText}ed successfully`);
        handleCloseDialog();
      } else {
        showNotification(`Failed to ${actionText} allocation`, 'error');
      }
    } catch (err) {
      console.error(`Error ${actionText}ing allocation:`, err);
      showNotification(
        err.response?.data?.message || `An error occurred while ${actionText}ing the allocation`,
        'error'
      );
    }
  };

  // Delete allocation
  const handleDeleteAllocation = async (id) => {
    const allocation = airportConfig.airlineAllocations.find(a => a.id === id);
    
    if (allocation) {
      openConfirmation(
        'Delete Allocation?',
        `Are you sure you want to delete the allocation for ${allocation.airline_name} in ${allocation.terminal_name}?`,
        async () => {
          try {
            const success = await deleteAirlineAllocation(id);
            if (success) {
              showNotification('Allocation deleted successfully');
            } else {
              showNotification('Failed to delete allocation', 'error');
            }
          } catch (err) {
            console.error('Error deleting allocation:', err);
            showNotification('An error occurred while deleting the allocation', 'error');
          }
        },
        id
      );
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
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              Base Airport
            </Typography>
            <Tooltip title="The base airport is used for various capacity planning calculations. All terminal and stand allocations are assumed to be for this airport.">
              <InfoIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
            </Tooltip>
          </Box>
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
                helperText="Select the primary airport for which you want to manage capacity"
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        </Paper>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <Typography variant="h6">
                Airline Terminal Allocations
              </Typography>
              <Tooltip title="Associate airlines with specific terminals and optionally assign ground handling agents to support their operations">
                <InfoIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
              </Tooltip>
            </Box>
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
                        <Tooltip title="Edit allocation">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenDialog(allocation)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete allocation">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteAllocation(allocation.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
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
                onChange={(e, value) => {
                  console.log('Selected airline:', value);
                  setCurrentAllocation({
                    ...currentAllocation,
                    airlineId: value ? value.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Airline *"
                    variant="outlined"
                    required
                    fullWidth
                    helperText="Select the airline to allocate to a terminal"
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
                onChange={(e, value) => {
                  console.log('Selected terminal:', value);
                  setCurrentAllocation({
                    ...currentAllocation,
                    terminalId: value ? value.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Terminal *"
                    variant="outlined"
                    required
                    fullWidth
                    helperText="Select the terminal where the airline operates"
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
                onChange={(e, value) => {
                  console.log('Selected GHA:', value);
                  setCurrentAllocation({
                    ...currentAllocation,
                    ghaId: value ? value.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ground Handling Agent (Optional)"
                    variant="outlined"
                    fullWidth
                    helperText="Optionally assign a ground handling agent to this airline's operations"
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmation}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmation} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmAction} color="primary" variant="contained" autoFocus>
            Confirm
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