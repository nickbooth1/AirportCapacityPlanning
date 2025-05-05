import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  TextField
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import { useFlightUpload, UploadStatus } from '../../src/contexts/FlightUploadContext';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import memoize from 'memoize-one';

/**
 * UploadQA Component
 * 
 * A component for reviewing and managing validation results
 * for uploaded flight data, with filtering, sorting, and export options.
 * Optimized for handling large datasets with virtualized scrolling.
 */
const UploadQA = () => {
  const {
    status,
    uploadId,
    validationStats,
    validationResults,
    error,
    fetchValidationResults,
    approveFlights,
    exportValidationReport
  } = useFlightUpload();

  // Local state
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [filters, setFilters] = useState({
    flightNature: '',
    validationStatus: '',
    page: 1,
    limit: 20
  });
  const [sortField, setSortField] = useState('scheduled_datetime');
  const [sortDirection, setSortDirection] = useState('asc');

  // Load data when component mounts or filters change
  useEffect(() => {
    if (status === UploadStatus.REVIEWING || status === UploadStatus.VALIDATING) {
      loadData();
    }
  }, [status, filters, sortField, sortDirection]);

  // Load validation results with current filters
  const loadData = async () => {
    if (!uploadId) return;
    
    setLoading(true);
    try {
      await fetchValidationResults({
        ...filters,
        sort: sortField,
        direction: sortDirection
      });
    } catch (err) {
      console.error('Error loading validation results:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setFilters({
      ...filters,
      validationStatus: newValue === 0 ? '' : newValue === 1 ? 'valid' : 'invalid',
      page: 1
    });
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setFilters({
      ...filters,
      page: value
    });
  };

  // Handle filters change
  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value,
      page: 1 // Reset to first page when filter changes
    });
  };

  // Handle sort change
  const handleSortChange = (field) => {
    const direction = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
  };

  // Handle export report
  const handleExport = async (format = 'csv') => {
    setExportLoading(true);
    try {
      await exportValidationReport({
        format,
        flightNature: filters.flightNature,
        includeValid: !filters.validationStatus || filters.validationStatus === 'valid',
        includeInvalid: !filters.validationStatus || filters.validationStatus === 'invalid'
      });
    } catch (err) {
      console.error('Error exporting validation report:', err);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle approve flights
  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      await approveFlights({
        approveAll: true,
        excludeInvalid: true
      });
    } catch (err) {
      console.error('Error approving flights:', err);
    } finally {
      setApproveLoading(false);
    }
  };

  // Render statistics cards
  const renderStats = () => {
    if (!validationStats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Flights"
            value={validationStats.total}
            icon={<VisibilityIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Valid Flights"
            value={validationStats.valid}
            icon={<CheckCircleIcon color="success" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Invalid Flights"
            value={validationStats.invalid}
            icon={<ErrorIcon color="error" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Validation Rate"
            value={validationStats.total ? `${Math.round((validationStats.valid / validationStats.total) * 100)}%` : 'N/A'}
            icon={<CheckCircleIcon color="info" />}
          />
        </Grid>
      </Grid>
    );
  };

  // Create a memoized function to get item data for virtualization
  const getItemData = memoize((items) => ({
    items,
    renderErrors,
    formatDate
  }));

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Render validation errors as chips
  const renderErrors = (flight) => {
    if (!flight.validation_errors) return null;
    
    let errors;
    try {
      errors = typeof flight.validation_errors === 'string' 
        ? JSON.parse(flight.validation_errors) 
        : flight.validation_errors;
    } catch (e) {
      return <Chip label="Parse Error" color="error" size="small" />;
    }
    
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return null;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {errors.slice(0, 2).map((err, i) => (
          <Tooltip key={i} title={err.message || err}>
            <Chip 
              label={err.field || 'Error'} 
              color="error" 
              size="small" 
            />
          </Tooltip>
        ))}
        {errors.length > 2 && (
          <Tooltip title={`${errors.length - 2} more errors`}>
            <Chip label={`+${errors.length - 2}`} color="default" size="small" />
          </Tooltip>
        )}
      </Box>
    );
  };

  // Check if reviewing phase is active
  const isReviewing = status === UploadStatus.REVIEWING;
  const isValidating = status === UploadStatus.VALIDATING;
  const isError = status === UploadStatus.FAILED;
  
  // Calculate pagination info
  const pagination = validationResults?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
  
  // Virtual row renderer
  const Row = ({ index, style, data }) => {
    const { items, renderErrors, formatDate } = data;
    const flight = items[index];

    return (
      <div style={{
        ...style,
        display: 'flex',
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {flight.flight_number}
        </div>
        <div style={{ flex: 1.5, padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {formatDate(flight.scheduled_datetime)}
        </div>
        <div style={{ flex: 1, padding: '8px 16px', textAlign: 'center' }}>
          <Chip
            label={flight.flight_nature === 'D' ? 'Departure' : 'Arrival'}
            color={flight.flight_nature === 'D' ? 'info' : 'warning'}
            size="small"
          />
        </div>
        <div style={{ flex: 1, padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {flight.airline_iata}
        </div>
        <div style={{ flex: 1, padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {flight.origin_destination_iata}
        </div>
        <div style={{ flex: 1, padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {flight.aircraft_type_iata}
        </div>
        <div style={{ flex: 1, padding: '8px 16px', textAlign: 'center' }}>
          <Chip
            label={flight.validation_status === 'valid' ? 'Valid' : 'Invalid'}
            color={flight.validation_status === 'valid' ? 'success' : 'error'}
            size="small"
          />
        </div>
        <div style={{ flex: 1.5, padding: '8px 16px' }}>
          {renderErrors(flight)}
        </div>
      </div>
    );
  };

  // Column headers
  const TableHeader = () => {
    const headers = [
      { field: 'flight_number', label: 'Flight #', flex: 1 },
      { field: 'scheduled_datetime', label: 'Scheduled Time', flex: 1.5 },
      { field: 'flight_nature', label: 'Type', flex: 1 },
      { field: 'airline_iata', label: 'Airline', flex: 1 },
      { field: 'origin_destination_iata', label: 'Origin/Destination', flex: 1 },
      { field: 'aircraft_type_iata', label: 'Aircraft', flex: 1 },
      { field: 'validation_status', label: 'Status', flex: 1 },
      { field: 'errors', label: 'Errors', flex: 1.5 }
    ];

    return (
      <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderBottom: '2px solid rgba(224, 224, 224, 1)' }}>
        {headers.map(header => (
          <div 
            key={header.field} 
            style={{ 
              flex: header.flex, 
              padding: '16px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => handleSortChange(header.field)}
          >
            {header.label}
            {sortField === header.field && (
              sortDirection === 'asc' ? 
                <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} /> : 
                <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isValidating) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6">Validating Flight Data...</Typography>
        <Typography variant="body2" color="text.secondary">
          This may take a few moments depending on the file size.
        </Typography>
      </Box>
    );
  }
  
  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Validation Error</AlertTitle>
        {error || 'An error occurred during validation.'}
      </Alert>
    );
  }
  
  if (!isReviewing || !validationStats) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Waiting for Data</AlertTitle>
        No validation results available yet. Please upload a file first.
      </Alert>
    );
  }

  // Replace the existing table with virtual list implementation
  const renderVirtualizedTable = () => {
    const itemData = getItemData(validationResults.data);

    return (
      <Box sx={{ flex: 1, height: '500px', width: '100%' }}>
        <TableHeader />
        <Box sx={{ height: 'calc(100% - 48px)', width: '100%' }}>
          <AutoSizer>
            {({ height, width }) => (
              <VirtualList
                height={height}
                width={width}
                itemCount={validationResults.data.length}
                itemSize={56} // Approximate row height
                itemData={itemData}
              >
                {Row}
              </VirtualList>
            )}
          </AutoSizer>
        </Box>
      </Box>
    );
  };

  // Modify the return statement to use virtualized table
  if (isReviewing && validationResults.data.length > 0) {
    return (
      <Box>
        {renderStats()}
        
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="h6">Flight Validation Results</Typography>
            <Box>
              <Tooltip title="Refresh">
                <IconButton onClick={loadData} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export CSV">
                <IconButton onClick={() => handleExport('csv')} disabled={exportLoading}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                disabled={approveLoading || validationStats.valid === 0}
                onClick={handleApprove}
                startIcon={approveLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {approveLoading ? 'Processing...' : 'Approve Valid Flights'}
              </Button>
            </Box>
          </Box>
          
          <Divider />
          
          <Box sx={{ p: 2 }}>
            <Tabs value={tab} onChange={handleTabChange}>
              <Tab label="All Flights" />
              <Tab 
                label={`Valid (${validationStats.valid})`} 
                icon={<CheckCircleIcon fontSize="small" color="success" />} 
                iconPosition="end" 
              />
              <Tab 
                label={`Invalid (${validationStats.invalid})`} 
                icon={<ErrorIcon fontSize="small" color="error" />} 
                iconPosition="end" 
              />
            </Tabs>
          </Box>
          
          <Divider />
          
          <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Flight Type</InputLabel>
              <Select
                value={filters.flightNature}
                label="Flight Type"
                onChange={(e) => handleFilterChange('flightNature', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="D">Departures</MenuItem>
                <MenuItem value="A">Arrivals</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Records per page"
              type="number"
              size="small"
              InputProps={{ inputProps: { min: 10, max: 500 } }}
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 20)}
              sx={{ width: 150 }}
            />
          </Box>
          
          <Box sx={{ p: 2, height: '500px' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={40} />
              </Box>
            ) : validationResults.data.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography>No flights match your filter criteria</Typography>
              </Box>
            ) : (
              renderVirtualizedTable()
            )}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {validationResults.data.length} of {pagination.total} flights
            </Typography>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => {
                // Load more records
                const newLimit = filters.limit + 100;
                handleFilterChange('limit', Math.min(newLimit, 500));
              }}
              disabled={validationResults.data.length >= pagination.total || loading}
            >
              Load More
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {renderStats()}
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">Flight Validation Results</Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton onClick={loadData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export CSV">
              <IconButton onClick={() => handleExport('csv')} disabled={exportLoading}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="primary"
              disabled={approveLoading || validationStats.valid === 0}
              onClick={handleApprove}
              startIcon={approveLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {approveLoading ? 'Processing...' : 'Approve Valid Flights'}
            </Button>
          </Box>
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2 }}>
          <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="All Flights" />
            <Tab 
              label={`Valid (${validationStats.valid})`} 
              icon={<CheckCircleIcon fontSize="small" color="success" />} 
              iconPosition="end" 
            />
            <Tab 
              label={`Invalid (${validationStats.invalid})`} 
              icon={<ErrorIcon fontSize="small" color="error" />} 
              iconPosition="end" 
            />
          </Tabs>
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Flight Type</InputLabel>
            <Select
              value={filters.flightNature}
              label="Flight Type"
              onChange={(e) => handleFilterChange('flightNature', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="D">Departures</MenuItem>
              <MenuItem value="A">Arrivals</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Records per page"
            type="number"
            size="small"
            InputProps={{ inputProps: { min: 10, max: 100 } }}
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 20)}
            sx={{ width: 150 }}
          />
        </Box>
        
        <TableContainer>
          <Table size="small">
            {renderTableHeader()}
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : validationResults.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography>No flights match your filter criteria</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                validationResults.data.map((flight) => (
                  <TableRow key={flight.id} hover>
                    <TableCell>{flight.flight_number}</TableCell>
                    <TableCell>{formatDate(flight.scheduled_datetime)}</TableCell>
                    <TableCell>
                      <Chip
                        label={flight.flight_nature === 'D' ? 'Departure' : 'Arrival'}
                        color={flight.flight_nature === 'D' ? 'info' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{flight.airline_iata}</TableCell>
                    <TableCell>{flight.origin_destination_iata}</TableCell>
                    <TableCell>{flight.aircraft_type_iata}</TableCell>
                    <TableCell>
                      <Chip
                        label={flight.validation_status === 'valid' ? 'Valid' : 'Invalid'}
                        color={flight.validation_status === 'valid' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{renderErrors(flight)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {validationResults.data.length} of {pagination.total} flights
          </Typography>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            disabled={loading}
          />
        </Box>
      </Paper>
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4">
            {value}
          </Typography>
        </Box>
        <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'background.default' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.node
};

export default UploadQA; 