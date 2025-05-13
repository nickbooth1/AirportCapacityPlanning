import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  LinearProgress, 
  Alert, 
  AlertTitle,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { styled } from '@mui/material/styles';
import { useFlightUpload, UploadStatus } from '../../src/contexts/FlightUploadContext';
import ChunkedUploader from './ChunkedUploader';
import AccessibilitySupport from './AccessibilitySupport';

// Styled components
const UploadBox = styled(Paper)(({ theme, isdragging }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  border: `2px dashed ${isdragging ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: isdragging ? theme.palette.action.hover : theme.palette.background.paper,
  transition: 'all 0.3s ease',
  height: '200px',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden'
}));

const HiddenInput = styled('input')({
  display: 'none'
});

const FileInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  background: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  width: '100%',
  position: 'relative'
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(3)
}));

const UploadProgress = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  width: '100%',
  minHeight: '200px',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px',
  boxShadow: theme.shadows[1]
}));

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Size threshold for chunked uploads (10MB)
const CHUNKED_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

// Chunk size (1MB)
const CHUNK_SIZE = 1024 * 1024;

/**
 * UploadTool Component
 * 
 * A reusable component for file uploads with drag-and-drop support,
 * progress tracking, and validation.
 */
const UploadTool = ({
  title = 'Upload Files',
  description = 'Click or drag files to upload',
  acceptedFileTypes = ['.csv'],
  maxFileSize = 50, // MB
  onUploadSuccess,
  onUploadError,
  showProgressDetails = false
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [chunkedUploader, setChunkedUploader] = useState(null);
  const [uploadName, setUploadName] = useState('');
  
  const {
    status,
    selectedFile,
    uploadProgress,
    error,
    uploadId,
    selectFile,
    uploadFile,
    resetUpload
  } = useFlightUpload();
  
  // Handle file selection via click
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };
  
  // Handle drag events
  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(dragCounter + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(dragCounter - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  
  // Validate file type and size
  const validateAndSelectFile = (file) => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      onUploadError?.(`Invalid file type. Accepted types: ${acceptedFileTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      onUploadError?.(`File size exceeds the ${maxFileSize}MB limit`);
      return;
    }
    
    // File is valid, select it
    selectFile(file);
  };
  
  // Handle upload button click
  const handleUploadClick = async () => {
    if (!selectedFile) return;
    
    // Determine if we should use chunked upload
    const shouldUseChunkedUpload = selectedFile.size > CHUNKED_UPLOAD_THRESHOLD;
    
    if (shouldUseChunkedUpload) {
      // Initialize and start chunked upload
      const uploader = new ChunkedUploader({
        file: selectedFile,
        endpoint: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/flights/upload`,
        chunkSize: CHUNK_SIZE,
        maxRetries: 3,
        uploadName: uploadName || selectedFile.name,
        onProgress: (progress) => {
          // Update progress in context
          // Since we're not using the context's uploadFile method directly,
          // we need to update the status manually
          if (status !== UploadStatus.UPLOADING) {
            // updateStatus(UploadStatus.UPLOADING);
          }
          // updateProgress(progress);
        },
        onChunkSuccess: (chunkIndex, totalChunks) => {
          console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks}`);
        },
        onComplete: (data) => {
          console.log('Upload complete', data);
          onUploadSuccess?.(data);
        },
        onError: (error) => {
          console.error('Upload error', error);
          onUploadError?.(error.message);
        }
      });
      
      setChunkedUploader(uploader);
      uploader.start();
    } else {
      // Use standard upload with the custom name
      try {
        const response = await uploadFile(uploadName || undefined);
        
        if (response && response.success) {
          console.log('Upload completed with response:', response);
          // Use the id from the direct response instead of relying on context state
          const uploadedId = response.id || uploadId;
          
          if (uploadedId) {
            onUploadSuccess?.({ 
              id: uploadedId, 
              filename: selectedFile.name, 
              displayName: uploadName || selectedFile.name 
            });
          } else {
            console.error('Upload ID not available in response');
            onUploadError?.('Upload ID not available');
          }
        }
      } catch (error) {
        console.error('Upload error:', error);
        onUploadError?.(error.message || 'Upload failed');
      }
    }
  };
  
  // Handle cancel button click
  const handleCancelClick = () => {
    if (chunkedUploader) {
      chunkedUploader.abort();
      setChunkedUploader(null);
    }
    resetUpload();
  };
  
  // Set up event listeners for drag and drop
  useEffect(() => {
    const div = document.getElementById('upload-box');
    if (div) {
      div.addEventListener('dragenter', handleDragIn);
      div.addEventListener('dragleave', handleDragOut);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('drop', handleDrop);
      
      return () => {
        div.removeEventListener('dragenter', handleDragIn);
        div.removeEventListener('dragleave', handleDragOut);
        div.removeEventListener('dragover', handleDragOver);
        div.removeEventListener('drop', handleDrop);
      };
    }
  }, [dragCounter]);
  
  // Clean up chunked uploader on unmount
  useEffect(() => {
    return () => {
      if (chunkedUploader) {
        chunkedUploader.abort();
      }
    };
  }, [chunkedUploader]);
  
  const isUploading = status === UploadStatus.UPLOADING;
  const isProcessing = status === UploadStatus.PROCESSING;
  const isCompleted = status === UploadStatus.COMPLETED;
  const isFailed = status === UploadStatus.FAILED;
  const isIdle = status === UploadStatus.IDLE;
  const isSelecting = status === UploadStatus.SELECTING;
  
  // Determine button state
  const uploadButtonDisabled = 
    !selectedFile || 
    isUploading || 
    isProcessing || 
    isCompleted;
  
  // Open file dialog
  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Accessibility event handlers
  const handleSpaceKey = () => {
    handleOpenFileDialog();
  };
  
  const handleEnterKey = () => {
    if (isSelecting) {
      handleUploadClick();
    } else if (isIdle) {
      handleOpenFileDialog();
    }
  };
  
  const handleEscapeKey = () => {
    handleCancelClick();
  };

  // Handle upload error
  const handleError = (error) => {
    console.error('Upload error:', error);
    setIsUploading(false);
    setProgress(0);
    setUploadStatus('error');
    
    // Get a more detailed error message if available
    let errorMessage = error.message || 'An unknown error occurred during upload';
    
    // Check if there's a more specific error message
    if (error.message && error.message.includes(':')) {
      // Extract the more specific part after the colon
      errorMessage = error.message.split(':').pop().trim();
    }
    
    setErrorMessage(errorMessage);
    
    if (onUploadError) {
      onUploadError(error);
    }
  };

  return (
    <Box sx={{ width: '100%' }} id="upload-tool-container">
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      
      {/* Add accessibility support */}
      <AccessibilitySupport
        componentId="upload-tool-container"
        status={status.toLowerCase()}
        errorMessage={error}
        progress={uploadProgress}
        onSpaceKey={handleSpaceKey}
        onEnterKey={handleEnterKey}
        onEscapeKey={handleEscapeKey}
      />
      
      {/* Drag and drop area */}
      <UploadBox 
        id="upload-box" 
        isdragging={isDragging ? 1 : 0}
        onClick={handleOpenFileDialog}
        sx={{ 
          display: isUploading || isProcessing || isCompleted || isFailed ? 'none' : 'flex'
        }}
        tabIndex="0"
        role="button"
        aria-label={`${title}. ${description}`}
        aria-haspopup="dialog"
      >
        <CloudUploadIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
          {`Accepted file types: ${acceptedFileTypes.join(', ')}`}
        </Typography>
        <HiddenInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={acceptedFileTypes.join(',')}
          data-testid="file-input"
          aria-label="Upload file input"
        />
      </UploadBox>
      
      {/* File info and upload button */}
      {selectedFile && isSelecting && (
        <Box sx={{ mt: 2 }}>
          <FileInfo>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatFileSize(selectedFile.size)}
                {selectedFile.size > CHUNKED_UPLOAD_THRESHOLD && (
                  <span> (Will use chunked upload)</span>
                )}
              </Typography>
            </Box>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
              aria-label="Remove selected file"
            >
              <CloseIcon />
            </IconButton>
          </FileInfo>
          
          {/* Add custom upload name field */}
          <TextField
            fullWidth
            label="Upload Name (Optional)"
            placeholder="Enter a custom name for this upload"
            variant="outlined"
            margin="normal"
            value={uploadName || ''}
            onChange={(e) => setUploadName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="caption" color="textSecondary">Name:</Typography>
                </InputAdornment>
              )
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUploadClick}
              disabled={uploadButtonDisabled}
              startIcon={<CloudUploadIcon />}
              aria-label="Start upload"
            >
              Upload
            </Button>
          </Box>
        </Box>
      )}
      
      {/* Upload progress */}
      {isUploading && (
        <UploadProgress>
          <Box mb={2} width="100%">
            <Typography variant="body1" align="center" gutterBottom>
              Uploading {selectedFile?.name}...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="body2" color="textSecondary">
                {uploadProgress}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {Math.round((selectedFile?.size * uploadProgress) / 100 / 1024 / 1024).toFixed(1)} MB of {Math.round(selectedFile?.size / 1024 / 1024).toFixed(1)} MB
              </Typography>
            </Box>
          </Box>
          <Box mt={1} display="flex" justifyContent="space-between" width="100%">
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleCancelClick}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
          </Box>
        </UploadProgress>
      )}
      
      {/* Upload success */}
      {isCompleted && (
        <Alert 
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={resetUpload}
              aria-label="Upload another file"
            >
              Upload Another
            </Button>
          }
        >
          <AlertTitle>Upload Success</AlertTitle>
          File {selectedFile?.name} has been uploaded and processed successfully.
        </Alert>
      )}
      
      {/* Upload error */}
      {isFailed && (
        <Alert 
          severity="error"
          icon={<ErrorIcon fontSize="inherit" />}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={resetUpload}
              aria-label="Try uploading again"
            >
              Try Again
            </Button>
          }
        >
          <AlertTitle>Upload Failed</AlertTitle>
          {error || 'An unknown error occurred during the upload process.'}
        </Alert>
      )}
    </Box>
  );
};

UploadTool.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  acceptedFileTypes: PropTypes.arrayOf(PropTypes.string),
  maxFileSize: PropTypes.number,
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
  showProgressDetails: PropTypes.bool
};

export default UploadTool;