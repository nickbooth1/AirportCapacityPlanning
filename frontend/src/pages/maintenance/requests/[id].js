import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import {
  Box, Typography, Paper, CircularProgress, Alert
} from '@mui/material';
// Placeholder: Import detail component when created
// import MaintenanceRequestDetail from '../../components/maintenance/MaintenanceRequestDetail';

const MaintenanceRequestDetailPage = () => {
  const router = useRouter();
  const { id } = router.query; // Get the ID from the URL

  // Placeholder content - Replace with actual data fetching and detail component
  const loading = false; // Replace with actual loading state
  const error = null; // Replace with actual error state
  const request = null; // Replace with actual request data

  return (
    <Layout title={`Maintenance Request ${id || '...'}`}>
      <Typography variant="h4" sx={{ mb: 2 }}>Maintenance Request Details</Typography>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && id && (
        <Paper sx={{ p: 3 }}>
           <Typography>Details for Request ID: {id}</Typography>
           {/* Placeholder: Render MaintenanceRequestDetail component here */}
           {/* <MaintenanceRequestDetail requestId={id} /> */}
           <Typography sx={{ mt: 2 }}>(Detail component not yet implemented)</Typography>
        </Paper>
      )}
      {!id && !loading && <Typography>Loading request ID...</Typography>}
    </Layout>
  );
};

export default MaintenanceRequestDetailPage; 