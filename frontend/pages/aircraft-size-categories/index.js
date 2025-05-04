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
import Layout from '../../components/Layout';
import api from '../../lib/api';

export default function AircraftSizeCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    wingspan_min_meters: '',
    wingspan_max_meters: '',
    length_min_meters: '',
    length_max_meters: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.getAircraftSizeCategories();
      setCategories(response.data.data || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load aircraft size categories. Please try again later.');
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      // Edit mode
      setIsEditMode(true);
      setCurrentCategoryId(category.id);
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || '',
        wingspan_min_meters: category.wingspan_min_meters || '',
        wingspan_max_meters: category.wingspan_max_meters || '',
        length_min_meters: category.length_min_meters || '',
        length_max_meters: category.length_max_meters || ''
      });
    } else {
      // Add mode
      setIsEditMode(false);
      setCurrentCategoryId(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        wingspan_min_meters: '',
        wingspan_max_meters: '',
        length_min_meters: '',
        length_max_meters: ''
      });
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

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or integer values
    if (value === '' || (!isNaN(value) && Number.isInteger(parseFloat(value)))) {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseInt(value, 10)
      });
    }
    
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
    if (!formData.code.trim()) errors.code = 'Code is required';
    if (!formData.name.trim()) errors.name = 'Name is required';
    
    // Validate that min values are less than max values
    if (formData.wingspan_min_meters !== '' && formData.wingspan_max_meters !== '' &&
        parseInt(formData.wingspan_min_meters, 10) > parseInt(formData.wingspan_max_meters, 10)) {
      errors.wingspan_min_meters = 'Minimum wingspan cannot be greater than maximum';
    }
    
    if (formData.length_min_meters !== '' && formData.length_max_meters !== '' &&
        parseInt(formData.length_min_meters, 10) > parseInt(formData.length_max_meters, 10)) {
      errors.length_min_meters = 'Minimum length cannot be greater than maximum';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (isEditMode) {
        // Update existing category
        await api.updateAircraftSizeCategory(currentCategoryId, formData);
        setSnackbar({
          open: true,
          message: 'Aircraft size category updated successfully',
          severity: 'success'
        });
      } else {
        // Create new category
        await api.createAircraftSizeCategory(formData);
        setSnackbar({
          open: true,
          message: 'Aircraft size category created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} category:`, error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} category`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await api.deleteAircraftSizeCategory(categoryToDelete.id);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
      setSnackbar({
        open: true,
        message: 'Aircraft size category deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete category',
        severity: 'error'
      });
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <Layout title="Aircraft Size Categories">
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Aircraft Size Categories
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add Size Category
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
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Wingspan (min-max meters)</TableCell>
                  <TableCell>Length (min-max meters)</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.code}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>
                        {category.wingspan_min_meters !== null && category.wingspan_max_meters !== null
                          ? `${category.wingspan_min_meters} - ${category.wingspan_max_meters}`
                          : category.wingspan_min_meters !== null
                            ? `≥ ${category.wingspan_min_meters}`
                            : category.wingspan_max_meters !== null
                              ? `≤ ${category.wingspan_max_meters}`
                              : '-'}
                      </TableCell>
                      <TableCell>
                        {category.length_min_meters !== null && category.length_max_meters !== null
                          ? `${category.length_min_meters} - ${category.length_max_meters}`
                          : category.length_min_meters !== null
                            ? `≥ ${category.length_min_meters}`
                            : category.length_max_meters !== null
                              ? `≤ ${category.length_max_meters}`
                              : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          color="primary" 
                          sx={{ mr: 1 }}
                          onClick={() => handleOpenDialog(category)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(category)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No aircraft size categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Category Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{isEditMode ? 'Edit Aircraft Size Category' : 'Add New Aircraft Size Category'}</DialogTitle>
          <DialogContent>
            <Box my={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="code"
                    label="Code"
                    value={formData.code}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!formErrors.code}
                    helperText={formErrors.code}
                    margin="normal"
                    placeholder="e.g., A, B, C"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="name"
                    label="Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    margin="normal"
                    placeholder="e.g., Small, Medium, Large"
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
                    rows={2}
                    margin="normal"
                    placeholder="Description of the aircraft size category"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Wingspan Range (meters)
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TextField
                      name="wingspan_min_meters"
                      label="Min"
                      value={formData.wingspan_min_meters}
                      onChange={handleNumberInputChange}
                      type="number"
                      fullWidth
                      error={!!formErrors.wingspan_min_meters}
                      helperText={formErrors.wingspan_min_meters}
                      margin="normal"
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      name="wingspan_max_meters"
                      label="Max"
                      value={formData.wingspan_max_meters}
                      onChange={handleNumberInputChange}
                      type="number"
                      fullWidth
                      error={!!formErrors.wingspan_max_meters}
                      helperText={formErrors.wingspan_max_meters}
                      margin="normal"
                      inputProps={{ min: 0 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Length Range (meters)
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TextField
                      name="length_min_meters"
                      label="Min"
                      value={formData.length_min_meters}
                      onChange={handleNumberInputChange}
                      type="number"
                      fullWidth
                      error={!!formErrors.length_min_meters}
                      helperText={formErrors.length_min_meters}
                      margin="normal"
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      name="length_max_meters"
                      label="Max"
                      value={formData.length_max_meters}
                      onChange={handleNumberInputChange}
                      type="number"
                      fullWidth
                      error={!!formErrors.length_max_meters}
                      helperText={formErrors.length_max_meters}
                      margin="normal"
                      inputProps={{ min: 0 }}
                    />
                  </Box>
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
              Are you sure you want to delete the "{categoryToDelete?.name}" size category? This action cannot be undone.
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