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
  Tooltip,
  Tabs,
  Tab,
  MenuItem
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Info as InfoIcon,
  Place as PlaceIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { useAirportConfig } from '../../contexts/AirportConfigContext';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Custom TabPanel component for TabPanel content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`airport-config-tabpanel-${index}`}
      aria-labelledby={`airport-config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Airport Configuration Component
 * 
 * Allows users to configure their base airport, manage airline terminal allocations,
 * and manage terminals and piers
 */
const AirportConfiguration = () => {
  // State for component
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [ghas, setGhas] = useState([]);
  const [piers, setPiers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [pierDialogOpen, setPierDialogOpen] = useState(false);
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

  // Terminal and Pier form data
  const [currentTerminal, setCurrentTerminal] = useState({
    id: null,
    name: '',
    code: '',
    description: ''
  });

  const [currentPier, setCurrentPier] = useState({
    id: null,
    name: '',
    code: '',
    terminal_id: '',
    description: ''
  });
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Form errors
  const [formErrors, setFormErrors] = useState({});

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

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch reference data (airports, airlines, terminals, GHAs, piers)
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch data in parallel
        const [airportsRes, airlinesRes, terminalsRes, ghasRes, piersRes] = await Promise.all([
          axios.get(`${API_URL}/airports?limit=6000`),
          axios.get(`${API_URL}/airlines`),
          axios.get(`${API_URL}/terminals`),
          axios.get(`${API_URL}/ghas`),
          axios.get(`${API_URL}/piers`)
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
        setPiers(extractData(piersRes));

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
        showNotification(`Airline allocation ${actionText}ed successfully`);
        handleCloseDialog();
        refreshConfig();
      } else {
        showNotification(`Failed to ${actionText} airline allocation`, 'error');
      }
    } catch (error) {
      console.error(`Error ${actionText}ing airline allocation:`, error);
      showNotification(`Failed to ${actionText} airline allocation: ${error.message}`, 'error');
    }
  };

  // Handle allocation deletion
  const handleDeleteAllocation = async (id) => {
    // Show confirmation dialog
    openConfirmation(
      'Delete Allocation?',
      'Are you sure you want to delete this airline terminal allocation? This action cannot be undone.',
      async () => {
        const success = await deleteAirlineAllocation(id);
        if (success) {
          showNotification('Airline allocation deleted successfully');
          refreshConfig();
        } else {
          showNotification('Failed to delete airline allocation', 'error');
        }
      },
      id
    );
  };

  // Function to get entity by ID from array
  const getEntityById = (array, id) => {
    return array.find(item => item.id === id) || null;
  };

  // Get airport by ID
  const getAirportById = (id) => getEntityById(airports, id);
  
  // Get airline by ID
  const getAirlineById = (id) => getEntityById(airlines, id);
  
  // Get terminal by ID
  const getTerminalById = (id) => getEntityById(terminals, id);
  
  // Get GHA by ID
  const getGhaById = (id) => getEntityById(ghas, id);

  // === TERMINAL MANAGEMENT ===

  // Open terminal dialog for add/edit
  const handleOpenTerminalDialog = (terminal = null) => {
    if (terminal) {
      // Edit mode
      setCurrentTerminal({
        id: terminal.id,
        name: terminal.name,
        code: terminal.code,
        description: terminal.description || ''
      });
    } else {
      // Add mode
      setCurrentTerminal({
        id: null,
        name: '',
        code: '',
        description: ''
      });
    }
    setFormErrors({});
    setTerminalDialogOpen(true);
  };

  // Close terminal dialog
  const handleCloseTerminalDialog = () => {
    setTerminalDialogOpen(false);
  };

  // Handle terminal form input change
  const handleTerminalInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTerminal({
      ...currentTerminal,
      [name]: value
    });
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate terminal form
  const validateTerminalForm = () => {
    const errors = {};
    if (!currentTerminal.name.trim()) errors.name = 'Name is required';
    if (!currentTerminal.code.trim()) errors.code = 'Code is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save terminal
  const handleSaveTerminal = async () => {
    if (!validateTerminalForm()) return;
    
    try {
      if (currentTerminal.id) {
        // Update existing terminal
        await axios.put(`${API_URL}/terminals/${currentTerminal.id}`, currentTerminal);
        showNotification('Terminal updated successfully');
      } else {
        // Create new terminal
        await axios.post(`${API_URL}/terminals`, currentTerminal);
        showNotification('Terminal created successfully');
      }
      
      handleCloseTerminalDialog();
      
      // Refresh terminal data
      const response = await axios.get(`${API_URL}/terminals`);
      setTerminals(response.data.data || response.data);
      
      // Also refresh allocations since they may reference terminals
      refreshConfig();
    } catch (error) {
      console.error(`Error ${currentTerminal.id ? 'updating' : 'creating'} terminal:`, error);
      showNotification(
        error.response?.data?.message || 
        `Failed to ${currentTerminal.id ? 'update' : 'create'} terminal`, 
        'error'
      );
    }
  };

  // Handle terminal deletion
  const handleDeleteTerminal = (terminal) => {
    // Show confirmation dialog
    openConfirmation(
      'Delete Terminal?',
      `Are you sure you want to delete the terminal "${terminal.name}"? This will also affect any piers and airline allocations associated with this terminal.`,
      async () => {
        try {
          await axios.delete(`${API_URL}/terminals/${terminal.id}`);
          
          // Refresh terminal data
          const response = await axios.get(`${API_URL}/terminals`);
          setTerminals(response.data.data || response.data);
          
          // Also refresh allocations since they may reference terminals
          refreshConfig();
          
          // Refresh piers as they may reference this terminal
          const piersResponse = await axios.get(`${API_URL}/piers`);
          setPiers(piersResponse.data.data || piersResponse.data);
          
          showNotification('Terminal deleted successfully');
        } catch (error) {
          console.error('Error deleting terminal:', error);
          showNotification(
            error.response?.data?.message || 'Failed to delete terminal', 
            'error'
          );
        }
      }
    );
  };

  // === PIER MANAGEMENT ===

  // Open pier dialog for add/edit
  const handleOpenPierDialog = (pier = null) => {
    if (pier) {
      // Edit mode
      setCurrentPier({
        id: pier.id,
        name: pier.name,
        code: pier.code,
        terminal_id: pier.terminal_id,
        description: pier.description || ''
      });
    } else {
      // Add mode
      setCurrentPier({
        id: null,
        name: '',
        code: '',
        terminal_id: '',
        description: ''
      });
    }
    setFormErrors({});
    setPierDialogOpen(true);
  };

  // Close pier dialog
  const handleClosePierDialog = () => {
    setPierDialogOpen(false);
  };

  // Handle pier form input change
  const handlePierInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPier({
      ...currentPier,
      [name]: value
    });
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate pier form
  const validatePierForm = () => {
    const errors = {};
    if (!currentPier.name.trim()) errors.name = 'Name is required';
    if (!currentPier.code.trim()) errors.code = 'Code is required';
    if (!currentPier.terminal_id) errors.terminal_id = 'Terminal is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save pier
  const handleSavePier = async () => {
    if (!validatePierForm()) return;
    
    try {
      // Create a copy of formData with properly formatted terminal_id
      const submissionData = {
        ...currentPier,
        terminal_id: parseInt(currentPier.terminal_id, 10)
      };
      
      if (currentPier.id) {
        // Update existing pier
        await axios.put(`${API_URL}/piers/${currentPier.id}`, submissionData);
        showNotification('Pier updated successfully');
      } else {
        // Create new pier
        await axios.post(`${API_URL}/piers`, submissionData);
        showNotification('Pier created successfully');
      }
      
      handleClosePierDialog();
      
      // Refresh pier data
      const response = await axios.get(`${API_URL}/piers`);
      setPiers(response.data.data || response.data);
    } catch (error) {
      console.error(`Error ${currentPier.id ? 'updating' : 'creating'} pier:`, error);
      showNotification(
        error.response?.data?.message || 
        `Failed to ${currentPier.id ? 'update' : 'create'} pier`, 
        'error'
      );
    }
  };

  // Handle pier deletion
  const handleDeletePier = (pier) => {
    // Show confirmation dialog
    openConfirmation(
      'Delete Pier?',
      `Are you sure you want to delete the pier "${pier.name}"? This will affect any stands associated with this pier.`,
      async () => {
        try {
          await axios.delete(`${API_URL}/piers/${pier.id}`);
          
          // Refresh pier data
          const response = await axios.get(`${API_URL}/piers`);
          setPiers(response.data.data || response.data);
          
          showNotification('Pier deleted successfully');
        } catch (error) {
          console.error('Error deleting pier:', error);
          showNotification(
            error.response?.data?.message || 'Failed to delete pier', 
            'error'
          );
        }
      }
    );
  };

  // Function to get terminal name by ID
  const getTerminalName = (terminalId) => {
    const terminal = terminals.find(t => t.id === terminalId);
    return terminal ? terminal.name : 'Unknown';
  };

  // Rest of component

  return (
    <Container maxWidth="lg">
      <Box display="flex" flexDirection="column" mb={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/config" color="inherit">
            Configuration
          </MuiLink>
          <Typography color="textPrimary">Airport Configuration</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Airport Configuration
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Configure your base airport, manage terminals, piers, and airline terminal allocations.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Base Airport Configuration */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Base Airport
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Select your primary airport of operation. This will be used as the default for capacity planning.
          </Typography>
          
          <Box mt={2}>
            <Autocomplete
              id="base-airport-selector"
              options={airports}
              getOptionLabel={(option) => `${option.name} (${option.iata_code || option.icao_code})`}
              value={airportConfig && airportConfig.baseAirport ? getAirportById(airportConfig.baseAirport.id) : null}
              onChange={handleBaseAirportChange}
              loading={loadingData}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Base Airport"
                  variant="outlined"
                  fullWidth
                  helperText="Select the primary airport for your operations"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingData ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>
        </Paper>
        
        {/* Tabs for Terminals, Piers, and Airline Allocations */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="airport configuration tabs">
              <Tab label="Airline Allocations" id="tab-0" />
              <Tab label="Terminals" id="tab-1" />
              <Tab label="Piers" id="tab-2" />
            </Tabs>
          </Box>
          
          {/* Airline Allocations Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="h3">
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
            
            <Paper>
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
                    {!airportConfig || !airportConfig.allocations || airportConfig.allocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No airline terminal allocations configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      airportConfig.allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            {getAirlineById(allocation.airline_id)?.name || `Airline #${allocation.airline_id}`}
                          </TableCell>
                          <TableCell>
                            {getTerminalById(allocation.terminal_id)?.name || `Terminal #${allocation.terminal_id}`}
                          </TableCell>
                          <TableCell>
                            {allocation.gha_id ? (getGhaById(allocation.gha_id)?.name || `GHA #${allocation.gha_id}`) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog(allocation)}
                              aria-label="Edit allocation"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteAllocation(allocation.id)}
                              aria-label="Delete allocation"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </TabPanel>
          
          {/* Terminals Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="h3">
                Terminal Management
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => handleOpenTerminalDialog()}
              >
                Add Terminal
              </Button>
            </Box>
            
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {terminals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No terminals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      terminals.map((terminal) => (
                        <TableRow key={terminal.id}>
                          <TableCell>{terminal.id}</TableCell>
                          <TableCell>{terminal.name}</TableCell>
                          <TableCell>{terminal.code}</TableCell>
                          <TableCell>{terminal.description}</TableCell>
                          <TableCell align="right">
                            <Button 
                              size="small" 
                              color="primary" 
                              sx={{ mr: 1 }}
                              onClick={() => handleOpenTerminalDialog(terminal)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteTerminal(terminal)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </TabPanel>
          
          {/* Piers Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="h3">
                Pier Management
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => handleOpenPierDialog()}
              >
                Add Pier
              </Button>
            </Box>
            
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Terminal</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {piers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No piers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      piers.map((pier) => (
                        <TableRow key={pier.id}>
                          <TableCell>{pier.id}</TableCell>
                          <TableCell>{pier.name}</TableCell>
                          <TableCell>{pier.code}</TableCell>
                          <TableCell>{getTerminalName(pier.terminal_id)}</TableCell>
                          <TableCell>{pier.description}</TableCell>
                          <TableCell align="right">
                            <Button 
                              size="small" 
                              color="primary" 
                              sx={{ mr: 1 }}
                              onClick={() => handleOpenPierDialog(pier)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="small" 
                              color="error"
                              onClick={() => handleDeletePier(pier)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </TabPanel>
        </Box>
      </Box>
      
      {/* Allocation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAllocation.id ? 'Edit Airline Terminal Allocation' : 'Add Airline Terminal Allocation'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                id="airline-selector"
                options={airlines}
                getOptionLabel={(option) => option.name}
                value={currentAllocation.airlineId ? getAirlineById(currentAllocation.airlineId) : null}
                onChange={(event, newValue) => {
                  setCurrentAllocation({
                    ...currentAllocation,
                    airlineId: newValue ? newValue.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Airline"
                    variant="outlined"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="terminal-selector"
                options={terminals}
                getOptionLabel={(option) => option.name}
                value={currentAllocation.terminalId ? getTerminalById(currentAllocation.terminalId) : null}
                onChange={(event, newValue) => {
                  setCurrentAllocation({
                    ...currentAllocation,
                    terminalId: newValue ? newValue.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Terminal"
                    variant="outlined"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="gha-selector"
                options={ghas}
                getOptionLabel={(option) => option.name}
                value={currentAllocation.ghaId ? getGhaById(currentAllocation.ghaId) : null}
                onChange={(event, newValue) => {
                  setCurrentAllocation({
                    ...currentAllocation,
                    ghaId: newValue ? newValue.id : null
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ground Handling Agent (optional)"
                    variant="outlined"
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveAllocation} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Terminal Dialog */}
      <Dialog open={terminalDialogOpen} onClose={handleCloseTerminalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentTerminal.id ? 'Edit Terminal' : 'Add Terminal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Name"
                variant="outlined"
                required
                fullWidth
                value={currentTerminal.name}
                onChange={handleTerminalInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="code"
                label="Code"
                variant="outlined"
                required
                fullWidth
                value={currentTerminal.code}
                onChange={handleTerminalInputChange}
                error={!!formErrors.code}
                helperText={formErrors.code}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={currentTerminal.description}
                onChange={handleTerminalInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTerminalDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveTerminal} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Pier Dialog */}
      <Dialog open={pierDialogOpen} onClose={handleClosePierDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentPier.id ? 'Edit Pier' : 'Add Pier'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Name"
                variant="outlined"
                required
                fullWidth
                value={currentPier.name}
                onChange={handlePierInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="code"
                label="Code"
                variant="outlined"
                required
                fullWidth
                value={currentPier.code}
                onChange={handlePierInputChange}
                error={!!formErrors.code}
                helperText={formErrors.code}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                name="terminal_id"
                label="Terminal"
                variant="outlined"
                required
                fullWidth
                value={currentPier.terminal_id}
                onChange={handlePierInputChange}
                error={!!formErrors.terminal_id}
                helperText={formErrors.terminal_id}
              >
                {terminals.map((terminal) => (
                  <MenuItem key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={currentPier.description}
                onChange={handlePierInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePierDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSavePier} color="primary" variant="contained">
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
          <Button onClick={closeConfirmation} color="inherit">
            Cancel
          </Button>
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
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AirportConfiguration; 