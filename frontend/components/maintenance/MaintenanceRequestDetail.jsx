import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, FormControl, InputLabel, 
  Select, MenuItem, Typography, Grid, Paper, Alert,
  CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Snackbar
} from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useRouter } from 'next/router';
import api from '../../lib/api';

const MaintenanceRequestDetail = ({ requestId }) => {
  const router = useRouter();
  const isNew = requestId === 'new';
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stand_id: '',
    requestor_name: '',
    requestor_email: '',
    requestor_department: '',
    start_datetime: new Date(),
    end_datetime: new Date(new Date().getTime() + 3600000), // Default to 1 hour later
    status_id: 1, // Default to "Requested"
    priority: 'Medium', // Default priority
    impact_description: '', // Optional field that exists in the database
  });
  
  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [stands, setStands] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  
  // Load existing request data if editing
  useEffect(() => {
    if (!isNew) {
      fetchRequestData();
    }
    
    // Load stands and status types
    fetchStands();
    fetchStatusTypes();
  }, [requestId]);
  
  const fetchRequestData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/maintenance/requests/${requestId}`);
      setFormData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load maintenance request data');
      setLoading(false);
      console.error(err);
    }
  };
  
  const fetchStands = async () => {
    try {
      const response = await api.get('/stands');
      setStands(response.data);
    } catch (err) {
      console.error('Failed to load stands', err);
    }
  };
  
  const fetchStatusTypes = async () => {
    try {
      const response = await api.get('/maintenance/status-types');
      setStatusTypes(response.data);
    } catch (err) {
      console.error('Failed to load status types', err);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (isNew) {
        await api.post('/maintenance/requests', formData);
      } else {
        await api.put(`/maintenance/requests/${requestId}`, formData);
      }
      
      setSuccess(true);
      setSaving(false);
      
      // Redirect after successful save
      setTimeout(() => {
        router.push('/maintenance/requests');
      }, 1500);
      
    } catch (err) {
      setSaving(false);
      setError(`Failed to ${isNew ? 'create' : 'update'} maintenance request: ${err.message}`);
      console.error(err);
    }
  };
  
  const handleCancel = () => {
    router.push('/maintenance/requests');
  };
  
  if (loading) {
    return <CircularProgress />;
  }
  
  return (
    <Box component={Paper} p={3}>
      <Typography variant="h5" mb={3}>
        {isNew ? 'Create New Maintenance Request' : 'Edit Maintenance Request'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Stand</InputLabel>
              <Select
                name="stand_id"
                value={formData.stand_id}
                onChange={handleChange}
                label="Stand"
              >
                {stands.map(stand => (
                  <MenuItem key={stand.id} value={stand.id}>
                    {stand.code} - {stand.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={4}
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              required
              label="Requestor Name"
              name="requestor_name"
              value={formData.requestor_name}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              required
              type="email"
              label="Requestor Email"
              name="requestor_email"
              value={formData.requestor_email}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              required
              label="Requestor Department"
              name="requestor_department"
              value={formData.requestor_department}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Date/Time"
                value={formData.start_datetime}
                onChange={(newValue) => handleDateChange('start_datetime', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="End Date/Time"
                value={formData.end_datetime}
                onChange={(newValue) => handleDateChange('end_datetime', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
                minDateTime={formData.start_datetime}
              />
            </LocalizationProvider>
          </Grid>
          
          {!isNew && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status_id"
                  value={formData.status_id}
                  onChange={handleChange}
                  label="Status"
                >
                  {statusTypes.map(status => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                label="Priority"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Impact Description (Optional)"
              name="impact_description"
              value={formData.impact_description}
              onChange={handleChange}
              variant="outlined"
              helperText="Describe any potential impact on airport operations"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={() => setConfirmCancel(true)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  isNew ? 'Create Request' : 'Update Request'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      {/* Confirmation dialog for canceling */}
      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
      >
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel? Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)}>No, Keep Editing</Button>
          <Button onClick={handleCancel} color="primary" autoFocus>
            Yes, Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success message */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        message={`Maintenance request ${isNew ? 'created' : 'updated'} successfully`}
      />
    </Box>
  );
};

export default MaintenanceRequestDetail; 