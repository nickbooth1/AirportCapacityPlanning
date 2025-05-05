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
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AirplanemodeActive as AirplaneIcon,
  Handyman as HandymanIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

export default function GroundHandlingAgents() {
  const [ghas, setGhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch GHAs with pagination and filtering
  const fetchGHAs = async (pageNum, pageSize, query) => {
    try {
      setLoading(true);
      // Build the query parameters
      const params = new URLSearchParams();
      params.append('page', pageNum + 1); // API uses 1-based indexing
      params.append('limit', pageSize);
      if (query) {
        params.append('q', query);
      }
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ghas?${params.toString()}`);
      setGhas(response.data.data || []);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching ground handling agents:', err);
      setError('Failed to load ground handling agents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data fetch
  useEffect(() => {
    fetchGHAs(page, rowsPerPage, debouncedQuery);
  }, [page, rowsPerPage, debouncedQuery]);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset to first page when search query changes
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

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

  const renderServiceTypes = (serviceTypes) => {
    if (!serviceTypes || serviceTypes.length === 0) return '—';
    
    // Limit to first 3 service types with a "+X more" indicator
    const displayTypes = serviceTypes.slice(0, 3);
    const remainingCount = serviceTypes.length - 3;
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {displayTypes.map(service => {
          let label, color;
          switch(service) {
            case 'passenger_services':
              label = 'Passenger';
              color = 'primary';
              break;
            case 'ramp_services':
              label = 'Ramp';
              color = 'secondary';
              break;
            case 'baggage_handling':
              label = 'Baggage';
              color = 'info';
              break;
            case 'cargo_handling':
              label = 'Cargo';
              color = 'success';
              break;
            default:
              label = service.replace('_', ' ');
              color = 'default';
          }
          
          return (
            <Chip 
              key={service}
              label={label}
              size="small"
              color={color}
              sx={{ textTransform: 'capitalize' }}
            />
          );
        })}
        
        {remainingCount > 0 && (
          <Tooltip title={serviceTypes.slice(3).map(s => s.replace('_', ' ')).join(', ')}>
            <Chip 
              label={`+${remainingCount} more`}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
    );
  };

  const renderAirports = (airports) => {
    if (!airports || airports.length === 0) return '—';
    
    // Limit to first 3 airports with a "+X more" indicator
    const displayAirports = airports.slice(0, 3);
    const remainingCount = airports.length - 3;
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {displayAirports.map(airport => (
          <Chip 
            key={airport}
            icon={<AirplaneIcon fontSize="small" />}
            label={airport}
            size="small"
            variant="outlined"
            color="primary"
          />
        ))}
        
        {remainingCount > 0 && (
          <Tooltip title={airports.slice(3).join(', ')}>
            <Chip 
              label={`+${remainingCount} more`}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
    );
  };

  if (loading && ghas.length === 0) {
    return (
      <Layout title="Ground Handling Agents">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Ground Handling Agents">
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Ground Handling Agents">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ground Handling Agents
        </Typography>
        <Typography variant="body1" paragraph>
          Complete database of ground handling companies operating at airports worldwide. Use the search box to filter by name, code, or location.
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search Ground Handling Agents"
          placeholder="Search by company name, code, country, or headquarters"
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
          Showing {ghas.length} of {totalCount} ground handling agents
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer component={Paper}>
          <Table aria-label="ground handling agents table">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Service Types</TableCell>
                <TableCell>Operates At</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && ghas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : ghas.length > 0 ? (
                ghas.map((gha) => (
                  <TableRow key={gha.id} hover>
                    <TableCell>
                      {gha.code ? (
                        <Chip 
                          icon={<HandymanIcon fontSize="small" />} 
                          label={gha.code} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>{gha.name}</TableCell>
                    <TableCell>{gha.country_name || gha.country || '—'}</TableCell>
                    <TableCell>{renderServiceTypes(gha.service_types)}</TableCell>
                    <TableCell>{renderAirports(gha.operates_at)}</TableCell>
                    <TableCell>
                      {gha.status === 'active' ? (
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1">No ground handling agents found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={parseInt(totalCount, 10)}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
        />
      </Paper>
      
      {loading && ghas.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Layout>
  );
} 