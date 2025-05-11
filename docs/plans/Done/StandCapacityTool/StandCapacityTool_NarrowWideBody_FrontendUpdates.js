/**
 * Sample frontend code updates for visualizing capacity by body type
 * 
 * This file outlines the key changes needed in the NewCapacityResults.js
 * to support visualization by narrow body vs wide body aircraft.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Grid,
  Divider,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip
} from '@mui/material';
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

/**
 * Updated CapacityChart component to show narrow/wide body visualization
 */
const CapacityChart = ({ results, viewMode, filters }) => {
  // Extract data from results
  const { bodyTypeVisualization, timeSlots } = results;
  
  // Apply filters if provided
  const filteredData = bodyTypeVisualization.filter(item => {
    // Apply time slot filter if provided
    if (filters.timeSlotIds && filters.timeSlotIds.length > 0) {
      const timeSlot = timeSlots.find(slot => slot.name === item.timeSlot);
      if (!timeSlot || !filters.timeSlotIds.includes(timeSlot.id)) {
        return false;
      }
    }
    return true;
  });
  
  // Transform data for the chart based on view mode
  const chartData = filteredData.map(item => ({
    name: item.timeSlot,
    timeRange: timeSlots.find(slot => slot.name === item.timeSlot)?.start_time?.substring(0, 5) + ' - ' + 
               timeSlots.find(slot => slot.name === item.timeSlot)?.end_time?.substring(0, 5),
    bestNarrow: item.bestCase.narrow,
    bestWide: item.bestCase.wide,
    worstNarrow: item.worstCase.narrow,
    worstWide: item.worstCase.wide,
    bestTotal: item.bestCase.total,
    worstTotal: item.worstCase.total
  }));
  
  // Color scheme for body types
  const colors = {
    bestNarrow: '#82ca9d',     // Green for narrow body best case
    bestWide: '#8884d8',       // Purple for wide body best case
    worstNarrow: '#82ca9d80',  // Transparent green for narrow body worst case
    worstWide: '#8884d880'     // Transparent purple for wide body worst case
  };
  
  return (
    <Box height={500} mt={2}>
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
            formatter={(value, name) => {
              const displayNames = {
                bestNarrow: 'Best Case: Narrow Body',
                bestWide: 'Best Case: Wide Body',
                worstNarrow: 'Worst Case: Narrow Body',
                worstWide: 'Worst Case: Wide Body',
                bestTotal: 'Best Case: Total',
                worstTotal: 'Worst Case: Total'
              };
              return [value, displayNames[name] || name];
            }}
            labelFormatter={(label) => {
              const item = chartData.find(item => item.name === label);
              return `${label} (${item?.timeRange})`;
            }}
          />
          <Legend 
            formatter={(value) => {
              const displayNames = {
                bestNarrow: 'Best Case: Narrow Body',
                bestWide: 'Best Case: Wide Body',
                worstNarrow: 'Worst Case: Narrow Body',
                worstWide: 'Worst Case: Wide Body',
                bestTotal: 'Best Case: Total',
                worstTotal: 'Worst Case: Total'
              };
              return displayNames[value] || value;
            }}
          />
          
          {viewMode === 'detailed' ? (
            // Detailed view with separate bars for narrow and wide body
            <>
              <Bar dataKey="bestNarrow" fill={colors.bestNarrow} />
              <Bar dataKey="bestWide" fill={colors.bestWide} />
              <Bar dataKey="worstNarrow" fill={colors.worstNarrow} />
              <Bar dataKey="worstWide" fill={colors.worstWide} />
            </>
          ) : viewMode === 'stacked' ? (
            // Stacked view for best and worst case
            <>
              <Bar dataKey="bestNarrow" stackId="best" fill={colors.bestNarrow} />
              <Bar dataKey="bestWide" stackId="best" fill={colors.bestWide} />
              <Bar dataKey="worstNarrow" stackId="worst" fill={colors.worstNarrow} />
              <Bar dataKey="worstWide" stackId="worst" fill={colors.worstWide} />
            </>
          ) : (
            // Simple view with just totals
            <>
              <Bar dataKey="bestTotal" fill="#8884d8" />
              <Bar dataKey="worstTotal" fill="#8884d880" />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

/**
 * Filter controls component for time slots, stands, terminals, etc.
 */
const FilterControls = ({ timeSlots, stands, terminals, piers, filters, setFilters }) => {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Time Slots</InputLabel>
          <Select
            multiple
            value={filters.timeSlotIds || []}
            onChange={(e) => setFilters({ ...filters, timeSlotIds: e.target.value })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={timeSlots.find(slot => slot.id === value)?.name || value} 
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {timeSlots.map((slot) => (
              <MenuItem key={slot.id} value={slot.id}>
                {slot.name} ({slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Stands</InputLabel>
          <Select
            multiple
            value={filters.standIds || []}
            onChange={(e) => setFilters({ ...filters, standIds: e.target.value })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={stands.find(stand => stand.id === value)?.name || value} 
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {stands.map((stand) => (
              <MenuItem key={stand.id} value={stand.id}>
                {stand.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Terminals</InputLabel>
          <Select
            multiple
            value={filters.terminalIds || []}
            onChange={(e) => setFilters({ ...filters, terminalIds: e.target.value })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={terminals.find(terminal => terminal.id === value)?.name || value} 
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {terminals.map((terminal) => (
              <MenuItem key={terminal.id} value={terminal.id}>
                {terminal.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Piers</InputLabel>
          <Select
            multiple
            value={filters.pierIds || []}
            onChange={(e) => setFilters({ ...filters, pierIds: e.target.value })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={piers.find(pier => pier.id === value)?.name || value} 
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {piers.map((pier) => (
              <MenuItem key={pier.id} value={pier.id}>
                {pier.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <FormControlLabel
          control={
            <Checkbox
              checked={filters.fuelEnabled || false}
              onChange={(e) => setFilters({ ...filters, fuelEnabled: e.target.checked })}
            />
          }
          label="Fuel-Enabled Stands Only"
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Button 
          variant="outlined" 
          onClick={() => setFilters({})} 
          size="small"
        >
          Clear Filters
        </Button>
      </Grid>
    </Grid>
  );
};

/**
 * Summary statistics component for narrow/wide body capacity
 */
const CapacitySummary = ({ results }) => {
  if (!results || !results.bodyTypeVisualization) {
    return null;
  }
  
  // Calculate total and average capacities
  const totalBestNarrow = results.bodyTypeVisualization.reduce((sum, item) => sum + item.bestCase.narrow, 0);
  const totalBestWide = results.bodyTypeVisualization.reduce((sum, item) => sum + item.bestCase.wide, 0);
  const totalBestTotal = totalBestNarrow + totalBestWide;
  
  const totalWorstNarrow = results.bodyTypeVisualization.reduce((sum, item) => sum + item.worstCase.narrow, 0);
  const totalWorstWide = results.bodyTypeVisualization.reduce((sum, item) => sum + item.worstCase.wide, 0);
  const totalWorstTotal = totalWorstNarrow + totalWorstWide;
  
  const slotCount = results.bodyTypeVisualization.length;
  
  const avgBestNarrow = Math.round((totalBestNarrow / slotCount) * 10) / 10;
  const avgBestWide = Math.round((totalBestWide / slotCount) * 10) / 10;
  const avgBestTotal = Math.round((totalBestTotal / slotCount) * 10) / 10;
  
  const avgWorstNarrow = Math.round((totalWorstNarrow / slotCount) * 10) / 10;
  const avgWorstWide = Math.round((totalWorstWide / slotCount) * 10) / 10;
  const avgWorstTotal = Math.round((totalWorstTotal / slotCount) * 10) / 10;
  
  const narrowBodyRatioBest = Math.round((totalBestNarrow / totalBestTotal) * 100);
  const wideBodyRatioBest = Math.round((totalBestWide / totalBestTotal) * 100);
  
  const narrowBodyRatioWorst = Math.round((totalWorstNarrow / totalWorstTotal) * 100);
  const wideBodyRatioWorst = Math.round((totalWorstWide / totalWorstTotal) * 100);
  
  return (
    <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
      <Grid item xs={12}>
        <Typography variant="h6">Capacity Summary</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Best Case Scenario</Typography>
          <Typography>Total Capacity: {totalBestTotal} aircraft</Typography>
          <Typography>Narrow Body: {totalBestNarrow} aircraft ({narrowBodyRatioBest}%)</Typography>
          <Typography>Wide Body: {totalBestWide} aircraft ({wideBodyRatioBest}%)</Typography>
          <Typography sx={{ mt: 1 }}>Average per Time Slot: {avgBestTotal} aircraft</Typography>
          <Typography>Narrow Body: {avgBestNarrow} aircraft</Typography>
          <Typography>Wide Body: {avgBestWide} aircraft</Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Worst Case Scenario</Typography>
          <Typography>Total Capacity: {totalWorstTotal} aircraft</Typography>
          <Typography>Narrow Body: {totalWorstNarrow} aircraft ({narrowBodyRatioWorst}%)</Typography>
          <Typography>Wide Body: {totalWorstWide} aircraft ({wideBodyRatioWorst}%)</Typography>
          <Typography sx={{ mt: 1 }}>Average per Time Slot: {avgWorstTotal} aircraft</Typography>
          <Typography>Narrow Body: {avgWorstNarrow} aircraft</Typography>
          <Typography>Wide Body: {avgWorstWide} aircraft</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

/**
 * Main component for displaying capacity results with the new visualization
 */
const NewCapacityResults = ({ results, stands, terminals, piers }) => {
  // Component state
  const [viewMode, setViewMode] = useState('simple'); // 'simple', 'detailed', 'stacked'
  const [filters, setFilters] = useState({});
  
  // Extract time slots from results
  const { timeSlots } = results;
  
  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  // Calculate and apply filters to get stand capacity
  const handleCalculate = async () => {
    // Call API to recalculate capacity with filters
    // Implementation depends on your API handling
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Stand Capacity Results</Typography>
      
      {/* Filter controls */}
      <FilterControls 
        timeSlots={timeSlots} 
        stands={stands}
        terminals={terminals}
        piers={piers}
        filters={filters}
        setFilters={setFilters}
      />
      
      <Button 
        variant="contained" 
        color="primary"
        onClick={handleCalculate}
        sx={{ mb: 2 }}
      >
        Apply Filters
      </Button>
      
      {/* View mode controls */}
      <ButtonGroup variant="outlined" size="small" sx={{ mb: 2, ml: 2 }}>
        <Button
          onClick={() => handleViewModeChange('simple')}
          variant={viewMode === 'simple' ? 'contained' : 'outlined'}
        >
          Simple View
        </Button>
        <Button
          onClick={() => handleViewModeChange('detailed')}
          variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
        >
          Detailed View
        </Button>
        <Button
          onClick={() => handleViewModeChange('stacked')}
          variant={viewMode === 'stacked' ? 'contained' : 'outlined'}
        >
          Stacked View
        </Button>
      </ButtonGroup>
      
      {/* Summary statistics */}
      <CapacitySummary results={results} />
      
      {/* Main chart */}
      <CapacityChart 
        results={results}
        viewMode={viewMode}
        filters={filters}
      />
      
      {/* Add additional tabs/components as needed */}
    </Box>
  );
};

export default NewCapacityResults; 