import React, { useState } from 'react';
import { Box, Container, Typography, Paper, Stepper, Step, StepLabel, FormControlLabel, Switch, Alert } from '@mui/material';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import UploadTool from '../../components/flights/UploadTool';
import UploadQA from '../../components/flights/UploadQA';
import BrowserCompatibilityCheck from '../../components/flights/BrowserCompatibilityCheck';
import ColumnMappingPanel from '../../components/flights/ColumnMappingPanel';
import { FlightUploadProvider, useFlightUpload, UploadStatus } from '../../src/contexts/FlightUploadContext';
import { ColumnMappingProvider, MappingStatus } from '../../src/contexts/ColumnMappingContext';
import flightDataApi from '../../api/flightDataApi';

/**
 * Upload workflow component
 * 
 * This manages the flow between upload and QA phases
 */
const UploadWorkflow = () => {
  const { status, uploadId } = useFlightUpload();
  const router = useRouter();
  const [runStandAllocation, setRunStandAllocation] = useState(false);
  const [processingSchedule, setProcessingSchedule] = useState(false);
  const [processError, setProcessError] = useState(null);
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  
  // Define workflow steps
  const steps = ['Select File', 'Map Columns', 'Process Data', 'Review & Validate', 'Complete'];
  
  // Map status to active step
  const getActiveStep = () => {
    if (showMappingPanel) {
      return 1;
    }
    
    switch (status) {
      case UploadStatus.IDLE:
      case UploadStatus.SELECTING:
        return 0;
      case UploadStatus.UPLOADING:
      case UploadStatus.PROCESSING:
        return 2;
      case UploadStatus.VALIDATING:
      case UploadStatus.REVIEWING:
        return 3;
      case UploadStatus.COMPLETED:
        return 4;
      default:
        return 0;
    }
  };
  
  const handleUploadSuccess = async (data) => {
    console.log('Upload success:', data);
    
    // Show mapping panel first
    setShowMappingPanel(true);
  };
  
  const handleMappingComplete = async (result) => {
    console.log('Mapping completed:', result);
    setShowMappingPanel(false);
    
    // If stand allocation is enabled, process the schedule
    if (runStandAllocation) {
      try {
        setProcessingSchedule(true);
        setProcessError(null);
        
        // Validate the upload ID
        if (!uploadId) {
          throw new Error('Missing upload ID in context');
        }
        
        console.log('Processing flight schedule with upload ID:', uploadId);
        
        // Call the API to process the flight schedule
        const response = await flightDataApi.processFlightSchedule(uploadId, {
          skipValidation: false,
          skipAllocation: false
        });
        
        console.log('Schedule processing result:', response);
        
        // Validate the response
        if (!response || !response.data || !response.data.scheduleId) {
          throw new Error('Invalid response from flight schedule processing');
        }
        
        // Redirect to the allocation results page
        router.push(`/flights/allocation-results/${response.data.scheduleId}`);
      } catch (error) {
        console.error('Error processing flight schedule:', error);
        setProcessError(error.message || 'An error occurred while processing the flight schedule');
      } finally {
        setProcessingSchedule(false);
      }
    }
  };
  
  const handleMappingCancel = () => {
    setShowMappingPanel(false);
  };
  
  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    setProcessError(error.message || 'An error occurred during upload');
  };
  
  const activeStep = getActiveStep();
  
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Stand Allocation Option */}
      {(activeStep <= 1 || showMappingPanel) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={runStandAllocation}
                onChange={(e) => setRunStandAllocation(e.target.checked)}
                color="primary"
              />
            }
            label="Run stand allocation after upload"
          />
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', ml: 4 }}>
            This will automatically validate the flight data and allocate stands to flights
          </Typography>
        </Paper>
      )}
      
      {/* Processing status */}
      {processingSchedule && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Processing flight schedule. This may take a few moments...
        </Alert>
      )}
      
      {/* Processing error */}
      {processError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {processError}
        </Alert>
      )}
      
      {/* Render components based on current step */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <UploadTool 
            title="Upload Flight Schedule"
            description="Click or drag a CSV file containing flight data"
            acceptedFileTypes={['.csv']}
            maxFileSize={50}
            showProgressDetails={true}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </Paper>
      )}
      
      {/* Column Mapping Step */}
      {showMappingPanel && (
        <ColumnMappingProvider>
          <ColumnMappingPanel 
            uploadId={uploadId} 
            onComplete={handleMappingComplete}
            onCancel={handleMappingCancel}
          />
        </ColumnMappingProvider>
      )}
      
      {activeStep >= 3 && (
        <UploadQA />
      )}
    </Box>
  );
};

/**
 * Flight Upload Page
 * 
 * A page for uploading and reviewing flight data files.
 */
const FlightUploadPage = () => {
  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Flight Data Upload
          </Typography>
          
          <Typography variant="body1" paragraph>
            Upload flight schedule data in CSV format for validation and import. 
            The system supports files up to 50MB in size, with larger files using chunked uploads for reliability.
          </Typography>
          
          <BrowserCompatibilityCheck />
          
          <FlightUploadProvider>
            <UploadWorkflow />
          </FlightUploadProvider>
        </Box>
      </Container>
    </Layout>
  );
};

export default FlightUploadPage; 