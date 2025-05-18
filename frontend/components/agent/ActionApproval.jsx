import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Button, 
  TextField, Dialog, DialogTitle, DialogContent, 
  DialogActions, CardActions, Collapse, IconButton 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import styled from '@emotion/styled';

const ExpandMore = styled(IconButton)(({ theme, expanded }) => ({
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const ActionApproval = ({ proposal, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  const handleApproveClick = () => {
    onApprove();
  };
  
  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };
  
  const handleRejectConfirm = () => {
    onReject(rejectReason);
    setRejectDialogOpen(false);
    setRejectReason('');
  };
  
  // Map action types to more user-friendly descriptions
  const getActionTypeDescription = (actionType) => {
    const actionMap = {
      'maintenance_create': 'Create Maintenance Request',
      'maintenance_update': 'Update Maintenance Request',
      'capacity_parameter_update': 'Update Capacity Parameters',
      'stand_status_update': 'Update Stand Status',
      'scenario_create': 'Create Scenario',
      'scenario_modify': 'Modify Scenario'
    };
    
    return actionMap[actionType] || 'Perform Action';
  };
  
  // Check if this is a potentially risky action
  const isRiskyAction = () => {
    const riskyActions = [
      'maintenance_update',
      'capacity_parameter_update',
      'stand_status_update'
    ];
    
    return riskyActions.includes(proposal.actionType);
  };
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        backgroundColor: isRiskyAction() ? '#fff8e1' : '#e8f5e9',
        borderLeft: `4px solid ${isRiskyAction() ? '#ffa000' : '#4caf50'}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {isRiskyAction() && (
            <WarningIcon color="warning" sx={{ mr: 1 }} />
          )}
          <Typography variant="h6" component="div">
            {getActionTypeDescription(proposal.actionType)}
          </Typography>
          <ExpandMore
            expanded={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        </Box>
        
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {proposal.description}
        </Typography>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Details:
            </Typography>
            {proposal.parameters && (
              <Typography variant="body2" component="pre" sx={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: 1.5,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {JSON.stringify(proposal.parameters, null, 2)}
              </Typography>
            )}
            
            {isRiskyAction() && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                This action may modify important system data. Please review carefully before approving.
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
      
      <CardActions>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleApproveClick}
        >
          Approve
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={handleRejectClick}
        >
          Reject
        </Button>
      </CardActions>
      
      <Dialog 
        open={rejectDialogOpen} 
        onClose={() => setRejectDialogOpen(false)}
      >
        <DialogTitle>Reject Action</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this action (optional):
          </Typography>
          <TextField
            autoFocus
            label="Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRejectConfirm} color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ActionApproval;