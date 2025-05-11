# Stand Capacity Tool - Frontend Implementation Plan

This document outlines the frontend implementation plan for integrating the Stand Capacity Tool into the Airport Capacity Planner web application.

## 1. API Client Implementation

### 1.1 Capacity API Client

- [x] Create or update `frontend/src/lib/capacityApi.js`

```javascript
import api from './api';

/**
 * Calculate stand capacity
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results
 */
export const calculateStandCapacity = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity?${queryParams}`);
  return response.data;
};

/**
 * Get capacity organized by time slot
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results organized by time slot
 */
export const getCapacityByTimeSlot = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity/by-time-slot?${queryParams}`);
  return response.data;
};

/**
 * Get capacity organized by aircraft type
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} The capacity calculation results organized by aircraft type
 */
export const getCapacityByAircraftType = async (options = {}) => {
  const queryParams = new URLSearchParams();
  
  if (options.standIds) {
    queryParams.append('standIds', options.standIds.join(','));
  }
  
  if (options.timeSlotIds) {
    queryParams.append('timeSlotIds', options.timeSlotIds.join(','));
  }
  
  if (options.useDefinedTimeSlots !== undefined) {
    queryParams.append('useDefinedTimeSlots', options.useDefinedTimeSlots);
  }
  
  if (options.date) {
    queryParams.append('date', options.date);
  }
  
  const response = await api.get(`/api/capacity/stand-capacity/by-aircraft-type?${queryParams}`);
  return response.data;
};
```

## 2. Component Structure

### 2.1 Components Overview

- [x] Create the following components:
  - [x] `StandCapacityCalculator`: Main container component
  - [x] `CapacityForm`: Form for selecting calculation options
  - [x] `TimeSlotSelector`: Component for selecting time slots
  - [x] `StandSelector`: Component for selecting stands
  - [x] `CapacityResults`: Component for displaying capacity results
  - [x] `CapacityTable`: Table component for displaying capacity data
  - [x] `CapacityChart`: Chart component for visualizing capacity data
  - [x] `CapacityExport`: Component for exporting capacity data

### 2.2 Component Hierarchy

```
StandCapacityCalculator
├── CapacityForm
│   ├── TimeSlotSelector
│   └── StandSelector
└── CapacityResults
    ├── CapacityTable
    ├── CapacityChart
    └── CapacityExport
```

## 3. Component Implementation

### 3.1 Main Container Component

- [x] Create `frontend/src/components/capacity/StandCapacityCalculator.js`

```javascript
import React, { useState } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import CapacityForm from './CapacityForm';
import CapacityResults from './CapacityResults';
import { calculateStandCapacity } from '../../lib/capacityApi';

const StandCapacityCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  const handleCalculate = async (options) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await calculateStandCapacity(options);
      setResults(data);
    } catch (err) {
      console.error('Failed to calculate capacity:', err);
      setError('Failed to calculate stand capacity. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Stand Capacity Calculator
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Calculate stand capacity based on turnaround times, stand availability, and adjacency rules.
        </Typography>
        
        <CapacityForm onCalculate={handleCalculate} loading={loading} />
      </Paper>
      
      {results && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <CapacityResults results={results} loading={loading} error={error} />
        </Paper>
      )}
      
      {error && !results && (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StandCapacityCalculator;
```

### 3.2 Capacity Form Component

- [x] Create `frontend/src/components/capacity/CapacityForm.js`

```javascript
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  FormControl, 
  FormControlLabel, 
  Switch, 
  Button, 
  CircularProgress, 
  Typography,
  Divider
} from '@mui/material';
import TimeSlotSelector from './TimeSlotSelector';
import StandSelector from './StandSelector';
import { getTimeSlots } from '../../lib/configApi';
import { getStands } from '../../lib/standsApi';

const CapacityForm = ({ onCalculate, loading }) => {
  const [useDefinedTimeSlots, setUseDefinedTimeSlots] = useState(true);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [selectedStands, setSelectedStands] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [stands, setStands] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setError(null);
        
        const [timeSlotsData, standsData] = await Promise.all([
          getTimeSlots(),
          getStands()
        ]);
        
        setTimeSlots(timeSlotsData);
        setStands(standsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load required data. Please refresh the page.');
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    onCalculate({
      useDefinedTimeSlots,
      timeSlotIds: selectedTimeSlots,
      standIds: selectedStands.length > 0 ? selectedStands : undefined
    });
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch 
                checked={useDefinedTimeSlots}
                onChange={(e) => setUseDefinedTimeSlots(e.target.checked)}
                color="primary"
              />
            }
            label="Use defined time slots"
          />
          
          <Typography variant="body2" color="textSecondary">
            {useDefinedTimeSlots 
              ? 'Select specific time slots for capacity calculation' 
              : 'Use system-generated time slots based on operational settings'}
          </Typography>
        </Grid>
        
        {useDefinedTimeSlots && (
          <Grid item xs={12} md={6}>
            <TimeSlotSelector 
              timeSlots={timeSlots}
              selectedTimeSlots={selectedTimeSlots}
              setSelectedTimeSlots={setSelectedTimeSlots}
              loading={loadingData}
            />
          </Grid>
        )}
        
        <Grid item xs={12} md={useDefinedTimeSlots ? 6 : 12}>
          <StandSelector 
            stands={stands}
            selectedStands={selectedStands}
            setSelectedStands={setSelectedStands}
            loading={loadingData}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || loadingData || (useDefinedTimeSlots && selectedTimeSlots.length === 0)}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Calculating...' : 'Calculate Capacity'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CapacityForm;
```

### 3.3 Time Slot Selector Component

- [x] Create `frontend/src/components/capacity/TimeSlotSelector.js`

```javascript
import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Chip, 
  Box, 
  OutlinedInput,
  CircularProgress
} from '@mui/material';

const TimeSlotSelector = ({ timeSlots, selectedTimeSlots, setSelectedTimeSlots, loading }) => {
  const handleChange = (event) => {
    setSelectedTimeSlots(event.target.value);
  };
  
  return (
    <FormControl fullWidth>
      <InputLabel id="time-slots-label">Time Slots</InputLabel>
      <Select
        labelId="time-slots-label"
        id="time-slots-select"
        multiple
        value={selectedTimeSlots}
        onChange={handleChange}
        input={<OutlinedInput id="select-multiple-chip" label="Time Slots" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => {
              const slot = timeSlots.find(s => s.id === value);
              return (
                <Chip key={value} label={slot ? slot.name : value} />
              );
            })}
          </Box>
        )}
        disabled={loading}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} />
            <Box component="span" sx={{ ml: 1 }}>Loading time slots...</Box>
          </MenuItem>
        ) : (
          timeSlots.map((slot) => (
            <MenuItem key={slot.id} value={slot.id}>
              {slot.name} ({slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)})
            </MenuItem>
          ))
        )}
      </Select>
      <FormHelperText>
        Select the time slots to calculate capacity for
      </FormHelperText>
    </FormControl>
  );
};

export default TimeSlotSelector;
```

### 3.4 Stand Selector Component

- [x] Create `frontend/src/components/capacity/StandSelector.js`

```javascript
import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Chip, 
  Box, 
  OutlinedInput,
  CircularProgress
} from '@mui/material';

const StandSelector = ({ stands, selectedStands, setSelectedStands, loading }) => {
  const handleChange = (event) => {
    setSelectedStands(event.target.value);
  };
  
  return (
    <FormControl fullWidth>
      <InputLabel id="stands-label">Stands (Optional)</InputLabel>
      <Select
        labelId="stands-label"
        id="stands-select"
        multiple
        value={selectedStands}
        onChange={handleChange}
        input={<OutlinedInput id="select-multiple-chip" label="Stands (Optional)" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => {
              const stand = stands.find(s => s.id === value);
              return (
                <Chip key={value} label={stand ? stand.code : value} />
              );
            })}
          </Box>
        )}
        disabled={loading}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} />
            <Box component="span" sx={{ ml: 1 }}>Loading stands...</Box>
          </MenuItem>
        ) : (
          stands.map((stand) => (
            <MenuItem key={stand.id} value={stand.id}>
              {stand.code} {stand.terminal_code && `(${stand.terminal_code})`}
            </MenuItem>
          ))
        )}
      </Select>
      <FormHelperText>
        Select specific stands to calculate capacity for, or leave empty to include all stands
      </FormHelperText>
    </FormControl>
  );
};

export default StandSelector;
```

### 3.5 Capacity Results Component

- [x] Create `frontend/src/components/capacity/CapacityResults.js`

```javascript
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Divider,
  Button,
  CircularProgress,
  Grid
} from '@mui/material';
import CapacityTable from './CapacityTable';
import CapacityChart from './CapacityChart';
import { Download as DownloadIcon } from '@mui/icons-material';

const CapacityResults = ({ results, loading, error }) => {
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('table');
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!results) {
    return null;
  }
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  const handleExportCSV = () => {
    // Implement CSV export logic
    alert('CSV export functionality to be implemented');
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Capacity Results</Typography>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Best Case Capacity" />
          <Tab label="Worst Case Capacity" />
        </Tabs>
      </Box>
      
      <Box mb={2}>
        <Button
          variant={viewMode === 'table' ? 'contained' : 'outlined'}
          onClick={() => handleViewModeChange('table')}
          size="small"
          sx={{ mr: 1 }}
        >
          Table View
        </Button>
        <Button
          variant={viewMode === 'chart' ? 'contained' : 'outlined'}
          onClick={() => handleViewModeChange('chart')}
          size="small"
        >
          Chart View
        </Button>
      </Box>
      
      <Box>
        {viewMode === 'table' ? (
          <CapacityTable 
            data={tabValue === 0 ? results.bestCaseCapacity : results.worstCaseCapacity} 
            timeSlots={results.timeSlots}
            scenario={tabValue === 0 ? 'best' : 'worst'}
          />
        ) : (
          <CapacityChart 
            data={tabValue === 0 ? results.bestCaseCapacity : results.worstCaseCapacity} 
            timeSlots={results.timeSlots}
            scenario={tabValue === 0 ? 'best' : 'worst'}
          />
        )}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom>Calculation Metadata</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Calculated At: {new Date(results.metadata.calculatedAt).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Stand Count: {results.metadata.stands.total}
              {results.metadata.stands.filtered !== undefined && 
                ` (${results.metadata.stands.filtered} filtered)`}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary">
              Aircraft Type Count: {results.metadata.aircraftTypes.total}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default CapacityResults;
```

### 3.6 Capacity Table Component

- [x] Create `frontend/src/components/capacity/CapacityTable.js`

```javascript
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography
} from '@mui/material';

const CapacityTable = ({ data, timeSlots, scenario }) => {
  // Extract all unique aircraft types across all time slots
  const aircraftTypes = new Set();
  
  Object.values(data).forEach(slotData => {
    Object.keys(slotData).forEach(aircraftType => {
      aircraftTypes.add(aircraftType);
    });
  });
  
  const sortedAircraftTypes = Array.from(aircraftTypes).sort();
  
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Aircraft Type</strong></TableCell>
            {timeSlots.map((slot) => (
              <TableCell key={slot.id || slot.name} align="center">
                <Typography variant="body2" noWrap>
                  {slot.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" noWrap>
                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedAircraftTypes.map((aircraftType) => (
            <TableRow key={aircraftType}>
              <TableCell component="th" scope="row">
                <strong>{aircraftType}</strong>
              </TableCell>
              {timeSlots.map((slot) => {
                const slotData = data[slot.name] || {};
                const capacity = slotData[aircraftType] || 0;
                
                return (
                  <TableCell 
                    key={`${slot.id || slot.name}-${aircraftType}`} 
                    align="center"
                    sx={{ 
                      bgcolor: capacity > 0 
                        ? scenario === 'best' 
                          ? 'success.light' 
                          : 'warning.light'
                        : 'grey.100',
                      fontWeight: capacity > 0 ? 'bold' : 'normal'
                    }}
                  >
                    {capacity}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CapacityTable;
```

### 3.7 Capacity Chart Component

- [x] Create `frontend/src/components/capacity/CapacityChart.js`

```javascript
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CapacityChart = ({ data, timeSlots, scenario }) => {
  const theme = useTheme();
  
  // Extract all unique aircraft types across all time slots
  const aircraftTypes = new Set();
  
  Object.values(data).forEach(slotData => {
    Object.keys(slotData).forEach(aircraftType => {
      aircraftTypes.add(aircraftType);
    });
  });
  
  const sortedAircraftTypes = Array.from(aircraftTypes).sort();
  
  // Transform data for the chart
  const chartData = timeSlots.map(slot => {
    const slotData = data[slot.name] || {};
    const result = {
      name: slot.name,
      timeRange: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
    };
    
    sortedAircraftTypes.forEach(aircraftType => {
      result[aircraftType] = slotData[aircraftType] || 0;
    });
    
    return result;
  });
  
  return (
    <Box height={400}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
                  {payload.value}
                </text>
                <text x={0} y={0} dy={30} textAnchor="middle" fill="#999" fontSize={10}>
                  {chartData.find(item => item.name === payload.value)?.timeRange}
                </text>
              </g>
            )}
          />
          <YAxis label={{ value: 'Aircraft Count', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [value, `Aircraft Type: ${name}`]}
            labelFormatter={(label) => {
              const item = chartData.find(item => item.name === label);
              return `${label} (${item?.timeRange})`;
            }}
          />
          <Legend />
          {sortedAircraftTypes.map((aircraftType, index) => (
            <Bar 
              key={aircraftType}
              dataKey={aircraftType} 
              name={aircraftType}
              fill={theme.palette[scenario === 'best' ? 'success' : 'warning'].main}
              opacity={0.7 + (index * 0.05)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CapacityChart;
```

## 4. Page Component

- [x] Update the stand capacity page component at `frontend/src/pages/capacity/index.js`

```javascript
import React from 'react';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import StandCapacityCalculator from '../../components/capacity/StandCapacityCalculator';

const CapacityPage = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Breadcrumbs aria-label="breadcrumb" mb={2}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="textPrimary">Capacity Planning</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Stand Capacity Planning
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Calculate the maximum capacity of your stands based on aircraft types, turnaround times, and stand adjacency rules.
        </Typography>
        
        <StandCapacityCalculator />
      </Box>
    </Container>
  );
};

export default CapacityPage;
```

## 5. Next.js Page

- [x] Update the Next.js page at `frontend/pages/capacity.js` (if needed)

```javascript
import React from 'react';
import Layout from '../components/Layout';
import CapacityPage from '../src/pages/capacity';

export default function Capacity() {
  return (
    <Layout title="Capacity Planning">
      <CapacityPage />
    </Layout>
  );
}
```

## 6. Integration with Existing Features

### 6.1 Time Slots Feature Integration

- [x] Connect to the time slots API to get user-defined time slots
- [x] Update form to allow toggling between time slot-based and regular calculation
- [x] Ensure the selected time slots are properly passed to the backend

### 6.2 Stands Feature Integration

- [x] Connect to the stands API to get stand data
- [x] Implement filtering by stands
- [x] Display stand-specific information in the results

### 6.3 Aircraft Types and Turnaround Rules Integration

- [x] Ensure results correctly display aircraft types
- [x] Consider showing turnaround time information in the results

## 7. Testing Plan

### 7.1 Unit Tests

- [ ] Test API client functions
- [ ] Test rendering of components with mock data
- [ ] Test form submission logic

### 7.2 Integration Tests

- [ ] Test the entire capacity calculation flow
- [ ] Test integration with time slots feature
- [ ] Test integration with stands feature

### 7.3 User Testing

- [ ] Get feedback on the UI layout and flow
- [ ] Verify results match expectations
- [ ] Test edge cases with real users

## 8. Deployment

- [ ] Deploy to staging environment for testing
- [ ] Verify all functionality works correctly in staging
- [ ] Deploy to production after successful testing 