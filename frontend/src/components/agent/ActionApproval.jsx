import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions 
} from '@mui/material';
import { Check, Close, Warning } from '@mui/icons-material';

/**
 * Component for displaying action approval requests
 */
const ActionApproval = ({ description, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleRejectClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setReason('');
  };

  const handleReject = () => {
    onReject(reason);
    handleClose();
  };

  return (
    <>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          my: 2, 
          borderLeft: '4px solid',
          borderColor: 'warning.main',
          backgroundColor: 'warning.light',
          opacity: 0.9
        }}
      >
        <Box display="flex" alignItems="flex-start" mb={1}>
          <Warning color="warning" sx={{ mr: 1 }} />
          <Typography variant="subtitle2">
            Action Approval Required
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {description}
        </Typography>
        
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            startIcon={<Close />}
            onClick={handleRejectClick}
          >
            Reject
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            size="small" 
            startIcon={<Check />}
            onClick={onApprove}
          >
            Approve
          </Button>
        </Box>
      </Paper>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Reject Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for rejecting this action (optional):
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Reason"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

ActionApproval.propTypes = {
  description: PropTypes.string.isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

export default ActionApproval; 