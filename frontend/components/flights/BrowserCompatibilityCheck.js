import React, { useEffect, useState } from 'react';
import { Alert, Box, Link, Typography } from '@mui/material';

/**
 * Browser requirements for full functionality
 */
const BROWSER_REQUIREMENTS = {
  fileAPI: 'File API',
  dragAndDrop: 'Drag and Drop API',
  streams: 'Streams API',
  chunkedUploads: 'Chunked Uploads',
  formData: 'FormData API'
};

/**
 * Component to check browser compatibility with Flight Upload Tool features
 * @returns {JSX.Element} Browser compatibility information
 */
const BrowserCompatibilityCheck = () => {
  const [compatibility, setCompatibility] = useState({
    isCompatible: true,
    missingFeatures: [],
    browser: null,
    warnings: []
  });

  useEffect(() => {
    // Detect browser type and version
    const userAgent = navigator.userAgent;
    let browser;
    
    if (userAgent.indexOf('Chrome') > -1) {
      browser = `Chrome ${userAgent.match(/Chrome\/(\d+)/)[1]}`;
    } else if (userAgent.indexOf('Firefox') > -1) {
      browser = `Firefox ${userAgent.match(/Firefox\/(\d+)/)[1]}`;
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = `Safari ${userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown'}`;
    } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
      browser = `Edge ${userAgent.match(/Edg(e)?\/(\d+)/)[2]}`;
    } else {
      browser = `Unknown Browser`;
    }
    
    // Check required features
    const missingFeatures = [];
    
    // File API check
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      missingFeatures.push(BROWSER_REQUIREMENTS.fileAPI);
    }
    
    // Drag and Drop API check
    if (!('draggable' in document.createElement('div'))) {
      missingFeatures.push(BROWSER_REQUIREMENTS.dragAndDrop);
    }
    
    // Streams API check (for chunked uploads)
    if (!window.ReadableStream) {
      missingFeatures.push(BROWSER_REQUIREMENTS.streams);
    }
    
    // FormData API
    if (!window.FormData) {
      missingFeatures.push(BROWSER_REQUIREMENTS.formData);
    }
    
    // Warnings for specific browsers
    const warnings = [];
    
    // Safari file size limitations
    if (browser.includes('Safari') && !browser.includes('Chrome')) {
      warnings.push('Safari may have limitations with files larger than 50MB');
    }
    
    // Internet Explorer is not supported
    if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
      warnings.push('Internet Explorer is not supported. Please use a modern browser');
    }
    
    // Update state
    setCompatibility({
      isCompatible: missingFeatures.length === 0,
      missingFeatures,
      browser,
      warnings
    });
  }, []);

  if (compatibility.isCompatible && compatibility.warnings.length === 0) {
    return null; // No issues detected
  }

  return (
    <Box sx={{ mb: 3 }}>
      {!compatibility.isCompatible && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" component="div" gutterBottom>
            Your browser ({compatibility.browser}) is missing required features:
          </Typography>
          <ul style={{ marginTop: 0 }}>
            {compatibility.missingFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <Typography variant="body2">
            Please use a modern browser like Chrome, Firefox, Edge, or Safari.
          </Typography>
        </Alert>
      )}
      
      {compatibility.warnings.length > 0 && (
        <Alert severity="warning">
          <Typography variant="subtitle1" component="div" gutterBottom>
            Browser Compatibility Warning ({compatibility.browser})
          </Typography>
          <ul style={{ marginTop: 0 }}>
            {compatibility.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
          <Typography variant="body2">
            For the best experience, we recommend using Chrome, Firefox, or Edge.
            <Link 
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent" 
              target="_blank" 
              sx={{ ml: 1 }}
            >
              Learn more
            </Link>
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default BrowserCompatibilityCheck; 