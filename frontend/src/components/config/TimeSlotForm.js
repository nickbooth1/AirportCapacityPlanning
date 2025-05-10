import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Grid
} from '@mui/material';
import { createTimeSlot, updateTimeSlot } from '../../lib/configApi';

const TimeSlotForm = ({ slot, onSaveSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: slot?.name || '',
    start_time: slot?.start_time ? slot.start_time.substring(0, 5) : '06:00',
    end_time: slot?.end_time ? slot.end_time.substring(0, 5) : '09:00',
    description: slot?.description || '',
    is_active: slot?.is_active !== false // true by default
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value // Store without seconds in form state for display
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        name: formData.name,
        start_time: `${formData.start_time}:00`, // Add seconds for API
        end_time: `${formData.end_time}:00`, // Add seconds for API
        description: formData.description || null,
        is_active: formData.is_active
      };
      
      if (slot) {
        // Update existing time slot
        await updateTimeSlot(slot.id, payload);
      } else {
        // Create new time slot
        await createTimeSlot(payload);
      }
      
      onSaveSuccess();
    } catch (err) {
      console.error('Failed to save time slot:', err);
      setError(err.response?.data?.message || 'Failed to save time slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Time Slot Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            helperText="Unique name for this time slot (e.g., 'Morning Peak', 'Lunch Hour')"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="start_time"
            label="Start Time"
            name="start_time"
            type="time"
            value={formData.start_time.substring(0, 5)}
            onChange={(e) => handleTimeChange(e)}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              step: 300, // 5 min steps
            }}
            helperText="Start time of this slot (HH:MM)"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="end_time"
            label="End Time"
            name="end_time"
            type="time"
            value={formData.end_time.substring(0, 5)}
            onChange={(e) => handleTimeChange(e)}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              step: 300, // 5 min steps
            }}
            helperText="End time of this slot (HH:MM)"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            margin="normal"
            fullWidth
            id="description"
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            multiline
            rows={2}
            helperText="Optional description for this time slot"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel 
            control={
              <Switch 
                checked={formData.is_active} 
                onChange={handleChange}
                name="is_active"
                color="primary"
              />
            } 
            label="Active"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={onCancel}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !formData.name || !formData.start_time || !formData.end_time}
        >
          {loading ? <CircularProgress size={24} /> : (slot ? 'Update Slot' : 'Create Slot')}
        </Button>
      </Box>
    </Box>
  );
};

export default TimeSlotForm; 