import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  Button,
  Typography,
  Grid,
  InputAdornment,
  IconButton,
  Chip,
  Collapse,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays } from 'date-fns';

/**
 * FlightsFilter Component
 * 
 * A reusable component for filtering flight data with search, date range, 
 * and dropdown filter options.
 */
const FlightsFilter = ({
  onFilterChange,
  initialFilters = {},
  airlines = [],
  terminals = []
}) => {
  const [expanded, setExpanded] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: null,
    endDate: null,
    flightType: 'all',
    airline: 'all',
    terminal: 'all',
    status: 'all',
    ...initialFilters
  });
  
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Update active filters display
  useEffect(() => {
    const active = [];
    
    if (filters.searchTerm) {
      active.push({ key: 'searchTerm', label: `Search: ${filters.searchTerm}` });
    }
    
    if (filters.startDate && filters.endDate) {
      active.push({ 
        key: 'dateRange', 
        label: `Date: ${format(filters.startDate, 'MMM dd')} - ${format(filters.endDate, 'MMM dd')}` 
      });
    }
    
    if (filters.flightType !== 'all') {
      active.push({ key: 'flightType', label: `Type: ${filters.flightType}` });
    }
    
    if (filters.airline !== 'all') {
      active.push({ key: 'airline', label: `Airline: ${filters.airline}` });
    }
    
    if (filters.terminal !== 'all') {
      active.push({ key: 'terminal', label: `Terminal: ${filters.terminal}` });
    }
    
    if (filters.status !== 'all') {
      active.push({ key: 'status', label: `Status: ${filters.status}` });
    }
    
    setActiveFilters(active);
  }, [filters]);
  
  // Apply filters immediately when date changes
  const handleDateChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // If changing start date, make sure end date is not before start date
    if (field === 'startDate' && value && newFilters.endDate && newFilters.endDate < value) {
      newFilters.endDate = addDays(value, 7); // Default to a week after start date
      setFilters(newFilters);
    }
    
    // Apply filters immediately for dates
    onFilterChange(newFilters);
  };
  
  // Handle filter change
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
  };
  
  // Handle search input
  const handleSearchChange = (event) => {
    handleFilterChange('searchTerm', event.target.value);
  };
  
  // Clear search input
  const clearSearch = () => {
    handleFilterChange('searchTerm', '');
  };
  
  // Apply filters
  const applyFilters = () => {
    onFilterChange(filters);
  };
  
  // Reset filters
  const resetFilters = () => {
    const defaultFilters = {
      searchTerm: '',
      startDate: null,
      endDate: null,
      flightType: 'all',
      airline: 'all',
      terminal: 'all',
      status: 'all'
    };
    
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };
  
  // Remove a single filter
  const removeFilter = (key) => {
    let value;
    
    switch (key) {
      case 'searchTerm':
        value = '';
        break;
      case 'dateRange':
        // Reset date filters to null
        handleDateChange('startDate', null);
        handleDateChange('endDate', null);
        return;
      default:
        value = 'all';
    }
    
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Filters
        </Typography>
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {expanded ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </Box>
      
      {/* Search bar - always visible */}
      <TextField
        fullWidth
        placeholder="Search flights by number, airline, origin, or destination..."
        variant="outlined"
        value={filters.searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: filters.searchTerm && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={clearSearch}
                edge="end"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {/* Active filters */}
      {activeFilters.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {activeFilters.map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              onDelete={() => removeFilter(filter.key)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
          {activeFilters.length > 1 && (
            <Chip
              label="Clear All"
              onClick={resetFilters}
              size="small"
              color="secondary"
            />
          )}
        </Box>
      )}
      
      {/* Expandable filters */}
      <Collapse in={expanded}>
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          {/* Date range */}
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={filters.startDate}
                onChange={(date) => handleDateChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={filters.endDate}
                onChange={(date) => handleDateChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                minDate={filters.startDate}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Flight type */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Flight Type"
              value={filters.flightType}
              onChange={(e) => handleFilterChange('flightType', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="A">Arrivals</MenuItem>
              <MenuItem value="D">Departures</MenuItem>
            </TextField>
          </Grid>
          
          {/* Airline */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Airline"
              value={filters.airline}
              onChange={(e) => handleFilterChange('airline', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Airlines</MenuItem>
              {airlines.map((airline) => (
                <MenuItem key={airline.code} value={airline.code}>
                  {airline.name} ({airline.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Terminal */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Terminal"
              value={filters.terminal}
              onChange={(e) => handleFilterChange('terminal', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Terminals</MenuItem>
              {terminals.map((terminal) => (
                <MenuItem key={terminal.id} value={terminal.id}>
                  {terminal.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Status */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Scheduled">Scheduled</MenuItem>
              <MenuItem value="Delayed">Delayed</MenuItem>
              <MenuItem value="Boarding">Boarding</MenuItem>
              <MenuItem value="Departed">Departed</MenuItem>
              <MenuItem value="Arrived">Arrived</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetFilters}
            sx={{ mr: 1 }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={applyFilters}
            startIcon={<FilterListIcon />}
          >
            Apply Filters
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

FlightsFilter.propTypes = {
  /** Callback function when filters change */
  onFilterChange: PropTypes.func.isRequired,
  
  /** Initial filter values */
  initialFilters: PropTypes.object,
  
  /** List of airlines for dropdown */
  airlines: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })),
  
  /** List of terminals for dropdown */
  terminals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired
  }))
};

export default FlightsFilter; 