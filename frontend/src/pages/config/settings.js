import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import OperationalSettingsForm from '../../components/config/OperationalSettingsForm';

const OperationalSettingsPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href="/config">
            Configuration
          </Link>
          <Typography color="textPrimary">Operational Settings</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Operational Settings
        </Typography>
        
        <OperationalSettingsForm />
      </Box>
    </Container>
  );
};

export default OperationalSettingsPage; 