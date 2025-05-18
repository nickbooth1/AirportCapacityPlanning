import React, { useState, useRef } from 'react';
import { 
  Box, Card, CardContent, Typography, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Tooltip, Menu, MenuItem,
  TextField, FormControl, InputLabel, Select, TablePagination,
  TableSortLabel, Grid, Slider, useTheme, Switch, FormControlLabel,
  Stack, Divider
} from '@mui/material';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SettingsIcon from '@mui/icons-material/Settings';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, ZAxis, Brush, Label
} from 'recharts';

// Internal component for custom HeatMap visualization
const HeatMap = ({ data, width, height }) => {
  const { xLabels, yLabels, data: values, colorScale } = data;
  const theme = useTheme();
  
  // Find min and max values for color scaling
  const flatValues = values.flat();
  const minValue = Math.min(...flatValues);
  const maxValue = Math.max(...flatValues);
  
  // Get color for a value based on the color scale
  const getColor = (value) => {
    // Default color
    if (!colorScale || colorScale.length === 0) return theme.palette.primary.main;
    
    // Normalize value between 0-100 if we have a min/max
    const normalizedValue = maxValue > minValue
      ? ((value - minValue) / (maxValue - minValue)) * 100
      : 50;
    
    // Find appropriate color from scale
    for (let i = colorScale.length - 1; i >= 0; i--) {
      if (normalizedValue >= colorScale[i].threshold) {
        return colorScale[i].color;
      }
    }
    
    return colorScale[0].color;
  };
  
  // Calculate cell dimensions
  const cellWidth = width / (xLabels.length || 1);
  const cellHeight = height / (yLabels.length || 1);
  
  return (
    <Box sx={{ position: 'relative', width, height }}>
      {/* X-axis labels */}
      <Box sx={{ position: 'absolute', top: height, left: 0, width, height: 30, display: 'flex' }}>
        {xLabels.map((label, i) => (
          <Box 
            key={`x-${i}`} 
            sx={{ 
              width: cellWidth, 
              height: 30, 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(45deg)',
              transformOrigin: 'top left',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {label}
          </Box>
        ))}
      </Box>
      
      {/* Y-axis labels */}
      <Box sx={{ position: 'absolute', top: 0, left: -100, width: 100, height }}>
        {yLabels.map((label, i) => (
          <Box 
            key={`y-${i}`} 
            sx={{ 
              width: 100, 
              height: cellHeight, 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 1,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {label}
          </Box>
        ))}
      </Box>
      
      {/* Heat map cells */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, width, height }}>
        {values.map((row, rowIndex) => (
          <Box key={`row-${rowIndex}`} sx={{ display: 'flex', width }}>
            {row.map((value, colIndex) => (
              <Tooltip 
                key={`cell-${rowIndex}-${colIndex}`}
                title={`${yLabels[rowIndex]}, ${xLabels[colIndex]}: ${value}`}
                arrow
              >
                <Box 
                  sx={{ 
                    width: cellWidth, 
                    height: cellHeight, 
                    backgroundColor: getColor(value),
                    border: '1px solid rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 0.8,
                      transform: 'scale(1.05)',
                      zIndex: 10
                    }
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>
      
      {/* Color scale legend */}
      <Box sx={{ position: 'absolute', top: height + 30, right: 0, display: 'flex', alignItems: 'center', mt: 2 }}>
        <Typography variant="caption" sx={{ mr: 1 }}>Min: {minValue}</Typography>
        <Box sx={{ display: 'flex', height: 10, width: 150 }}>
          {colorScale.map((scale, i) => (
            <Box 
              key={`scale-${i}`} 
              sx={{ 
                flex: 1, 
                height: 10, 
                backgroundColor: scale.color 
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" sx={{ ml: 1 }}>Max: {maxValue}</Typography>
      </Box>
    </Box>
  );
};

// Interactive Table component with sorting, filtering, and pagination
const InteractiveTable = ({ headers, rows, options }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(options?.pageSize || 10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [filterColumn, setFilterColumn] = useState(-1); // -1 means all columns
  
  // Handle sorting
  const handleRequestSort = (columnIndex) => {
    const isAsc = orderBy === columnIndex && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnIndex);
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Filter rows based on filter text and column
  const filteredRows = rows.filter((row) => {
    if (!filterText) return true;
    
    if (filterColumn === -1) {
      // Search in all columns
      return row.some(cell => 
        String(cell).toLowerCase().includes(filterText.toLowerCase())
      );
    } else {
      // Search in specific column
      return String(row[filterColumn]).toLowerCase().includes(filterText.toLowerCase());
    }
  });
  
  // Sort rows based on the selected column and direction
  const sortedRows = [...filteredRows].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    // Handle different data types
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Default string comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    return order === 'asc' 
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
  
  // Paginate rows
  const paginatedRows = options?.pagination !== false
    ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sortedRows;
  
  return (
    <Box>
      {options?.filterable !== false && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Filter"
            variant="outlined"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{ mr: 2, flex: 1 }}
          />
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="filter-column-label">Column</InputLabel>
            <Select
              labelId="filter-column-label"
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              label="Column"
            >
              <MenuItem value={-1}>All Columns</MenuItem>
              {headers.map((header, index) => (
                <MenuItem key={index} value={index}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell key={index}>
                  {options?.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === index}
                      direction={orderBy === index ? order : 'asc'}
                      onClick={() => handleRequestSort(index)}
                    >
                      {header}
                    </TableSortLabel>
                  ) : (
                    header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
            {paginatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headers.length} align="center">
                  No data to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {options?.pagination !== false && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Box>
  );
};

const EmbeddedVisualization = ({ visualization }) => {
  const [expanded, setExpanded] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [visualizationSettings, setVisualizationSettings] = useState({});
  const chartRef = useRef(null);
  const theme = useTheme();
  
  const handleExpand = () => {
    setExpanded(true);
  };
  
  const handleClose = () => {
    setExpanded(false);
  };
  
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleConfigOpen = () => {
    handleMenuClose();
    setConfigOpen(true);
  };
  
  const handleConfigClose = () => {
    setConfigOpen(false);
  };
  
  const handleConfigSave = () => {
    // Apply settings
    setConfigOpen(false);
  };
  
  const handleExport = (format = 'png') => {
    handleMenuClose();
    
    // Handle export based on visualization type
    switch (format) {
      case 'png':
        if (chartRef.current && visualization.format === 'image/png') {
          // For static images, just download the image
          const link = document.createElement('a');
          link.download = `${visualization.title || 'chart'}.png`;
          link.href = `data:image/png;base64,${visualization.data}`;
          link.click();
        } else {
          // For interactive charts, need to use a library like html2canvas
          alert('PNG export for interactive charts to be implemented');
        }
        break;
        
      case 'csv':
        // Export as CSV (for tables or chart data)
        if (visualization.type === 'table' && visualization.data.headers && visualization.data.rows) {
          const headers = visualization.data.headers.join(',');
          const rows = visualization.data.rows.map(row => row.join(',')).join('\n');
          const csvContent = `${headers}\n${rows}`;
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${visualization.title || 'data'}.csv`;
          link.href = url;
          link.click();
        } else if (visualization.interactiveData && visualization.interactiveData.datasets) {
          // Export chart data as CSV
          alert('CSV export for chart data to be implemented');
        }
        break;
        
      case 'json':
        // Export as JSON
        if (visualization.interactiveData) {
          const blob = new Blob([JSON.stringify(visualization.interactiveData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${visualization.title || 'data'}.json`;
          link.href = url;
          link.click();
        }
        break;
        
      default:
        alert(`Export format ${format} not supported yet`);
    }
  };
  
  const handlePrint = () => {
    handleMenuClose();
    // Open a new window with just the visualization for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${visualization.title || 'Visualization'}</title>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { text-align: center; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${visualization.title || 'Visualization'}</h1>
              ${visualization.format === 'image/png' 
                ? `<img src="data:image/png;base64,${visualization.data}" alt="${visualization.title}" />` 
                : '<p>Interactive visualization - please use export instead.</p>'}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };
  
  const renderVisualizationSettings = () => {
    const type = visualization.type || 'barChart';
    
    switch (type) {
      case 'barChart':
      case 'lineChart':
      case 'areaChart':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Chart Settings</Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.gridLines !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    gridLines: e.target.checked
                  })}
                />
              }
              label="Show grid lines"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showLegend !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showLegend: e.target.checked
                  })}
                />
              }
              label="Show legend"
            />
            
            {type === 'lineChart' && (
              <FormControlLabel
                control={
                  <Switch 
                    checked={visualizationSettings.showPoints !== false} 
                    onChange={(e) => setVisualizationSettings({
                      ...visualizationSettings,
                      showPoints: e.target.checked
                    })}
                  />
                }
                label="Show data points"
              />
            )}
            
            {type === 'areaChart' && (
              <FormControlLabel
                control={
                  <Switch 
                    checked={visualizationSettings.stacked === true} 
                    onChange={(e) => setVisualizationSettings({
                      ...visualizationSettings,
                      stacked: e.target.checked
                    })}
                  />
                }
                label="Stacked areas"
              />
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography id="color-scheme-label" gutterBottom>
                Color scheme
              </Typography>
              <Select
                labelId="color-scheme-label"
                value={visualizationSettings.colorScheme || 'default'}
                onChange={(e) => setVisualizationSettings({
                  ...visualizationSettings,
                  colorScheme: e.target.value
                })}
                fullWidth
                size="small"
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="blue">Blue</MenuItem>
                <MenuItem value="green">Green</MenuItem>
                <MenuItem value="red">Red</MenuItem>
                <MenuItem value="pastel">Pastel</MenuItem>
                <MenuItem value="monochrome">Monochrome</MenuItem>
              </Select>
            </Box>
          </Box>
        );
        
      case 'pieChart':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Pie Chart Settings</Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showLegend !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showLegend: e.target.checked
                  })}
                />
              }
              label="Show legend"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showLabels !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showLabels: e.target.checked
                  })}
                />
              }
              label="Show labels"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showPercentage !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showPercentage: e.target.checked
                  })}
                />
              }
              label="Show percentages"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography id="legend-position-label" gutterBottom>
                Legend position
              </Typography>
              <Select
                labelId="legend-position-label"
                value={visualizationSettings.legendPosition || 'right'}
                onChange={(e) => setVisualizationSettings({
                  ...visualizationSettings,
                  legendPosition: e.target.value
                })}
                fullWidth
                size="small"
              >
                <MenuItem value="top">Top</MenuItem>
                <MenuItem value="right">Right</MenuItem>
                <MenuItem value="bottom">Bottom</MenuItem>
                <MenuItem value="left">Left</MenuItem>
              </Select>
            </Box>
          </Box>
        );
        
      case 'scatterPlot':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Scatter Plot Settings</Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.gridLines !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    gridLines: e.target.checked
                  })}
                />
              }
              label="Show grid lines"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showLegend !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showLegend: e.target.checked
                  })}
                />
              }
              label="Show legend"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography id="point-size-label" gutterBottom>
                Point size
              </Typography>
              <Slider
                aria-labelledby="point-size-label"
                value={visualizationSettings.pointSize || 5}
                onChange={(e, value) => setVisualizationSettings({
                  ...visualizationSettings,
                  pointSize: value
                })}
                min={1}
                max={20}
                step={1}
                marks={[
                  { value: 1, label: 'Small' },
                  { value: 10, label: 'Medium' },
                  { value: 20, label: 'Large' },
                ]}
              />
            </Box>
          </Box>
        );
        
      case 'heatMap':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Heat Map Settings</Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography id="color-scale-label" gutterBottom>
                Color scale
              </Typography>
              <Select
                labelId="color-scale-label"
                value={visualizationSettings.colorScale || 'default'}
                onChange={(e) => setVisualizationSettings({
                  ...visualizationSettings,
                  colorScale: e.target.value
                })}
                fullWidth
                size="small"
              >
                <MenuItem value="default">Default (Blue-Red)</MenuItem>
                <MenuItem value="heatmap">Heat (Yellow-Red)</MenuItem>
                <MenuItem value="blue">Blue Scale</MenuItem>
                <MenuItem value="green">Green Scale</MenuItem>
                <MenuItem value="grayscale">Grayscale</MenuItem>
              </Select>
            </Box>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.showValues !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    showValues: e.target.checked
                  })}
                />
              }
              label="Show values"
            />
          </Box>
        );
        
      case 'table':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Table Settings</Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.sortable !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    sortable: e.target.checked
                  })}
                />
              }
              label="Sortable columns"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.pagination !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    pagination: e.target.checked
                  })}
                />
              }
              label="Show pagination"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={visualizationSettings.filterable !== false} 
                  onChange={(e) => setVisualizationSettings({
                    ...visualizationSettings,
                    filterable: e.target.checked
                  })}
                />
              }
              label="Show filters"
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography id="page-size-label" gutterBottom>
                Rows per page
              </Typography>
              <Select
                labelId="page-size-label"
                value={visualizationSettings.pageSize || 10}
                onChange={(e) => setVisualizationSettings({
                  ...visualizationSettings,
                  pageSize: e.target.value
                })}
                fullWidth
                size="small"
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </Box>
          </Box>
        );
        
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography>No settings available for this visualization type.</Typography>
          </Box>
        );
    }
  };
  
  const renderVisualization = (type, data, fullScreen = false) => {
    if (!data) return null;
    
    const width = fullScreen ? '100%' : '100%';
    const height = fullScreen ? 500 : 300;
    
    // Override ChartJS-generated with interactiveData if available
    const interactiveData = data.interactiveData || data;
    
    // Settings with defaults
    const settings = {
      ...visualizationSettings,
      gridLines: visualizationSettings.gridLines !== false,
      showLegend: visualizationSettings.showLegend !== false,
      showPoints: visualizationSettings.showPoints !== false,
      sortable: visualizationSettings.sortable !== false,
      pagination: visualizationSettings.pagination !== false,
      filterable: visualizationSettings.filterable !== false,
      pageSize: visualizationSettings.pageSize || 10,
      legendPosition: visualizationSettings.legendPosition || 'right',
      pointSize: visualizationSettings.pointSize || 5,
      stacked: visualizationSettings.stacked === true,
      showLabels: visualizationSettings.showLabels !== false,
      showPercentage: visualizationSettings.showPercentage !== false,
      colorScheme: visualizationSettings.colorScheme || 'default'
    };
    
    // Default colors
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
    // Select colors based on scheme
    let colors = COLORS;
    switch (settings.colorScheme) {
      case 'blue':
        colors = ['#0088FE', '#4299E1', '#63B3ED', '#90CDF4', '#BEE3F8'];
        break;
      case 'green':
        colors = ['#00C49F', '#38B2AC', '#4FD1C5', '#81E6D9', '#B2F5EA'];
        break;
      case 'red':
        colors = ['#FF8042', '#F56565', '#FC8181', '#FEB2B2', '#FED7D7'];
        break;
      case 'pastel':
        colors = ['#FFB6C1', '#87CEFA', '#98FB98', '#FFDAB9', '#D8BFD8'];
        break;
      case 'monochrome':
        colors = ['#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0'];
        break;
    }
    
    // Extract visualization data
    let chartData = [];
    let chartSeries = [];
    let xAxisKey, yAxisKey;
    
    // Process recharts data format if available
    if (interactiveData.datasets?.data) {
      chartData = interactiveData.datasets.data;
      chartSeries = interactiveData.datasets.series || [];
      xAxisKey = interactiveData.xAxisKey || 'name';
      yAxisKey = interactiveData.yAxisKey;
    }
    
    switch (type) {
      case 'barChart':
        return (
          <ResponsiveContainer width={width} height={height} ref={chartRef}>
            <BarChart data={chartData}>
              {settings.gridLines && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey={xAxisKey} 
                label={interactiveData.xAxisLabel ? { 
                  value: interactiveData.xAxisLabel, 
                  position: 'insideBottom', 
                  offset: -5 
                } : null} 
              />
              <YAxis 
                label={interactiveData.yAxisLabel ? { 
                  value: interactiveData.yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft' 
                } : null} 
              />
              <RechartsTooltip/>
              {settings.showLegend && <Legend />}
              {fullScreen && <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />}
              {chartSeries.map((series, index) => (
                <Bar 
                  key={index}
                  dataKey={series.dataKey} 
                  name={series.name || series.dataKey}
                  fill={series.color || colors[index % colors.length]} 
                  stackId={settings.stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'lineChart':
        return (
          <ResponsiveContainer width={width} height={height} ref={chartRef}>
            <LineChart data={chartData}>
              {settings.gridLines && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey={xAxisKey} 
                label={interactiveData.xAxisLabel ? { 
                  value: interactiveData.xAxisLabel, 
                  position: 'insideBottom', 
                  offset: -5 
                } : null} 
              />
              <YAxis 
                label={interactiveData.yAxisLabel ? { 
                  value: interactiveData.yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft' 
                } : null} 
              />
              <RechartsTooltip />
              {settings.showLegend && <Legend />}
              {fullScreen && <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />}
              {chartSeries.map((series, index) => (
                <Line 
                  key={index}
                  type="monotone" 
                  dataKey={series.dataKey} 
                  name={series.name || series.dataKey}
                  stroke={series.color || colors[index % colors.length]} 
                  activeDot={settings.showPoints ? { r: 8 } : false} 
                  dot={settings.showPoints}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pieChart':
        const pieData = interactiveData.datasets?.data || [];
        return (
          <ResponsiveContainer width={width} height={height} ref={chartRef}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={settings.showLabels}
                label={settings.showLabels ? ({ name, percent }) => 
                  `${name}${settings.showPercentage ? `: ${(percent * 100).toFixed(0)}%` : ''}`
                : null}
                outerRadius={fullScreen ? 200 : 100}
                fill="#8884d8"
                dataKey={interactiveData.valueKey || 'value'}
                nameKey={interactiveData.nameKey || 'name'}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              {settings.showLegend && (
                <Legend layout="vertical" verticalAlign="middle" align={settings.legendPosition} />
              )}
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'areaChart':
        return (
          <ResponsiveContainer width={width} height={height} ref={chartRef}>
            <AreaChart data={chartData}>
              {settings.gridLines && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey={xAxisKey} 
                label={interactiveData.xAxisLabel ? { 
                  value: interactiveData.xAxisLabel, 
                  position: 'insideBottom', 
                  offset: -5 
                } : null} 
              />
              <YAxis 
                label={interactiveData.yAxisLabel ? { 
                  value: interactiveData.yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft' 
                } : null} 
              />
              <RechartsTooltip />
              {settings.showLegend && <Legend />}
              {fullScreen && <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />}
              {chartSeries.map((series, index) => (
                <Area 
                  key={index}
                  type="monotone" 
                  dataKey={series.dataKey} 
                  name={series.name || series.dataKey}
                  fill={series.color || colors[index % colors.length]}
                  stroke={series.color || colors[index % colors.length]}
                  fillOpacity={0.6}
                  stackId={settings.stacked ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'scatterPlot':
        return (
          <ResponsiveContainer width={width} height={height} ref={chartRef}>
            <ScatterChart>
              {settings.gridLines && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                type="number"
                dataKey="x"
                name={interactiveData.xAxisLabel || 'X'} 
                label={interactiveData.xAxisLabel ? { 
                  value: interactiveData.xAxisLabel, 
                  position: 'insideBottom', 
                  offset: -5 
                } : null} 
              />
              <YAxis 
                type="number"
                dataKey="y"
                name={interactiveData.yAxisLabel || 'Y'}
                label={interactiveData.yAxisLabel ? { 
                  value: interactiveData.yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft' 
                } : null} 
              />
              <ZAxis range={[settings.pointSize * 20, settings.pointSize * 80]} />
              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
              {settings.showLegend && <Legend />}
              {chartSeries.map((series, index) => (
                <Scatter 
                  key={index}
                  name={series.name || series.dataKey}
                  data={chartData.filter(point => point.name === series.name)}
                  fill={series.color || colors[index % colors.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      case 'heatMap':
        // Heat maps use a custom component
        if (interactiveData.xLabels && interactiveData.yLabels && interactiveData.data) {
          return (
            <Box sx={{ width, height: height + 50, pt: 2, pl: 100 }} ref={chartRef}>
              <HeatMap 
                data={interactiveData} 
                width={fullScreen ? 700 : 500} 
                height={height - 50} 
              />
            </Box>
          );
        }
        return (
          <Typography color="error">
            Invalid heat map data format
          </Typography>
        );
        
      case 'table':
        if (interactiveData.headers && interactiveData.rows) {
          return (
            <Box sx={{ width }} ref={chartRef}>
              <InteractiveTable 
                headers={interactiveData.headers} 
                rows={interactiveData.rows} 
                options={interactiveData.options || settings}
              />
            </Box>
          );
        }
        // Fallback to standard table if interactive options aren't available
        return (
          <TableContainer component={Paper} sx={{ maxHeight: fullScreen ? 'none' : 300 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {data.headers.map((header, index) => (
                    <TableCell key={index}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
        
      default:
        return (
          <Typography color="error">
            Unsupported visualization type: {type}
          </Typography>
        );
    }
  };
  
  if (!visualization) return null;
  
  const { type, data, title, format, metadata } = visualization;
  const visualType = format || type;
  
  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" component="div">
              {title || 'Visualization'}
            </Typography>
            <Box>
              <Tooltip title="Settings">
                <IconButton onClick={handleConfigOpen} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="View fullscreen">
                <IconButton onClick={handleExpand} size="small">
                  <ZoomOutMapIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="More options">
                <IconButton onClick={handleMenuOpen} size="small">
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => handleExport('png')}>Export as PNG</MenuItem>
                <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
                <MenuItem onClick={() => handleExport('json')}>Export as JSON</MenuItem>
                <MenuItem onClick={handlePrint}>Print</MenuItem>
                <MenuItem onClick={handleConfigOpen}>Settings</MenuItem>
              </Menu>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            {renderVisualization(
              visualType, 
              data
            )}
          </Box>
        </CardContent>
      </Card>
      
      <Dialog
        open={expanded}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {title || 'Visualization'}
            <Box>
              <Tooltip title="Export">
                <IconButton onClick={handleMenuOpen} size="small">
                  <GetAppIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton onClick={handleConfigOpen} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print">
                <IconButton onClick={handlePrint} size="small">
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {renderVisualization(
              visualType, 
              data,
              true
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={configOpen}
        onClose={handleConfigClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Visualization Settings
        </DialogTitle>
        <DialogContent dividers>
          {renderVisualizationSettings()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigClose}>Cancel</Button>
          <Button onClick={handleConfigSave} variant="contained" color="primary">
            Apply Settings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmbeddedVisualization;