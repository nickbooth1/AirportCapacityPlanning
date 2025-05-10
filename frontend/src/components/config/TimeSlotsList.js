import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getTimeSlots, deleteTimeSlot } from '../../lib/configApi';
import TimeSlotForm from './TimeSlotForm';

const TimeSlotsList = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await getTimeSlots();
      setSlots(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch time slots:', err);
      setError('Failed to load time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSlots();
  }, []);
  
  const handleAddClick = () => {
    setOpenAddDialog(true);
  };
  
  const handleEditClick = (slot) => {
    setSelectedSlot(slot);
    setOpenEditDialog(true);
  };
  
  const handleDeleteClick = (slot) => {
    setSelectedSlot(slot);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedSlot(null);
  };
  
  const handleSaveSuccess = (message) => {
    fetchSlots();
    handleCloseDialog();
    setSuccessMessage(message);
    setSuccess(true);
  };
  
  const handleDelete = async () => {
    try {
      await deleteTimeSlot(selectedSlot.id);
      fetchSlots();
      handleCloseDialog();
      setSuccessMessage('Time slot deleted successfully');
      setSuccess(true);
    } catch (err) {
      console.error('Failed to delete time slot:', err);
      setError('Failed to delete time slot. Please try again.');
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };
  
  // Format time to display in 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const parsedHours = parseInt(hours, 10);
    const ampm = parsedHours >= 12 ? 'PM' : 'AM';
    const displayHours = parsedHours % 12 || 12;
    
    return `${displayHours}:${minutes} ${ampm}`;
  };
  
  if (loading && slots.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            Time Slots
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Time Slot
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Define time slots for operational planning. These slots can be referenced by other parts of the system.
        </Typography>
        
        {slots.length === 0 && !loading ? (
          <Typography variant="body1" color="textSecondary" align="center" my={4}>
            No time slots found. Click "Add Time Slot" to create one.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>{slot.name}</TableCell>
                    <TableCell>{formatTime(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.end_time)}</TableCell>
                    <TableCell>{slot.description || '-'}</TableCell>
                    <TableCell>
                      {slot.is_active ? (
                        <Typography color="success.main">Active</Typography>
                      ) : (
                        <Typography color="text.secondary">Inactive</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Time Slot">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditClick(slot)}
                          aria-label="edit"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Time Slot">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteClick(slot)}
                          aria-label="delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {/* Add Time Slot Dialog */}
        <Dialog open={openAddDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Add Time Slot</DialogTitle>
          <DialogContent>
            <TimeSlotForm 
              onSaveSuccess={() => handleSaveSuccess('Time slot added successfully')} 
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
        
        {/* Edit Time Slot Dialog */}
        <Dialog open={openEditDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Time Slot</DialogTitle>
          <DialogContent>
            {selectedSlot && (
              <TimeSlotForm 
                slot={selectedSlot} 
                onSaveSuccess={() => handleSaveSuccess('Time slot updated successfully')} 
                onCancel={handleCloseDialog}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the time slot "{selectedSlot?.name}"?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        
        <Snackbar open={!!error || success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={error ? 'error' : 'success'} 
            variant="filled"
          >
            {error || successMessage}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default TimeSlotsList; 