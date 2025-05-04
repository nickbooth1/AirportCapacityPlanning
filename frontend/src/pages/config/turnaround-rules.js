import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import TurnaroundRulesList from '../../components/config/TurnaroundRulesList';

const TurnaroundRulesPage = () => {
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
          <Typography color="textPrimary">Turnaround Rules</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Turnaround Rules
        </Typography>
        
        <TurnaroundRulesList />
      </Box>
    </Container>
  );
};

export default TurnaroundRulesPage; 