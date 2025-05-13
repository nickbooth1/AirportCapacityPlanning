import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, Container, Typography, Paper, Button, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, CircularProgress,
  Alert, IconButton, TablePagination, Select,
  MenuItem, FormControl, InputLabel
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Layout from '../../components/Layout';
import flightDataApi from '../../api/flightDataApi';

const statusColors = {
  'draft': 'default',
  'processing': 'warning',
  'validated': 'info',
  'allocated': 'success',
  'finalized': 'primary',
  'failed': 'error'
};

const FlightSchedulesPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (statusFilter) {
        filters.status = statusFilter;
      }

      const response = await flightDataApi.getFlightSchedules(
        filters,
        page + 1,
        rowsPerPage
      );

      setSchedules(response.data.data);
      setTotalCount(response.data.meta.total);
    } catch (err) {
      console.error('Error fetching flight schedules:', err);
      setError(err.message || 'Failed to load flight schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [page, rowsPerPage, statusFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleViewResults = (scheduleId) => {
    router.push(`/flights/allocation-results/${scheduleId}`);
  };

  if (loading && schedules.length === 0) {
    return (
      <Layout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Flight Schedules
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/flights/upload')}
            >
              Upload New Schedule
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="validated">Validated</MenuItem>
                  <MenuItem value="allocated">Allocated</MenuItem>
                  <MenuItem value="finalized">Finalized</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="flight schedules table">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date Range</TableCell>
                  <TableCell>Flights</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.id}</TableCell>
                      <TableCell>{schedule.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={schedule.status.toUpperCase()} 
                          color={statusColors[schedule.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {schedule.start_date ? new Date(schedule.start_date).toLocaleDateString() : 'N/A'} - 
                        {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {schedule.status === 'allocated' || schedule.status === 'finalized' ? (
                          <span>
                            {schedule.allocated_flights} allocated / {schedule.unallocated_flights} unallocated
                          </span>
                        ) : (
                          <span>
                            {schedule.valid_flights || 0} valid / {schedule.invalid_flights || 0} invalid
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleViewResults(schedule.id)}
                          title="View allocation results"
                        >
                          {(schedule.status === 'allocated' || schedule.status === 'finalized') ? (
                            <AssessmentIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {loading ? 'Loading...' : 'No flight schedules found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </Box>
      </Container>
    </Layout>
  );
};

export default FlightSchedulesPage; 