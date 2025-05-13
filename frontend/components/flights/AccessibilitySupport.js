import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import { visuallyHidden } from '@mui/utils';

/**
 * AccessibilitySupport component
 * 
 * Enhances accessibility for the Flight Upload Tool by providing:
 * 1. Keyboard navigation support
 * 2. Screen reader friendly messages
 * 3. ARIA attributes management
 * 
 * @param {Object} props - Component properties
 * @param {string} props.componentId - ID of the component being enhanced
 * @param {string} props.status - Current status of the upload process
 * @param {string} props.errorMessage - Error message (if any)
 * @param {number} props.progress - Upload progress (0-100)
 * @param {Function} props.onSpaceKey - Handler for Space key press
 * @param {Function} props.onEnterKey - Handler for Enter key press
 * @param {Function} props.onEscapeKey - Handler for Escape key press
 */
const AccessibilitySupport = ({
  componentId,
  status,
  errorMessage = '',
  progress = 0,
  onSpaceKey,
  onEnterKey,
  onEscapeKey
}) => {
  // Status message for screen readers
  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Upload tool ready. Press Space or Enter to select a file, or drag and drop a file onto this area.';
      case 'selecting':
        return 'File selected. Press Enter to start upload or Escape to cancel.';
      case 'uploading':
        return `Upload in progress. ${progress}% complete. Press Escape to cancel.`;
      case 'processing':
        return 'File upload complete. Processing in progress.';
      case 'completed':
        return 'Upload and processing completed successfully.';
      case 'failed':
        return `Upload failed. ${errorMessage || 'An unknown error occurred.'}`;
      default:
        return 'Upload tool ready.';
    }
  };

  // Set up keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle events when the target element is our component or its children
      const target = event.target;
      const uploadComponent = document.getElementById(componentId);
      
      if (!uploadComponent || !uploadComponent.contains(target)) {
        return;
      }
      
      switch (event.key) {
        case ' ':
          if (onSpaceKey && status === 'idle') {
            event.preventDefault();
            onSpaceKey();
          }
          break;
        case 'Enter':
          if (onEnterKey) {
            event.preventDefault();
            onEnterKey();
          }
          break;
        case 'Escape':
          if (onEscapeKey && ['selecting', 'uploading'].includes(status)) {
            event.preventDefault();
            onEscapeKey();
          }
          break;
        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [componentId, status, onSpaceKey, onEnterKey, onEscapeKey]);

  // Add ARIA announcements for important state changes
  useEffect(() => {
    // Get or create live region
    let liveRegion = document.getElementById('upload-tool-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'upload-tool-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      Object.assign(liveRegion.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0'
      });
      document.body.appendChild(liveRegion);
    }
    
    // Announce status changes
    liveRegion.textContent = getStatusMessage();
    
    // Clean up on unmount
    return () => {
      if (document.getElementById('upload-tool-live-region')) {
        document.body.removeChild(liveRegion);
      }
    };
  }, [status, progress, errorMessage]);

  return (
    <Box sx={visuallyHidden}>
      <div id={`${componentId}-status`} aria-live="polite">
        {getStatusMessage()}
      </div>
    </Box>
  );
};

AccessibilitySupport.propTypes = {
  componentId: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  errorMessage: PropTypes.string,
  progress: PropTypes.number,
  onSpaceKey: PropTypes.func,
  onEnterKey: PropTypes.func,
  onEscapeKey: PropTypes.func
};

export default AccessibilitySupport; 