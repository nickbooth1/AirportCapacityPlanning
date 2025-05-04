import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Grid,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { getOperationalSettings, updateOperationalSettings } from '../../lib/configApi';

const OperationalSettingsForm = () => {
  const [settings, setSettings] = useState({
    default_gap_minutes: 15,
    operating_start_time: '06:00:00',
    operating_end_time: '23:59:59'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getOperationalSettings();
        setSettings({
          default_gap_minutes: data.default_gap_minutes,
          operating_start_time: data.operating_start_time ? data.operating_start_time.substring(0, 8) : '06:00:00',
          operating_end_time: data.operating_end_time ? data.operating_end_time.substring(0, 8) : '23:59:59'
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError('Failed to load operational settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'default_gap_minutes') {
      // Ensure it's a positive integer
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        setSettings(prev => ({ ...prev, [name]: parsedValue }));
      }
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await updateOperationalSettings({
        default_gap_minutes: parseInt(settings.default_gap_minutes, 10),
        operating_start_time: settings.operating_start_time,
        operating_end_time: settings.operating_end_time
      });
      
      setSuccess(true);
      setError(null);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save operational settings. Please try again.');
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Operational Settings
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure the airport's operational parameters used for capacity calculations.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Default Gap Time (minutes)"
                name="default_gap_minutes"
                type="number"
                value={settings.default_gap_minutes}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Minimum buffer time between aircraft occupying the same stand"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Operating Start Time"
                name="operating_start_time"
                type="time"
                value={settings.operating_start_time.substring(0, 5)}
                onChange={(e) => handleChange({
                  target: { 
                    name: 'operating_start_time', 
                    value: `${e.target.value}:00` 
                  }
                })}
                fullWidth
                required
                inputProps={{ step: 300 }}
                helperText="Start of daily operations"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Operating End Time"
                name="operating_end_time"
                type="time"
                value={settings.operating_end_time.substring(0, 5)}
                onChange={(e) => handleChange({
                  target: { 
                    name: 'operating_end_time', 
                    value: `${e.target.value}:00` 
                  }
                })}
                fullWidth
                required
                inputProps={{ step: 300 }}
                helperText="End of daily operations"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box mt={2} display="flex" justifyContent="flex-end">
                <Button 
                  variant="contained" 
                  color="primary" 
                  type="submit"
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
        
        <Snackbar open={!!error || success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={error ? 'error' : 'success'} 
            variant="filled"
          >
            {error || 'Settings saved successfully!'}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default OperationalSettingsForm; 