import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  FlightTakeoff as FlightTakeoffIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

export default function Airlines() {
  const [airlines, setAirlines] = useState([]);
  const [filteredAirlines, setFilteredAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/airlines`);
        const data = response.data.data || [];
        setAirlines(data);
        setFilteredAirlines(data);
      } catch (err) {
        console.error('Error fetching airlines:', err);
        setError('Failed to load airlines. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAirlines();
  }, []);

  useEffect(() => {
    // Filter airlines based on search query
    if (searchQuery.trim() === '') {
      setFilteredAirlines(airlines);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = airlines.filter(airline => 
        (airline.name && airline.name.toLowerCase().includes(query)) ||
        (airline.iata_code && airline.iata_code.toLowerCase().includes(query)) ||
        (airline.icao_code && airline.icao_code.toLowerCase().includes(query)) ||
        (airline.country && airline.country.toLowerCase().includes(query))
      );
      setFilteredAirlines(filtered);
    }
    // Reset to first page when filtering
    setPage(0);
  }, [searchQuery, airlines]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  if (loading) {
    return (
      <Layout title="Airlines">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Airlines">
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Airlines">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Airlines Database
        </Typography>
        <Typography variant="body1" paragraph>
          Complete list of airlines with IATA and ICAO codes. Use the search box to filter by name, code, or country.
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search Airlines"
          placeholder="Search by airline name, IATA code, ICAO code or country"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Showing {filteredAirlines.length} airlines
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer component={Paper}>
          <Table aria-label="airlines table">
            <TableHead>
              <TableRow>
                <TableCell>IATA Code</TableCell>
                <TableCell>ICAO Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAirlines
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((airline) => (
                  <TableRow key={airline.id} hover>
                    <TableCell>
                      {airline.iata_code ? (
                        <Chip 
                          icon={<FlightTakeoffIcon fontSize="small" />} 
                          label={airline.iata_code} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {airline.icao_code ? (
                        <Chip 
                          label={airline.icao_code} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>{airline.name}</TableCell>
                    <TableCell>{airline.country || '—'}</TableCell>
                    <TableCell>
                      {airline.active ? (
                        <Chip 
                          icon={<CheckIcon />} 
                          label="Active" 
                          color="success" 
                          size="small"
                        />
                      ) : (
                        <Chip 
                          icon={<CloseIcon />} 
                          label="Inactive" 
                          color="error" 
                          size="small"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {filteredAirlines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1">No airlines found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredAirlines.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Layout>
  );
} 