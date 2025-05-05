import React from 'react';
import { Box, Container, Typography, Paper, Stepper, Step, StepLabel } from '@mui/material';
import Layout from '../../components/Layout';
import UploadTool from '../../components/flights/UploadTool';
import UploadQA from '../../components/flights/UploadQA';
import BrowserCompatibilityCheck from '../../components/flights/BrowserCompatibilityCheck';
import { FlightUploadProvider, useFlightUpload, UploadStatus } from '../../src/contexts/FlightUploadContext';

/**
 * Upload workflow component
 * 
 * This manages the flow between upload and QA phases
 */
const UploadWorkflow = () => {
  const { status } = useFlightUpload();
  
  // Define workflow steps
  const steps = ['Select File', 'Process Data', 'Review & Validate', 'Complete'];
  
  // Map status to active step
  const getActiveStep = () => {
    switch (status) {
      case UploadStatus.IDLE:
      case UploadStatus.SELECTING:
        return 0;
      case UploadStatus.UPLOADING:
      case UploadStatus.PROCESSING:
        return 1;
      case UploadStatus.VALIDATING:
      case UploadStatus.REVIEWING:
        return 2;
      case UploadStatus.COMPLETED:
        return 3;
      default:
        return 0;
    }
  };
  
  const handleUploadSuccess = (data) => {
    console.log('Upload success:', data);
  };
  
  const handleUploadError = (error) => {
    console.error('Upload error:', error);
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
      
      {/* Render components based on current step */}
      {activeStep <= 1 && (
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
      
      {activeStep >= 2 && (
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