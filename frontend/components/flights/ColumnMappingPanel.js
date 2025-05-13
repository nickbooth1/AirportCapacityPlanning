import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Alert, 
  IconButton,
  Card,
  CardContent,
  CardActions,
  TextField,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useColumnMapping, MappingStatus } from '../../src/contexts/ColumnMappingContext';

/**
 * Column Mapping Panel Component
 * 
 * Allows users to map source columns to target fields
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onComplete - Callback when mapping is completed
 * @param {Function} props.onCancel - Callback when mapping is cancelled
 * @param {number} props.uploadId - Upload ID to map columns for
 * @returns {JSX.Element} Component JSX
 */
const ColumnMappingPanel = ({ onComplete, onCancel, uploadId }) => {
  const {
    status,
    sourceColumns,
    targetFields,
    mappingSelections,
    transformations,
    selectedProfile,
    availableProfiles,
    error,
    loading,
    
    detectColumnsFromUpload,
    loadTargetFields,
    loadMappingProfiles,
    updateMapping,
    updateTransformation,
    applyMapping,
    saveAsProfile,
    applyProfile,
    deleteProfile,
    
    setUploadId
  } = useColumnMapping();
  
  // Local state
  const [saveProfileDialogOpen, setSaveProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [isDefaultProfile, setIsDefaultProfile] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  
  // Initialize when component mounts
  useEffect(() => {
    const initializeComponent = async () => {
      // Set upload ID in context
      setUploadId(uploadId);
      
      // Load required data
      await Promise.all([
        loadTargetFields(),
        loadMappingProfiles()
      ]);
      
      // Detect columns from the upload
      await detectColumnsFromUpload(uploadId);
    };
    
    initializeComponent();
  }, [uploadId]);
  
  // Determine required fields
  const requiredFields = targetFields
    .filter(field => field.required)
    .map(field => field.field);
  
  // Check if all required fields are mapped
  const hasMissingRequiredFields = requiredFields.some(field => 
    !mappingSelections[field] || mappingSelections[field] === null
  );
  
  // Handle drag and drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Get the source column
    const sourceId = source.droppableId;
    const sourceColumn = sourceColumns[source.index];
    
    // Get the target field
    const destinationId = destination.droppableId;
    
    // Update the mapping
    updateMapping(destinationId, sourceColumn);
  };
  
  // Handle dropdown selection change
  const handleMappingChange = (targetField, sourceColumn) => {
    updateMapping(targetField, sourceColumn);
  };
  
  // Handle transformation change
  const handleTransformationChange = (targetField, transformation) => {
    updateTransformation(targetField, transformation);
  };
  
  // Apply mapping
  const handleApplyMapping = async () => {
    const result = await applyMapping();
    
    if (result && result.success) {
      onComplete && onComplete(result);
    }
  };
  
  // Save as profile
  const handleSaveAsProfile = async () => {
    if (!profileName) return;
    
    const result = await saveAsProfile(
      profileName, 
      profileDescription,
      isDefaultProfile
    );
    
    if (result && result.success) {
      // Close dialog
      setSaveProfileDialogOpen(false);
      
      // Reset form
      setProfileName('');
      setProfileDescription('');
      setIsDefaultProfile(false);
    }
  };
  
  // Apply profile
  const handleApplyProfile = async (profileId) => {
    await applyProfile(profileId);
  };
  
  // Open delete confirmation dialog
  const handleConfirmDelete = (profile) => {
    setProfileToDelete(profile);
    setConfirmDeleteDialogOpen(true);
  };
  
  // Delete profile
  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    
    await deleteProfile(profileToDelete.id);
    
    // Close dialog
    setConfirmDeleteDialogOpen(false);
    setProfileToDelete(null);
  };
  
  // Render transformation options for field
  const renderTransformationOptions = (field) => {
    return (
      <FormControl size="small" fullWidth sx={{ mt: 1 }}>
        <InputLabel id={`transform-${field.field}-label`}>Transform</InputLabel>
        <Select
          labelId={`transform-${field.field}-label`}
          id={`transform-${field.field}`}
          value={transformations[field.field] || ''}
          label="Transform"
          onChange={(e) => handleTransformationChange(field.field, e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="booleanToArrDep">Boolean to A/D</MenuItem>
          <MenuItem value="arrDepToBoolean">A/D to Boolean</MenuItem>
          <MenuItem value="isoDatetime">Format as ISO datetime</MenuItem>
          <MenuItem value="ddmmyyyyHHMM">Format as DD/MM/YYYY HH:MM</MenuItem>
          <MenuItem value="uppercase">Convert to uppercase</MenuItem>
          <MenuItem value="lowercase">Convert to lowercase</MenuItem>
          <MenuItem value="numberFormat">Format as number</MenuItem>
        </Select>
      </FormControl>
    );
  };
  
  // Render target field card
  const renderTargetField = (field) => {
    const isRequired = field.required;
    const isMapped = !!mappingSelections[field.field];
    
    return (
      <Droppable droppableId={field.field} key={field.field}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              mb: 2,
              border: theme => `1px solid ${
                snapshot.isDraggingOver ? theme.palette.primary.main : 
                (isRequired && !isMapped ? theme.palette.error.main : theme.palette.divider)
              }`,
              bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">
                  {field.field}
                  {isRequired && <span style={{ color: 'red' }}>*</span>}
                </Typography>
                {isMapped ? (
                  <Chip 
                    icon={<CheckCircleIcon />} 
                    label="Mapped" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                ) : isRequired ? (
                  <Chip 
                    icon={<ErrorIcon />} 
                    label="Required" 
                    size="small" 
                    color="error" 
                    variant="outlined"
                  />
                ) : null}
              </Box>
              
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {field.description}
              </Typography>
              
              <Typography variant="caption" color="textSecondary">
                Example: <code>{field.example}</code>
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id={`mapping-${field.field}-label`}>Mapped column</InputLabel>
                <Select
                  labelId={`mapping-${field.field}-label`}
                  id={`mapping-${field.field}`}
                  value={mappingSelections[field.field] || ''}
                  label="Mapped column"
                  onChange={(e) => handleMappingChange(field.field, e.target.value)}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {sourceColumns.map((column) => (
                    <MenuItem key={column} value={column}>{column}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Render transformation options */}
              {renderTransformationOptions(field)}
              
              {provided.placeholder}
            </CardContent>
          </Card>
        )}
      </Droppable>
    );
  };
  
  // Render source column item
  const renderSourceColumn = (column, index) => {
    // Check if this column is already mapped to a field
    const isMapped = Object.values(mappingSelections).includes(column);
    
    return (
      <Draggable
        key={column}
        draggableId={column}
        index={index}
        isDragDisabled={isMapped}
      >
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              mb: 1,
              opacity: isMapped ? 0.6 : 1,
              bgcolor: snapshot.isDragging ? 'primary.light' : 'background.paper',
              cursor: isMapped ? 'default' : 'grab',
              '&:hover': {
                bgcolor: isMapped ? 'background.paper' : 'action.hover'
              }
            }}
          >
            <CardContent sx={{ py: 1 }}>
              <Typography variant="body2">
                {column}
                {isMapped && (
                  <Chip 
                    label="Mapped" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Draggable>
    );
  };
  
  // Render saved profiles
  const renderSavedProfiles = () => {
    if (!availableProfiles || availableProfiles.length === 0) {
      return null;
    }
    
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Saved Profiles
        </Typography>
        
        <List dense>
          {availableProfiles.map((profile) => (
            <ListItem 
              key={profile.id}
              secondaryAction={
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => handleConfirmDelete(profile)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={profile.name}
                secondary={profile.description || 'No description'}
              />
              <Button
                size="small"
                onClick={() => handleApplyProfile(profile.id)}
                sx={{ mr: 1 }}
              >
                Apply
              </Button>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  };
  
  // Render main content based on status
  const renderContent = () => {
    if (loading && status === MappingStatus.DETECTING) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography>Detecting columns...</Typography>
        </Box>
      );
    }
    
    if (status === MappingStatus.FAILED) {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to detect columns'}
        </Alert>
      );
    }
    
    if (sourceColumns.length === 0) {
      return (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No columns detected in the uploaded file.
        </Alert>
      );
    }
    
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {/* Required fields section */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Required Fields
            </Typography>
            
            {targetFields
              .filter(field => field.required)
              .map(renderTargetField)}
            
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Optional Fields
            </Typography>
            
            {targetFields
              .filter(field => !field.required)
              .map(renderTargetField)}
          </Grid>
          
          {/* Source columns section */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Source Columns
            </Typography>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Drag columns to the target fields or use the dropdown selectors.
              </Typography>
              
              <Droppable droppableId="sourceColumns">
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ minHeight: 200 }}
                  >
                    {sourceColumns.map(renderSourceColumn)}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
            
            {/* Saved profiles section */}
            {renderSavedProfiles()}
          </Grid>
        </Grid>
      </DragDropContext>
    );
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Map Columns
        </Typography>
        
        <Typography variant="body1" paragraph>
          Match your CSV columns to the required fields. Drag columns from the right panel or use the dropdown selectors.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Main content */}
        {renderContent()}
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={onCancel} 
            sx={{ mr: 2 }}
            disabled={loading || status === MappingStatus.APPLYING}
          >
            Cancel
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={() => setSaveProfileDialogOpen(true)}
            sx={{ mr: 2 }}
            disabled={loading || hasMissingRequiredFields || status === MappingStatus.APPLYING}
          >
            Save as Profile
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleApplyMapping}
            disabled={loading || hasMissingRequiredFields || status === MappingStatus.APPLYING}
          >
            {loading && status === MappingStatus.APPLYING ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Applying...
              </>
            ) : 'Apply Mapping'}
          </Button>
        </Box>
      </Paper>
      
      {/* Save Profile Dialog */}
      <Dialog
        open={saveProfileDialogOpen}
        onClose={() => setSaveProfileDialogOpen(false)}
        aria-labelledby="save-profile-dialog-title"
      >
        <DialogTitle id="save-profile-dialog-title">
          Save Mapping Profile
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save your current column mapping as a profile for future use.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="profile-name"
            label="Profile Name"
            type="text"
            fullWidth
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            id="profile-description"
            label="Description (Optional)"
            type="text"
            fullWidth
            value={profileDescription}
            onChange={(e) => setProfileDescription(e.target.value)}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isDefaultProfile}
                onChange={(e) => setIsDefaultProfile(e.target.checked)}
                color="primary"
              />
            }
            label="Set as default profile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveProfileDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAsProfile} 
            color="primary"
            disabled={!profileName}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteDialogOpen}
        onClose={() => setConfirmDeleteDialogOpen(false)}
        aria-labelledby="delete-profile-dialog-title"
      >
        <DialogTitle id="delete-profile-dialog-title">
          Delete Profile
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the profile "{profileToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProfile} 
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

ColumnMappingPanel.propTypes = {
  onComplete: PropTypes.func,
  onCancel: PropTypes.func,
  uploadId: PropTypes.number.isRequired
};

export default ColumnMappingPanel; 