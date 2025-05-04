import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import {
  Box, Typography, Paper, CircularProgress
} from '@mui/material';
import MaintenanceRequestDetail from '../../../components/maintenance/MaintenanceRequestDetail';

const MaintenanceRequestDetailPage = () => {
  const router = useRouter();
  const { id } = router.query; // Get the ID from the URL

  return (
    <Layout title={`Maintenance Request ${id || '...'}`}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {id === 'new' ? 'New Maintenance Request' : 'Maintenance Request Details'}
      </Typography>
      
      {!id && <CircularProgress />}
      
      {id && (
        <MaintenanceRequestDetail requestId={id} />
      )}
    </Layout>
  );
};

export default MaintenanceRequestDetailPage; 