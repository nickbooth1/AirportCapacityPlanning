import React from 'react';
import Layout from '../../../components/Layout';
import CapacityImpactAnalysis from '../../components/maintenance/CapacityImpactAnalysis';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';

/**
 * CapacityImpactAnalysisPage
 * Standalone page for analyzing the impact of maintenance on stand capacity
 */
const CapacityImpactAnalysisPage = () => {
  return (
    <Layout title="Capacity Impact Analysis">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link href="/" passHref>
            <MuiLink color="inherit">Home</MuiLink>
          </Link>
          <Link href="/capacity" passHref>
            <MuiLink color="inherit">Capacity</MuiLink>
          </Link>
          <Typography color="textPrimary">Impact Analysis</Typography>
        </Breadcrumbs>
      </Box>
      
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stand Capacity Impact Analysis
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Analyze the impact of scheduled maintenance on daily stand capacity
        </Typography>
      </Box>
      
      <CapacityImpactAnalysis />
    </Layout>
  );
};

export default CapacityImpactAnalysisPage; 