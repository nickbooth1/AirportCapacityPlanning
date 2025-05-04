import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../lib/api';

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch terminals on component mount
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would call the actual API
        // const response = await api.getTerminals();
        // setTerminals(response.data.data);
        
        // Mock data for demo purposes
        setTimeout(() => {
          setTerminals([
            { id: 1, name: 'Terminal 1', code: 'T1', description: 'Main international terminal' },
            { id: 2, name: 'Terminal 2', code: 'T2', description: 'Domestic flights terminal' }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching terminals:', error);
        setError('Failed to load terminals. Please try again later.');
        setLoading(false);
      }
    };

    fetchTerminals();
  }, []);

  return (
    <Layout title="Terminal Management">
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Terminals
          </Typography>
          <Button variant="contained" color="primary">
            Add Terminal
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {terminals.map((terminal) => (
                  <TableRow key={terminal.id}>
                    <TableCell>{terminal.id}</TableCell>
                    <TableCell>{terminal.name}</TableCell>
                    <TableCell>{terminal.code}</TableCell>
                    <TableCell>{terminal.description}</TableCell>
                    <TableCell align="right">
                      <Button size="small" color="primary" sx={{ mr: 1 }}>
                        Edit
                      </Button>
                      <Button size="small" color="error">
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Layout>
  );
} 