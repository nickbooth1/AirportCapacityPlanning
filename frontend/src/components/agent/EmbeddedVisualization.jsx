import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Dialog, 
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ZoomOutMap, Download, Close } from '@mui/icons-material';

/**
 * Component for displaying embedded visualizations in chat messages
 */
const EmbeddedVisualization = ({ visualization }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleExport = () => {
    // Basic export functionality for Phase 1
    try {
      if (visualization.type === 'table') {
        // Export table data as CSV
        const headers = visualization.data.headers.join(',');
        const rows = visualization.data.rows.map(row => row.join(',')).join('\n');
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${visualization.title || 'table-export'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (visualization.format === 'image/png') {
        // Export image data
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${visualization.data}`;
        link.download = `${visualization.title || 'visualization'}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderVisualization = () => {
    if (visualization.type === 'table' && visualization.format === 'table/json') {
      return (
        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {visualization.data.headers.map((header, index) => (
                  <TableCell key={index}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visualization.data.rows.map((row, rowIndex) => (
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
    } else if (
      ['barChart', 'lineChart', 'pieChart'].includes(visualization.type) && 
      visualization.format === 'image/png'
    ) {
      return (
        <img 
          src={`data:image/png;base64,${visualization.data}`} 
          alt={visualization.title || 'Chart'} 
          style={{ maxWidth: '100%', height: 'auto' }} 
        />
      );
    } else {
      return (
        <Typography variant="body2" color="error">
          Unsupported visualization type
        </Typography>
      );
    }
  };

  return (
    <>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 1, 
          mb: 1, 
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2">{visualization.title || 'Visualization'}</Typography>
          <Box>
            <IconButton size="small" onClick={handleExport} aria-label="Export">
              <Download fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleOpen} aria-label="Expand">
              <ZoomOutMap fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {renderVisualization()}
        </Box>
      </Paper>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        aria-labelledby="visualization-dialog-title"
      >
        <DialogTitle id="visualization-dialog-title">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {visualization.title || 'Visualization'}
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={handleClose} 
              aria-label="close"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {renderVisualization()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExport} startIcon={<Download />}>
            Export
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

EmbeddedVisualization.propTypes = {
  visualization: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string.isRequired,
    format: PropTypes.string.isRequired,
    data: PropTypes.any.isRequired,
    title: PropTypes.string,
    metadata: PropTypes.object
  }).isRequired
};

export default EmbeddedVisualization; 