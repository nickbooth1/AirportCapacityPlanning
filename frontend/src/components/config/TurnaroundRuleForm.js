import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../../lib/api';
import { createTurnaroundRule, updateTurnaroundRule } from '../../lib/configApi';

const TurnaroundRuleForm = ({ rule, onSaveSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    aircraft_type_id: '',
    min_turnaround_minutes: 30
  });
  
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTypes, setFetchingTypes] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch aircraft types for dropdown selection
    const fetchAircraftTypes = async () => {
      try {
        setFetchingTypes(true);
        const response = await api.get('/api/aircraft-types');
        
        // Filter out aircraft types that already have rules (for new rule creation)
        if (!rule) {
          // For existing rules, we need to know which ones to exclude
          const rulesResponse = await api.get('/api/config/turnaround-rules');
          const existingRuleTypeIds = rulesResponse.data.map(r => r.aircraft_type_id);
          
          setAircraftTypes(response.data.filter(type => 
            !existingRuleTypeIds.includes(type.id)
          ));
        } else {
          // For editing, we still want to show all types but disable the ones that have rules
          setAircraftTypes(response.data);
          
          // Initialize form with current rule data
          setFormData({
            aircraft_type_id: rule.aircraft_type_id,
            min_turnaround_minutes: rule.min_turnaround_minutes
          });
        }
      } catch (err) {
        console.error('Failed to fetch aircraft types:', err);
        setError('Failed to load aircraft types. Please try again.');
      } finally {
        setFetchingTypes(false);
      }
    };
    
    fetchAircraftTypes();
  }, [rule]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'min_turnaround_minutes') {
      // Ensure it's a positive integer
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (rule) {
        // Update existing rule
        await updateTurnaroundRule(rule.aircraft_type_id, {
          min_turnaround_minutes: formData.min_turnaround_minutes
        });
      } else {
        // Create new rule
        await createTurnaroundRule({
          aircraft_type_id: formData.aircraft_type_id,
          min_turnaround_minutes: formData.min_turnaround_minutes
        });
      }
      
      onSaveSuccess();
    } catch (err) {
      console.error('Failed to save turnaround rule:', err);
      setError(err.response?.data?.message || 'Failed to save turnaround rule. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchingTypes) {
    return (
      <Box display="flex" justifyContent="center" my={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <FormControl fullWidth margin="normal" disabled={!!rule}>
        <InputLabel id="aircraft-type-label">Aircraft Type</InputLabel>
        <Select
          labelId="aircraft-type-label"
          id="aircraft_type_id"
          name="aircraft_type_id"
          value={formData.aircraft_type_id}
          onChange={handleChange}
          required
          label="Aircraft Type"
          disabled={!!rule} // Disable when editing (can't change aircraft type)
        >
          {rule ? (
            // In edit mode, show just the selected aircraft type
            <MenuItem value={rule.aircraft_type_id}>
              {rule.aircraftType?.name || 'Unknown Aircraft Type'}
            </MenuItem>
          ) : (
            // In create mode, show all available aircraft types without rules
            aircraftTypes.map(type => (
              <MenuItem key={type.id} value={type.id}>
                {type.name} ({type.icao_code})
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText>
          {rule 
            ? 'Aircraft type cannot be changed' 
            : 'Select an aircraft type for this turnaround rule'}
        </FormHelperText>
      </FormControl>
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="min_turnaround_minutes"
        label="Minimum Turnaround Time (minutes)"
        name="min_turnaround_minutes"
        type="number"
        value={formData.min_turnaround_minutes}
        onChange={handleChange}
        InputProps={{ inputProps: { min: 1 } }}
        helperText="The minimum time required for this aircraft type to turnaround on a stand"
      />
      
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
          disabled={loading || (!formData.aircraft_type_id && !rule) || !formData.min_turnaround_minutes}
        >
          {loading ? <CircularProgress size={24} /> : (rule ? 'Update Rule' : 'Create Rule')}
        </Button>
      </Box>
    </Box>
  );
};

export default TurnaroundRuleForm; 