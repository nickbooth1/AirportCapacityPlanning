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
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  FlightLand as FlightLandIcon,
  Public as PublicIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import axios from 'axios';

// Sample data for fallback when API is unavailable
const SAMPLE_AIRPORTS = [
  {
    id: 1,
    name: "Los Angeles International Airport",
    iata_code: "LAX",
    icao_code: "KLAX",
    city: "Los Angeles",
    country: "US",
    country_name: "United States",
    type: "large_airport",
    status: "active"
  },
  {
    id: 2,
    name: "Heathrow Airport",
    iata_code: "LHR",
    icao_code: "EGLL",
    city: "London",
    country: "GB",
    country_name: "United Kingdom",
    type: "large_airport",
    status: "active"
  },
  {
    id: 3,
    name: "Frankfurt am Main Airport",
    iata_code: "FRA",
    icao_code: "EDDF",
    city: "Frankfurt",
    country: "DE",
    country_name: "Germany",
    type: "large_airport",
    status: "active"
  }
];

// Regions for filtering
const REGIONS = [
  { code: 'NAM', name: 'North America' },
  { code: 'SAM', name: 'South America' },
  { code: 'EUR', name: 'Europe' },
  { code: 'AFR', name: 'Africa' },
  { code: 'ASI', name: 'Asia' },
  { code: 'OCE', name: 'Oceania' },
  { code: 'MDE', name: 'Middle East' }
];

// Country to region mapping (simplified version)
const COUNTRY_TO_REGION = {
  'US': 'NAM', 'CA': 'NAM', 'MX': 'NAM',
  'BR': 'SAM', 'AR': 'SAM', 'CO': 'SAM', 'CL': 'SAM', 'PE': 'SAM',
  'GB': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
  'ZA': 'AFR', 'EG': 'AFR', 'NG': 'AFR', 'KE': 'AFR', 'ET': 'AFR',
  'CN': 'ASI', 'JP': 'ASI', 'IN': 'ASI', 'KR': 'ASI', 'TH': 'ASI', 'VN': 'ASI',
  'AU': 'OCE', 'NZ': 'OCE', 'FJ': 'OCE',
  'AE': 'MDE', 'SA': 'MDE', 'QA': 'MDE', 'IL': 'MDE', 'TR': 'MDE'
};

// Airport types
const AIRPORT_TYPES = [
  { value: 'large_airport', label: 'Large Airport', color: 'primary' },
  { value: 'medium_airport', label: 'Medium Airport', color: 'secondary' },
  { value: 'small_airport', label: 'Small Airport', color: 'info' },
  { value: 'heliport', label: 'Heliport', color: 'warning' },
  { value: 'seaplane_base', label: 'Seaplane Base', color: 'success' },
  { value: 'closed', label: 'Closed', color: 'error' }
];

export default function Airports() {
  const [airports, setAirports] = useState([]);
  const [filteredAirports, setFilteredAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination and filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Country counts for stats
  const [countryCounts, setCountryCounts] = useState({});
  const [typeCounts, setTypeCounts] = useState({});
  
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        setLoading(true);
        // Request all airports at once by setting a very high limit
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/airports?limit=6000`);
        const data = response.data.data || [];
        
        // Calculate stats about the data
        if (data.length > 0) {
          // Count airports by country
          const countryStats = {};
          const typeStats = {};
          
          data.forEach(airport => {
            // Count by country
            if (airport.country) {
              countryStats[airport.country] = (countryStats[airport.country] || 0) + 1;
            }
            
            // Count by type
            if (airport.type) {
              typeStats[airport.type] = (typeStats[airport.type] || 0) + 1;
            }
          });
          
          setCountryCounts(countryStats);
          setTypeCounts(typeStats);
        }
        
        setAirports(data.length > 0 ? data : SAMPLE_AIRPORTS);
        setFilteredAirports(data.length > 0 ? data : SAMPLE_AIRPORTS);
        setTotalCount(data.length > 0 ? data.length : SAMPLE_AIRPORTS.length);
      } catch (err) {
        console.error('Error fetching airports:', err);
        setError('Failed to load airports from the API. Showing sample data instead.');
        // Use sample data when API fails
        setAirports(SAMPLE_AIRPORTS);
        setFilteredAirports(SAMPLE_AIRPORTS);
        setTotalCount(SAMPLE_AIRPORTS.length);
      } finally {
        setLoading(false);
      }
    };

    fetchAirports();
  }, []);

  useEffect(() => {
    // Apply all filters (search, region, type)
    filterAirports();
  }, [searchQuery, selectedRegion, selectedType, airports]);

  const filterAirports = () => {
    let filtered = [...airports];
    
    // Apply search filter
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(airport => 
        (airport.name && airport.name.toLowerCase().includes(lowercaseQuery)) ||
        (airport.iata_code && airport.iata_code.toLowerCase().includes(lowercaseQuery)) ||
        (airport.icao_code && airport.icao_code.toLowerCase().includes(lowercaseQuery)) ||
        (airport.city && airport.city.toLowerCase().includes(lowercaseQuery)) ||
        (airport.country && airport.country.toLowerCase().includes(lowercaseQuery)) ||
        (airport.country_name && airport.country_name.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // Apply region filter
    if (selectedRegion) {
      filtered = filtered.filter(airport => 
        airport.country && COUNTRY_TO_REGION[airport.country] === selectedRegion
      );
    }
    
    // Apply type filter
    if (selectedType) {
      filtered = filtered.filter(airport => 
        airport.type === selectedType
      );
    }
    
    setFilteredAirports(filtered);
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRegion('');
    setSelectedType('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };

  // Helper function to determine airport type color
  const getAirportTypeColor = (type) => {
    const typeInfo = AIRPORT_TYPES.find(t => t.value === type);
    return typeInfo ? typeInfo.color : 'default';
  };

  // Format airport type for display
  const formatAirportType = (type) => {
    if (!type) return '—';
    const typeInfo = AIRPORT_TYPES.find(t => t.value === type);
    return typeInfo ? typeInfo.label : type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get region name from code
  const getRegionName = (code) => {
    const region = REGIONS.find(r => r.code === code);
    return region ? region.name : code;
  };

  // Count airports by region for stats
  const getRegionStats = () => {
    const stats = {};
    
    Object.keys(countryCounts).forEach(country => {
      const region = COUNTRY_TO_REGION[country] || 'OTH';
      stats[region] = (stats[region] || 0) + countryCounts[country];
    });
    
    return stats;
  };

  const regionStats = getRegionStats();

  return (
    <Layout title="Airports">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Airports Database
        </Typography>
        <Typography variant="body1" paragraph>
          Complete global database of airports with IATA and ICAO codes. Use the search and filters to find specific airports.
        </Typography>
        
        {!loading && !error && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip 
              icon={<PublicIcon />} 
              label={`${totalCount} Airports`} 
              color="primary" 
            />
            <Chip 
              label={`${Object.keys(countryCounts).length} Countries`} 
              color="secondary" 
            />
            {AIRPORT_TYPES.map(type => 
              typeCounts[type.value] && (
                <Chip 
                  key={type.value}
                  label={`${typeCounts[type.value]} ${type.label}s`} 
                  color={type.color}
                  variant="outlined"
                  size="small"
                />
              )
            )}
          </Box>
        )}
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && (
        <>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Search Airports"
                  placeholder="Search by name, IATA code, ICAO code, city or country"
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
              </Grid>
              <Grid item xs={6} md={3}>
                <Button 
                  variant="outlined" 
                  startIcon={<FilterListIcon />}
                  onClick={toggleFilters}
                  fullWidth
                >
                  {filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </Grid>
              <Grid item xs={6} md={3}>
                <Button 
                  variant="outlined"
                  color="secondary" 
                  startIcon={<RefreshIcon />}
                  onClick={resetFilters}
                  fullWidth
                  disabled={!searchQuery && !selectedRegion && !selectedType}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
            
            {filtersOpen && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="region-select-label">Region</InputLabel>
                      <Select
                        labelId="region-select-label"
                        value={selectedRegion}
                        label="Region"
                        onChange={handleRegionChange}
                      >
                        <MenuItem value="">All Regions</MenuItem>
                        <Divider />
                        {REGIONS.map(region => (
                          <MenuItem key={region.code} value={region.code}>
                            {region.name} {regionStats[region.code] ? `(${regionStats[region.code]})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="type-select-label">Airport Type</InputLabel>
                      <Select
                        labelId="type-select-label"
                        value={selectedType}
                        label="Airport Type"
                        onChange={handleTypeChange}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <Divider />
                        {AIRPORT_TYPES.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label} {typeCounts[type.value] ? `(${typeCounts[type.value]})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Showing {filteredAirports.length} of {totalCount} airports
              {selectedRegion && ` in ${getRegionName(selectedRegion)}`}
              {selectedType && ` of type ${formatAirportType(selectedType)}`}
            </Typography>
          </Box>

          <Paper sx={{ width: '100%', mb: 2 }}>
            <TableContainer>
              <Table aria-label="airports table">
                <TableHead>
                  <TableRow>
                    <TableCell>IATA Code</TableCell>
                    <TableCell>ICAO Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAirports
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((airport) => (
                      <TableRow key={airport.id} hover>
                        <TableCell>
                          {airport.iata_code ? (
                            <Chip 
                              icon={<FlightLandIcon fontSize="small" />} 
                              label={airport.iata_code} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="textSecondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {airport.icao_code ? (
                            <Chip 
                              label={airport.icao_code} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="textSecondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>{airport.name}</TableCell>
                        <TableCell>{airport.city || '—'}</TableCell>
                        <TableCell>
                          {airport.country && (
                            <Tooltip title={airport.country_name || airport.country}>
                              <Box display="flex" alignItems="center">
                                <PublicIcon fontSize="small" sx={{ mr: 0.5 }} />
                                {airport.country}
                              </Box>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={formatAirportType(airport.type)} 
                            size="small" 
                            color={getAirportTypeColor(airport.type)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {airport.status === 'active' ? (
                            <Chip 
                              icon={<CheckIcon />} 
                              label="Active" 
                              size="small" 
                              color="success" 
                              variant="outlined"
                            />
                          ) : (
                            <Chip 
                              icon={<CloseIcon />} 
                              label="Inactive" 
                              size="small" 
                              color="error" 
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredAirports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No airports found matching your search criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredAirports.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </>
      )}
    </Layout>
  );
} 