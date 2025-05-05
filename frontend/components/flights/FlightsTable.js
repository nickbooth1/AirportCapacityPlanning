import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Checkbox,
  Tooltip,
  Chip,
  TableSortLabel,
  CircularProgress
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  FlightTakeoff,
  FlightLand,
  DeleteOutline,
  Edit,
  ContentCopy,
  GetApp
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

// Row component for expandable details
const Row = ({ row, selected, onSelect, onDelete, onEdit, onDuplicate }) => {
  const [open, setOpen] = useState(false);
  
  const handleClick = (event) => {
    event.stopPropagation();
    onSelect(row.id);
  };
  
  const isSelected = selected.includes(row.id);
  
  const getFlightTypeIcon = (flightNature) => {
    return flightNature === 'D' ? <FlightTakeoff fontSize="small" /> : <FlightLand fontSize="small" />;
  };
  
  // Format date for display
  const formatDateTime = (dateString) => {
    try {
      return dateString ? format(parseISO(dateString), 'MMM dd, yyyy HH:mm') : 'N/A';
    } catch (e) {
      return dateString || 'N/A';
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'valid': return 'success';
      case 'invalid': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };
  
  return (
    <>
      <TableRow 
        hover
        onClick={() => setOpen(!open)}
        selected={isSelected}
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            checked={isSelected}
            onClick={handleClick}
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          {getFlightTypeIcon(row.flight_nature)}
          &nbsp;{row.flight_number}
        </TableCell>
        <TableCell>
          {row.airline_name 
            ? `${row.airline_name} (${row.airline_iata})` 
            : row.airline_iata}
        </TableCell>
        <TableCell>{row.flight_nature === 'D' ? 'Departure' : 'Arrival'}</TableCell>
        <TableCell>
          {row.origin_destination_name 
            ? `${row.origin_destination_name} (${row.origin_destination_iata})` 
            : row.origin_destination_iata}
        </TableCell>
        <TableCell>{formatDateTime(row.scheduled_datetime)}</TableCell>
        <TableCell>
          <Chip 
            label={row.validation_status || 'Unknown'} 
            size="small" 
            color={getStatusColor(row.validation_status)}
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex' }}>
            <Tooltip title="Edit Flight">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate Flight">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(row);
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Flight">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.id);
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Flight Details
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2">Flight Information</Typography>
                  <Typography variant="body2">Flight Number: {row.flight_number}</Typography>
                  <Typography variant="body2">
                    Airline: {row.airline_name 
                      ? `${row.airline_name} (${row.airline_iata})` 
                      : row.airline_iata}
                  </Typography>
                  <Typography variant="body2">Aircraft Type: {row.aircraft_type_iata || 'N/A'}</Typography>
                  <Typography variant="body2">Terminal: {row.terminal || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Time Information</Typography>
                  <Typography variant="body2">Scheduled: {formatDateTime(row.scheduled_datetime)}</Typography>
                  <Typography variant="body2">Estimated: {formatDateTime(row.estimated_datetime) || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Route Information</Typography>
                  <Typography variant="body2">
                    {row.flight_nature === 'D' ? 'Destination' : 'Origin'}: {
                      row.origin_destination_name 
                        ? `${row.origin_destination_name} (${row.origin_destination_iata})` 
                        : row.origin_destination_iata
                    }
                  </Typography>
                  <Typography variant="body2">Flight Nature: {row.flight_nature === 'D' ? 'Departure' : 'Arrival'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Status Information</Typography>
                  <Typography variant="body2">Status: {row.validation_status || 'N/A'}</Typography>
                  <Typography variant="body2">Seat Capacity: {row.seat_capacity || 'N/A'}</Typography>
                </Box>
              </Box>
              {row.validation_errors && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Validation Issues</Typography>
                  <Typography variant="body2">{JSON.stringify(row.validation_errors)}</Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Column definitions
const columns = [
  { id: 'selector', label: '', sortable: false },
  { id: 'expander', label: '', sortable: false },
  { id: 'flight_number', label: 'Flight #', sortable: true },
  { id: 'airline_iata', label: 'Airline', sortable: true },
  { id: 'flight_nature', label: 'Type', sortable: true },
  { id: 'origin_destination_iata', label: 'Origin/Dest', sortable: true },
  { id: 'scheduled_datetime', label: 'Schedule', sortable: true },
  { id: 'validation_status', label: 'Status', sortable: true },
  { id: 'actions', label: 'Actions', sortable: false }
];

/**
 * FlightsTable Component
 * 
 * A reusable table component for displaying flight data with sorting, 
 * filtering, pagination, and expandable rows.
 */
const FlightsTable = ({
  flights = [],
  loading = false,
  totalCount = 0,
  page = 0,
  pageSize = 10,
  sortBy = 'scheduled_datetime',
  sortOrder = 'asc',
  onChangePage,
  onChangeRowsPerPage,
  onChangeSort,
  onSelectFlight,
  onSelectAllFlights,
  onDeleteFlight,
  onEditFlight,
  onDuplicateFlight,
  selectedFlights = []
}) => {
  const [selected, setSelected] = useState(selectedFlights);
  
  // Update selected state when props change
  useEffect(() => {
    setSelected(selectedFlights);
  }, [selectedFlights]);
  
  // Handle select all click
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = flights.map((flight) => flight.id);
      setSelected(newSelected);
      onSelectAllFlights(newSelected);
    } else {
      setSelected([]);
      onSelectAllFlights([]);
    }
  };
  
  // Handle individual row selection
  const handleSelect = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    
    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter((selectedId) => selectedId !== id);
    }
    
    setSelected(newSelected);
    onSelectFlight(newSelected);
  };
  
  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    onChangeSort(property, isAsc ? 'desc' : 'asc');
  };
  
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 650 }}>
        <Table stickyHeader aria-label="flights table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < flights.length}
                  checked={flights.length > 0 && selected.length === flights.length}
                  onChange={handleSelectAllClick}
                  inputProps={{
                    'aria-label': 'select all flights',
                  }}
                />
              </TableCell>
              {columns.map((column) => column.id !== 'selector' && (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  padding={column.disablePadding ? 'none' : 'normal'}
                  sortDirection={sortBy === column.id ? sortOrder : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading flights...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : flights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1">
                    No flights found matching your criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              flights.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  selected={selected}
                  onSelect={handleSelect}
                  onDelete={onDeleteFlight}
                  onEdit={onEditFlight}
                  onDuplicate={onDuplicateFlight}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalCount}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(e, newPage) => onChangePage(newPage)}
        onRowsPerPageChange={(e) => onChangeRowsPerPage(parseInt(e.target.value, 10))}
      />
    </Paper>
  );
};

Row.propTypes = {
  row: PropTypes.object.isRequired,
  selected: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired
};

FlightsTable.propTypes = {
  flights: PropTypes.array,
  loading: PropTypes.bool,
  totalCount: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  onChangePage: PropTypes.func.isRequired,
  onChangeRowsPerPage: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onSelectFlight: PropTypes.func.isRequired,
  onSelectAllFlights: PropTypes.func.isRequired,
  onDeleteFlight: PropTypes.func.isRequired,
  onEditFlight: PropTypes.func.isRequired,
  onDuplicateFlight: PropTypes.func.isRequired,
  selectedFlights: PropTypes.array
};

export default FlightsTable; 