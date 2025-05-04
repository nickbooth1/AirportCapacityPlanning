import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function PiersPage() {
  const [piers, setPiers] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPierId, setCurrentPierId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pierToDelete, setPierToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    terminal_id: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch piers and terminals on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [piersResponse, terminalsResponse] = await Promise.all([
          api.getPiers(),
          api.getTerminals()
        ]);
        setPiers(piersResponse.data.data || piersResponse.data);
        setTerminals(terminalsResponse.data.data || terminalsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchPiers = async () => {
    try {
      const response = await api.getPiers();
      setPiers(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching piers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to refresh piers data',
        severity: 'error'
      });
    }
  };

  const handleOpenDialog = (pier = null) => {
    if (pier) {
      // Edit mode
      setIsEditMode(true);
      setCurrentPierId(pier.id);
      setFormData({
        name: pier.name,
        code: pier.code,
        terminal_id: pier.terminal_id,
        description: pier.description || ''
      });
    } else {
      // Add mode
      setIsEditMode(false);
      setCurrentPierId(null);
      setFormData({ name: '', code: '', terminal_id: '', description: '' });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
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

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.code.trim()) errors.code = 'Code is required';
    if (!formData.terminal_id) errors.terminal_id = 'Terminal is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      // Create a copy of formData with properly formatted terminal_id
      const submissionData = {
        ...formData,
        terminal_id: parseInt(formData.terminal_id, 10)
      };
      
      if (isEditMode) {
        // Update existing pier
        await api.updatePier(currentPierId, submissionData);
        setSnackbar({
          open: true,
          message: 'Pier updated successfully',
          severity: 'success'
        });
      } else {
        // Create new pier
        await api.createPier(submissionData);
        setSnackbar({
          open: true,
          message: 'Pier created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchPiers();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} pier:`, error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} pier`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDeleteClick = (pier) => {
    setPierToDelete(pier);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPierToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!pierToDelete) return;
    
    try {
      await api.deletePier(pierToDelete.id);
      setDeleteConfirmOpen(false);
      setPierToDelete(null);
      fetchPiers();
      setSnackbar({
        open: true,
        message: 'Pier deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting pier:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete pier',
        severity: 'error'
      });
    }
  };

  // Function to get terminal name by ID
  const getTerminalName = (terminalId) => {
    const terminal = terminals.find(t => t.id === terminalId);
    return terminal ? terminal.name : 'Unknown';
  };

  return (
    <Layout title="Pier Management">
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Piers
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add Pier
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
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
                {piers.length > 0 ? (
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
                          onClick={() => handleOpenDialog(pier)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(pier)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No piers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Pier Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{isEditMode ? 'Edit Pier' : 'Add New Pier'}</DialogTitle>
          <DialogContent>
            <Box my={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    name="name"
                    label="Pier Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="code"
                    label="Pier Code"
                    value={formData.code}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!formErrors.code}
                    helperText={formErrors.code}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal" error={!!formErrors.terminal_id}>
                    <InputLabel id="terminal-select-label">Terminal</InputLabel>
                    <Select
                      labelId="terminal-select-label"
                      name="terminal_id"
                      value={formData.terminal_id}
                      onChange={handleInputChange}
                      label="Terminal"
                    >
                      {terminals.map((terminal) => (
                        <MenuItem key={terminal.id} value={terminal.id}>
                          {terminal.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.terminal_id && (
                      <Typography variant="caption" color="error">
                        {formErrors.terminal_id}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    rows={3}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete pier "{pierToDelete?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
} 