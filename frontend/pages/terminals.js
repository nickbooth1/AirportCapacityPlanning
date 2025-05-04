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
  Snackbar
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTerminalId, setCurrentTerminalId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [terminalToDelete, setTerminalToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch terminals on component mount
  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      const response = await api.getTerminals();
      setTerminals(response.data.data || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching terminals:', error);
      setError('Failed to load terminals. Please try again later.');
      setLoading(false);
    }
  };

  const handleOpenDialog = (terminal = null) => {
    if (terminal) {
      // Edit mode
      setIsEditMode(true);
      setCurrentTerminalId(terminal.id);
      setFormData({
        name: terminal.name,
        code: terminal.code,
        description: terminal.description || ''
      });
    } else {
      // Add mode
      setIsEditMode(false);
      setCurrentTerminalId(null);
      setFormData({ name: '', code: '', description: '' });
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
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (isEditMode) {
        // Update existing terminal
        await api.updateTerminal(currentTerminalId, formData);
        setSnackbar({
          open: true,
          message: 'Terminal updated successfully',
          severity: 'success'
        });
      } else {
        // Create new terminal
        await api.createTerminal(formData);
        setSnackbar({
          open: true,
          message: 'Terminal created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchTerminals();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} terminal:`, error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} terminal`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDeleteClick = (terminal) => {
    setTerminalToDelete(terminal);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setTerminalToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!terminalToDelete) return;
    
    try {
      await api.deleteTerminal(terminalToDelete.id);
      setDeleteConfirmOpen(false);
      setTerminalToDelete(null);
      fetchTerminals();
      setSnackbar({
        open: true,
        message: 'Terminal deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting terminal:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete terminal',
        severity: 'error'
      });
    }
  };

  return (
    <Layout title="Terminal Management">
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Terminals
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add Terminal
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
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {terminals.length > 0 ? (
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
                          onClick={() => handleOpenDialog(terminal)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(terminal)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No terminals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Terminal Dialog (Add/Edit) */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{isEditMode ? 'Edit Terminal' : 'Add New Terminal'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="name"
                  label="Terminal Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="code"
                  label="Terminal Code"
                  value={formData.code}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!!formErrors.code}
                  helperText={formErrors.code}
                />
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {isEditMode ? 'Update' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete terminal "{terminalToDelete?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
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
          message={snackbar.message}
        />
      </Container>
    </Layout>
  );
} 