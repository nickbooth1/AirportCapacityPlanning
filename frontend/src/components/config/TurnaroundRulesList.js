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
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getAllTurnaroundRules, deleteTurnaroundRule } from '../../lib/configApi';
import TurnaroundRuleForm from './TurnaroundRuleForm';

const TurnaroundRulesList = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  
  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await getAllTurnaroundRules();
      setRules(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch turnaround rules:', err);
      setError('Failed to load turnaround rules. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRules();
  }, []);
  
  const handleAddClick = () => {
    setOpenAddDialog(true);
  };
  
  const handleEditClick = (rule) => {
    setSelectedRule(rule);
    setOpenEditDialog(true);
  };
  
  const handleDeleteClick = (rule) => {
    setSelectedRule(rule);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedRule(null);
  };
  
  const handleSaveSuccess = (message) => {
    fetchRules();
    handleCloseDialog();
    setSuccessMessage(message);
    setSuccess(true);
  };
  
  const handleDelete = async () => {
    try {
      await deleteTurnaroundRule(selectedRule.aircraft_type_id);
      fetchRules();
      handleCloseDialog();
      setSuccessMessage('Turnaround rule deleted successfully');
      setSuccess(true);
    } catch (err) {
      console.error('Failed to delete rule:', err);
      setError('Failed to delete turnaround rule. Please try again.');
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };
  
  if (loading && rules.length === 0) {
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
            Turnaround Rules
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Rule
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure minimum turnaround times for different aircraft types.
        </Typography>
        
        {rules.length === 0 && !loading ? (
          <Typography variant="body1" color="textSecondary" align="center" my={4}>
            No turnaround rules found. Click "Add Rule" to create one.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Aircraft Type</TableCell>
                  <TableCell>ICAO Code</TableCell>
                  <TableCell>IATA Code</TableCell>
                  <TableCell>Min. Turnaround Time (minutes)</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.aircraftType?.name || 'Unknown'}</TableCell>
                    <TableCell>{rule.aircraftType?.icao_code || 'N/A'}</TableCell>
                    <TableCell>{rule.aircraftType?.iata_code || 'N/A'}</TableCell>
                    <TableCell>{rule.min_turnaround_minutes}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Rule">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditClick(rule)}
                          aria-label="edit"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Rule">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteClick(rule)}
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
        
        {/* Add Rule Dialog */}
        <Dialog open={openAddDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Add Turnaround Rule</DialogTitle>
          <DialogContent>
            <TurnaroundRuleForm 
              onSaveSuccess={() => handleSaveSuccess('Turnaround rule added successfully')} 
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
        
        {/* Edit Rule Dialog */}
        <Dialog open={openEditDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Turnaround Rule</DialogTitle>
          <DialogContent>
            {selectedRule && (
              <TurnaroundRuleForm 
                rule={selectedRule} 
                onSaveSuccess={() => handleSaveSuccess('Turnaround rule updated successfully')} 
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
              Are you sure you want to delete the turnaround rule for{' '}
              {selectedRule?.aircraftType?.name || 'this aircraft type'}?
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

export default TurnaroundRulesList; 