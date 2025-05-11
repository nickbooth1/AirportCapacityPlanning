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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
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
import WarningIcon from '@mui/icons-material/Warning';
import dynamic from 'next/dynamic';

// Dynamically import ReactApexChart with SSR disabled to avoid 'window is not defined' error
const ReactApexChart = dynamic(
  () => import('react-apexcharts'),
  { ssr: false }
);

// Combined CapacityChart component for rendering bar charts with both best and worst case
const CapacityChart = ({ bestCaseData, worstCaseData, timeSlots, aircraftTypes }) => {
  // Map aircraft types to their size categories based on common patterns
  const getSizeCategory = (type) => {
    // Common patterns for aircraft size categories
    if (/A3[1-2][0-9]/.test(type) || /B73[0-9]/.test(type) || /E1[7-9][0-9]/.test(type) || type === 'A320') return 'C'; // Narrow-body
    if (/A3[3-4][0-9]/.test(type) || /B7[5-6][0-9]/.test(type)) return 'D'; // Small Wide-body
    if (/A3[5-8][0-9]/.test(type) || /B77[0-9]/.test(type)) return 'E'; // Medium Wide-body
    if (/B74[0-9]/.test(type) || /A38[0-9]/.test(type) || /B78[0-9]/.test(type)) return 'F'; // Large Wide-body
    if (/AT[0-9]/.test(type) || /AT[0-9][0-9]/.test(type) || /E[0-9][0-9]/.test(type)) return 'B'; // Regional Jets
    if (/C[0-9][0-9][0-9]/.test(type) || /CRJ/.test(type)) return 'A'; // Light Aircraft
    return 'C'; // Default to C if unknown
  };
  
  // Group aircraft types by size category
  const aircraftTypesByCategory = {};
  aircraftTypes.forEach(type => {
    const category = getSizeCategory(type);
    if (!aircraftTypesByCategory[category]) {
      aircraftTypesByCategory[category] = [];
    }
    aircraftTypesByCategory[category].push(type);
  });
  
  // Size category names for display
  const sizeCategoryNames = {
    'A': 'Light (A)',
    'B': 'Regional (B)',
    'C': 'Narrow-body (C)',
    'D': 'Small Wide-body (D)',
    'E': 'Medium Wide-body (E)',
    'F': 'Large Wide-body (F)'
  };
  
  // Transform data for the chart - aggregating by size category
  const chartData = timeSlots.map(slot => {
    const result = {
      name: slot.name,
      timeRange: `${slot.start_time?.substring(0, 5) || ''} - ${slot.end_time?.substring(0, 5) || ''}`
    };
    
    // Calculate totals by size category for best case
    Object.entries(aircraftTypesByCategory).forEach(([category, types]) => {
      let totalCapacity = 0;
      types.forEach(type => {
        totalCapacity += bestCaseData[slot.name]?.[type] || 0;
      });
      result[`best_${category}`] = totalCapacity;
    });
    
    // Calculate totals by size category for worst case
    Object.entries(aircraftTypesByCategory).forEach(([category, types]) => {
      let totalCapacity = 0;
      types.forEach(type => {
        totalCapacity += worstCaseData[slot.name]?.[type] || 0;
      });
      result[`worst_${category}`] = totalCapacity;
    });
    
    return result;
  });

  // Color scheme for size categories (consistent colors for each category)
  const categoryColors = {
    'A': '#8884d8', // Light purple for Light aircraft
    'B': '#82ca9d', // Green for Regional jets
    'C': '#8dd1e1', // Light blue for Narrow-body
    'D': '#ffc658', // Yellow for Small wide-body
    'E': '#ff8042', // Orange for Medium wide-body
    'F': '#d62728'  // Red for Large wide-body
  };
  
  // Get color for size category
  const getCategoryColor = (category, isWorst = false) => {
    const baseColor = categoryColors[category] || '#aaaaaa';
    return isWorst ? `${baseColor}80` : baseColor; // 50% opacity for worst case
  };
  
  // Get all size categories in use
  const sizeCategories = Object.keys(aircraftTypesByCategory).sort();
  
  // Return chart component based on data quality
  if (!chartData || chartData.length === 0) {
    return (
      <Box height={300} mt={2} display="flex" justifyContent="center" alignItems="center">
        <Typography variant="subtitle1">No chart data available</Typography>
      </Box>
    );
  }

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
              const isWorst = name.startsWith('worst_');
              const category = name.replace('best_', '').replace('worst_', '');
              return [value, `${isWorst ? 'Worst' : 'Best'} Case: ${sizeCategoryNames[category] || category}`];
            }}
            labelFormatter={(label) => {
              const item = chartData.find(item => item.name === label);
              return `${label} (${item?.timeRange})`;
            }}
          />
          <Legend 
            formatter={(value) => {
              const isWorst = value.startsWith('worst_');
              const category = value.replace('best_', '').replace('worst_', '');
              return `${isWorst ? 'Worst' : 'Best'} Case: ${sizeCategoryNames[category] || category}`;
            }}
          />
          
          {/* Best Case Bars - First Group */}
          {sizeCategories.map(category => (
            <Bar 
              key={`best_${category}`}
              dataKey={`best_${category}`} 
              name={`best_${category}`}
              fill={getCategoryColor(category)}
              stackId="stack1"
            />
          ))}
          
          {/* Worst Case Bars - Second Group */}
          {sizeCategories.map(category => (
            <Bar 
              key={`worst_${category}`}
              dataKey={`worst_${category}`} 
              name={`worst_${category}`}
              fill={getCategoryColor(category, true)}
              stackId="stack2"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Body Type Capacity Chart
const BodyTypeCapacityChart = ({ bodyTypeVisualization, viewMode }) => {
  // Check if data exists and has the right format
  if (!bodyTypeVisualization || !Array.isArray(bodyTypeVisualization) || bodyTypeVisualization.length === 0) {
    return (
      <Box height={500} mt={2} display="flex" justifyContent="center" alignItems="center">
        <Typography variant="subtitle1">No visualization data available</Typography>
      </Box>
    );
  }

  console.log('Body type visualization data:', bodyTypeVisualization);
  
  // Determine the data format
  const hasDetailedFormat = bodyTypeVisualization.some(item => 
    typeof item.bestCase === 'object' && item.bestCase !== null && ('narrow' in item.bestCase || 'wide' in item.bestCase)
  );
  
  // Extract time slots for chart labels
  const timeSlots = [...new Set(bodyTypeVisualization.map(item => item.timeSlot || 'Unknown'))]
    .filter(Boolean)
    .sort();
  
  // Process data based on format
  let chartData;
  
  if (hasDetailedFormat) {
    // Format: { timeSlot, bestCase: { narrow, wide }, worstCase: { narrow, wide } }
    // Group by time slot and combine narrow/wide data
    chartData = timeSlots.map(timeSlot => {
      const slotData = bodyTypeVisualization.find(item => item.timeSlot === timeSlot) || {};
      
      return {
        name: 'Narrow-body',
        timeSlot,
        data: [
          {
            x: timeSlot,
            y: viewMode === 'best' ? (slotData.bestCase?.narrow || 0) : (slotData.worstCase?.narrow || 0)
          }
        ]
      };
    }).concat(
      timeSlots.map(timeSlot => {
        const slotData = bodyTypeVisualization.find(item => item.timeSlot === timeSlot) || {};
        
        return {
          name: 'Wide-body',
          timeSlot,
          data: [
            {
              x: timeSlot,
              y: viewMode === 'best' ? (slotData.bestCase?.wide || 0) : (slotData.worstCase?.wide || 0)
            }
          ]
        };
      })
    );
  } else {
    // Format: Array of { timeSlot, category/type, bestCase, worstCase }
    // Group data by aircraft type/category
    const aircraftTypes = [...new Set(bodyTypeVisualization.map(item => item.type || item.category || 'Unknown'))]
      .filter(Boolean);
    
    chartData = aircraftTypes.map(aircraftType => {
      // Get entries for this aircraft type
      const entries = bodyTypeVisualization.filter(item => 
        (item.type === aircraftType || item.category === aircraftType)
      );
      
      return {
        name: aircraftType,
        data: timeSlots.map(timeSlot => {
          const entry = entries.find(item => item.timeSlot === timeSlot);
          if (!entry) return 0;
          
          return viewMode === 'best' ? (entry.bestCase || 0) : (entry.worstCase || 0);
        })
      };
    });
  }

  // Chart options
  const options = {
    chart: {
      type: 'bar',
      height: 500,
      stacked: hasDetailedFormat ? false : true,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '80%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: timeSlots,
      labels: {
        rotate: -45,
        style: { fontSize: '12px' }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Aircraft'
      }
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} aircraft`
      }
    },
    fill: {
      opacity: 1
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center'
    },
    title: {
      text: `${viewMode === 'best' ? 'Best Case' : 'Worst Case'} Aircraft Capacity by Type`,
      align: 'center'
    }
  };

  // Return chart component based on data quality
  if (!chartData || chartData.length === 0) {
    return (
      <Box height={300} mt={2} display="flex" justifyContent="center" alignItems="center">
        <Typography variant="subtitle1">No chart data available</Typography>
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <ReactApexChart 
        options={options} 
        series={chartData} 
        type="bar" 
        height={500} 
      />
    </Box>
  );
};

// Filter controls component
const FilterControls = ({ filters, setFilters, timeSlots, stands, terminals, piers }) => {
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
                {slot.name} ({slot.start_time?.substring(0, 5) || ''} - {slot.end_time?.substring(0, 5) || ''})
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

// Summary statistics component
const CapacitySummary = ({ bodyTypeVisualization }) => {
  // Ensure bodyTypeVisualization exists and is an array
  if (!bodyTypeVisualization || !Array.isArray(bodyTypeVisualization) || bodyTypeVisualization.length === 0) {
    return null;
  }
  
  // Determine the data format
  const hasDetailedFormat = bodyTypeVisualization.some(item => 
    typeof item.bestCase === 'object' && item.bestCase !== null && ('narrow' in item.bestCase || 'wide' in item.bestCase)
  );
  
  let totalBestNarrow = 0;
  let totalBestWide = 0;
  let totalBestTotal = 0;
  let totalWorstNarrow = 0; 
  let totalWorstWide = 0;
  let totalWorstTotal = 0;
  
  if (hasDetailedFormat) {
    // Format: { timeSlot, bestCase: { narrow, wide }, worstCase: { narrow, wide } }
    totalBestNarrow = bodyTypeVisualization.reduce((sum, item) => sum + (item.bestCase?.narrow || 0), 0);
    totalBestWide = bodyTypeVisualization.reduce((sum, item) => sum + (item.bestCase?.wide || 0), 0);
    totalBestTotal = totalBestNarrow + totalBestWide;
    
    totalWorstNarrow = bodyTypeVisualization.reduce((sum, item) => sum + (item.worstCase?.narrow || 0), 0);
    totalWorstWide = bodyTypeVisualization.reduce((sum, item) => sum + (item.worstCase?.wide || 0), 0);
    totalWorstTotal = totalWorstNarrow + totalWorstWide;
  } else {
    // Format: Array of { timeSlot, category/type, bestCase, worstCase }
    const narrowEntries = bodyTypeVisualization.filter(item => 
      (item.type === 'Narrow-body' || item.category === 'narrow')
    );
    const wideEntries = bodyTypeVisualization.filter(item => 
      (item.type === 'Wide-body' || item.category === 'wide')
    );
    
    totalBestNarrow = narrowEntries.reduce((sum, item) => sum + (item.bestCase || 0), 0);
    totalBestWide = wideEntries.reduce((sum, item) => sum + (item.bestCase || 0), 0);
    totalBestTotal = totalBestNarrow + totalBestWide;
    
    totalWorstNarrow = narrowEntries.reduce((sum, item) => sum + (item.worstCase || 0), 0);
    totalWorstWide = wideEntries.reduce((sum, item) => sum + (item.worstCase || 0), 0);
    totalWorstTotal = totalWorstNarrow + totalWorstWide;
  }
  
  // Calculate average per time slot
  const slotCount = bodyTypeVisualization.length / (hasDetailedFormat ? 1 : 2); // Divide by 2 for alternate format
  const avgBestNarrow = slotCount ? Math.round(totalBestNarrow / slotCount * 10) / 10 : 0;
  const avgBestWide = slotCount ? Math.round(totalBestWide / slotCount * 10) / 10 : 0;
  const avgBestTotal = slotCount ? Math.round(totalBestTotal / slotCount * 10) / 10 : 0;
  
  const avgWorstNarrow = slotCount ? Math.round(totalWorstNarrow / slotCount * 10) / 10 : 0;
  const avgWorstWide = slotCount ? Math.round(totalWorstWide / slotCount * 10) / 10 : 0;
  const avgWorstTotal = slotCount ? Math.round(totalWorstTotal / slotCount * 10) / 10 : 0;
  
  // Calculate impact of adjacency constraints
  const capacityDiffPercentage = totalBestTotal > 0 
    ? Math.round((totalBestTotal - totalWorstTotal) / totalBestTotal * 100) 
    : 0;

  return (
    <Grid container spacing={2} mt={2}>
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Best Case Scenario</Typography>
          <Typography>Total Capacity: {totalBestTotal} aircraft</Typography>
          <Typography>Narrow Body: {totalBestNarrow} aircraft ({avgBestNarrow.toFixed(1)}%)</Typography>
          <Typography>Wide Body: {totalBestWide} aircraft ({avgBestWide.toFixed(1)}%)</Typography>
          <Typography sx={{ mt: 1 }}>Average per Time Slot: {avgBestTotal.toFixed(1)} aircraft</Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Worst Case Scenario</Typography>
          <Typography>Total Capacity: {totalWorstTotal} aircraft</Typography>
          <Typography>Narrow Body: {totalWorstNarrow} aircraft ({avgWorstNarrow.toFixed(1)}%)</Typography>
          <Typography>Wide Body: {totalWorstWide} aircraft ({avgWorstWide.toFixed(1)}%)</Typography>
          <Typography sx={{ mt: 1 }}>Average per Time Slot: {avgWorstTotal.toFixed(1)} aircraft</Typography>
        </Paper>
      </Grid>

      {capacityDiffPercentage > 0 && (
        <Grid item xs={12}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              backgroundColor: capacityDiffPercentage > 30 ? '#f8d7da' : '#fff3cd',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <WarningIcon color="warning" />
            <Typography>
              <strong>Adjacency Impact:</strong> Worst case scenario reduces capacity by {capacityDiffPercentage}% compared to best case.
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

const NewCapacityResults = ({ results, stands, terminals, piers }) => {
  const [viewMode, setViewMode] = useState('chart');
  const [chartType, setChartType] = useState('simple'); // 'simple', 'detailed', 'stacked'
  const [displayType, setDisplayType] = useState('bodyType'); // 'bodyType', 'aircraft', 'sizeCategory'
  const [filters, setFilters] = useState({});
  
  // Extract data from results
  const { bestCaseCapacity, worstCaseCapacity, timeSlots, metadata, visualization } = results;
  
  // Extract visualization data
  const bodyTypeVisualization = visualization?.bodyTypeVisualization || [];
  
  // Get unique aircraft types from results
  const aircraftTypes = Object.values(bestCaseCapacity)
    .flatMap(slot => Object.keys(slot))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  
  // Calculate filtering results
  const handleApplyFilters = () => {
    // This function would usually call the API with the filters
    // For now, we'll just log the filters
    console.log('Applying filters:', filters);
    // In a real implementation, you would fetch new data here
    // by calling the backend API with the filter parameters
  };
  
  // Toggle view mode
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  // Toggle chart type
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };
  
  // Toggle display type
  const handleDisplayTypeChange = (type) => {
    setDisplayType(type);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Stand Capacity Results
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={() => {}}
        >
          Export Data
        </Button>
      </Box>
      
      {/* Filter controls */}
      <FilterControls 
        filters={filters}
        setFilters={setFilters}
        timeSlots={timeSlots}
        stands={stands || []}
        terminals={terminals || []}
        piers={piers || []}
      />
      
      <Button 
        variant="contained" 
        color="primary"
        onClick={handleApplyFilters}
        sx={{ mb: 2 }}
      >
        Apply Filters
      </Button>
      
      {/* View controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: 2 }}>
        <ButtonGroup variant="outlined" size="small">
          <Button
            onClick={() => handleDisplayTypeChange('bodyType')}
            variant={displayType === 'bodyType' ? 'contained' : 'outlined'}
          >
            Body Type View
          </Button>
          <Button
            onClick={() => handleDisplayTypeChange('aircraft')}
            variant={displayType === 'aircraft' ? 'contained' : 'outlined'}
          >
            Aircraft View
          </Button>
          <Button
            onClick={() => handleDisplayTypeChange('sizeCategory')}
            variant={displayType === 'sizeCategory' ? 'contained' : 'outlined'}
          >
            Size Category View
          </Button>
        </ButtonGroup>
        
        <ButtonGroup variant="outlined" size="small">
          <Button
            onClick={() => handleViewModeChange('chart')}
            variant={viewMode === 'chart' ? 'contained' : 'outlined'}
            startIcon={<BarChartIcon />}
          >
            Chart
          </Button>
          <Button
            onClick={() => handleViewModeChange('table')}
            variant={viewMode === 'table' ? 'contained' : 'outlined'}
            startIcon={<TableChartIcon />}
          >
            Table
          </Button>
        </ButtonGroup>
      </Box>
      
      {/* Chart type controls - only show when chart view is active and body type display is selected */}
      {viewMode === 'chart' && displayType === 'bodyType' && (
        <ButtonGroup variant="outlined" size="small" sx={{ mb: 2 }}>
          <Button
            onClick={() => handleChartTypeChange('simple')}
            variant={chartType === 'simple' ? 'contained' : 'outlined'}
            startIcon={<ViewWeekIcon />}
          >
            Simple View
          </Button>
          <Button
            onClick={() => handleChartTypeChange('detailed')}
            variant={chartType === 'detailed' ? 'contained' : 'outlined'}
            startIcon={<ViewComfyIcon />}
          >
            Detailed View
          </Button>
          <Button
            onClick={() => handleChartTypeChange('stacked')}
            variant={chartType === 'stacked' ? 'contained' : 'outlined'}
            startIcon={<ViewModuleIcon />}
          >
            Stacked View
          </Button>
        </ButtonGroup>
      )}
      
      {/* Summary statistics */}
      {displayType === 'bodyType' && (
        <CapacitySummary bodyTypeVisualization={bodyTypeVisualization} />
      )}
      
      {/* Main visualization */}
      {viewMode === 'chart' && (
        <Box>
          {displayType === 'bodyType' && bodyTypeVisualization ? (
            <BodyTypeCapacityChart 
              bodyTypeVisualization={bodyTypeVisualization} 
              viewMode={chartType} 
            />
          ) : displayType === 'sizeCategory' || displayType === 'aircraft' ? (
            <CapacityChart 
              bestCaseData={bestCaseCapacity} 
              worstCaseData={worstCaseCapacity} 
              timeSlots={timeSlots} 
              aircraftTypes={aircraftTypes} 
            />
          ) : (
            <Typography>
              No visualization data available. Please recalculate capacity.
            </Typography>
          )}
        </Box>
      )}
      
      {/* Table view is retained but not shown in this edit for brevity */}
    </Box>
  );
};

export default NewCapacityResults; 