import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, useTheme, 
  Divider, Tooltip, IconButton 
} from '@mui/material';
import { ZoomIn, ZoomOut, Today } from '@mui/icons-material';

const HOUR_WIDTH_BASE = 100; // Base width for 1 hour in pixels
const STAND_HEIGHT = 60; // Height for each stand row in pixels
const TIMELINE_HEADER_HEIGHT = 60; // Height for timeline header

/**
 * Stand Timeline Gantt Chart Component
 * Displays stand allocations in a timeline view
 */
const StandTimelineGantt = ({ allocations }) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [standList, setStandList] = useState([]);
  const [formattedAllocations, setFormattedAllocations] = useState([]);
  
  // Calculate the hour width based on zoom level
  const hourWidth = HOUR_WIDTH_BASE * zoomLevel;

  // Process allocations data when component mounts or allocations change
  useEffect(() => {
    if (!allocations || allocations.length === 0) return;
    
    // Extract time range from allocations
    let earliestTime = new Date();
    let latestTime = new Date();
    const stands = new Set();
    
    allocations.forEach(allocation => {
      // Use scheduled_datetime as the primary time field
      const arrivalTime = new Date(allocation.scheduled_datetime || allocation.scheduled_arrival_time || allocation.scheduled_time);
      
      // For departures, add 2 hours duration, for arrivals add 1 hour if no specific departure time
      const isArrival = allocation.flight_nature === 'A';
      const defaultDuration = isArrival ? 60 : 120; // Minutes
      
      const departureTime = new Date(allocation.scheduled_departure_time || 
        new Date(arrivalTime.getTime() + defaultDuration * 60 * 1000));
      
      if (!earliestTime || arrivalTime < earliestTime) {
        earliestTime = new Date(arrivalTime);
      }
      
      if (!latestTime || departureTime > latestTime) {
        latestTime = new Date(departureTime);
      }
      
      stands.add(allocation.stand_name);
    });
    
    // Extend time range by 1 hour on each side
    earliestTime.setHours(earliestTime.getHours() - 1);
    latestTime.setHours(latestTime.getHours() + 1);
    
    // Ensure we start at the beginning of an hour
    earliestTime.setMinutes(0);
    earliestTime.setSeconds(0);
    
    // Ensure we end at the end of an hour
    latestTime.setMinutes(59);
    latestTime.setSeconds(59);
    
    setTimeRange({ start: earliestTime, end: latestTime });
    setStandList(Array.from(stands).sort());
    setFormattedAllocations(allocations);
  }, [allocations]);

  // Helper function to generate hour labels
  const generateTimeLabels = () => {
    if (!timeRange.start || !timeRange.end) return [];
    
    const labels = [];
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    
    // Generate hourly labels
    for (let time = start; time <= end; time.setHours(time.getHours() + 1)) {
      labels.push(new Date(time));
    }
    
    return labels;
  };
  
  // Helper function to calculate position and width of flight bar
  const calculateFlightPosition = (flight) => {
    // Use scheduled_datetime as primary time field
    const startTime = new Date(flight.scheduled_datetime || flight.scheduled_arrival_time || flight.scheduled_time);
    
    // For departures, add 2 hours duration, for arrivals add 1 hour if no specific departure time
    const isArrival = flight.flight_nature === 'A';
    const defaultDuration = isArrival ? 60 : 120; // Minutes
    
    const endTime = new Date(flight.scheduled_departure_time || 
      new Date(startTime.getTime() + defaultDuration * 60 * 1000));
    
    // Calculate time difference in milliseconds
    const timeRangeStart = timeRange.start.getTime();
    const startDiff = startTime.getTime() - timeRangeStart;
    const duration = endTime.getTime() - startTime.getTime();
    
    // Convert to pixels
    const hourInMs = 60 * 60 * 1000;
    const left = (startDiff / hourInMs) * hourWidth;
    const width = (duration / hourInMs) * hourWidth;
    
    return { left, width };
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Reset zoom to default
  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Calculate total timeline width
  const calculateTimelineWidth = () => {
    if (!timeRange.start || !timeRange.end) return 0;
    
    const diffHours = (timeRange.end - timeRange.start) / (1000 * 60 * 60);
    return diffHours * hourWidth;
  };

  if (!allocations || allocations.length === 0 || !timeRange.start) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">No allocation data available for timeline view</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 4, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Stand Timeline</Typography>
        <Box>
          <IconButton onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
            <ZoomOut />
          </IconButton>
          <IconButton onClick={handleResetZoom}>
            <Today />
          </IconButton>
          <IconButton onClick={handleZoomIn} disabled={zoomLevel >= 3}>
            <ZoomIn />
          </IconButton>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', borderTop: `1px solid ${theme.palette.divider}` }}>
        {/* Stand labels column */}
        <Box sx={{ 
          width: 150, 
          flexShrink: 0, 
          borderRight: `1px solid ${theme.palette.divider}`, 
          zIndex: 2,
          bgcolor: theme.palette.background.paper
        }}>
          {/* Header space */}
          <Box sx={{ height: TIMELINE_HEADER_HEIGHT, p: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">Stands</Typography>
          </Box>
          
          {/* Stand labels */}
          {standList.map((stand, index) => (
            <Box 
              key={stand} 
              sx={{ 
                height: STAND_HEIGHT, 
                borderBottom: index < standList.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                p: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Typography variant="body2" fontWeight="medium">{stand}</Typography>
            </Box>
          ))}
        </Box>
        
        {/* Timeline content */}
        <Box 
          ref={containerRef}
          sx={{ 
            overflow: 'auto',
            flex: 1,
            position: 'relative'
          }}
        >
          <Box sx={{ width: calculateTimelineWidth(), position: 'relative' }}>
            {/* Time headers */}
            <Box sx={{ 
              height: TIMELINE_HEADER_HEIGHT, 
              display: 'flex', 
              borderBottom: `1px solid ${theme.palette.divider}`,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: theme.palette.background.paper
            }}>
              {generateTimeLabels().map((time, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    width: hourWidth, 
                    borderRight: `1px solid ${theme.palette.divider}`,
                    p: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" display="block">
                    {time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            {/* Stand rows with allocations */}
            {standList.map((stand, standIndex) => (
              <Box 
                key={stand} 
                sx={{ 
                  height: STAND_HEIGHT, 
                  position: 'relative', 
                  borderBottom: standIndex < standList.length - 1 ? `1px solid ${theme.palette.divider}` : 'none'
                }}
              >
                {/* Vertical time grid lines */}
                {generateTimeLabels().map((time, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      position: 'absolute', 
                      left: index * hourWidth, 
                      width: 1, 
                      height: '100%', 
                      borderRight: `1px solid ${theme.palette.divider}`,
                      zIndex: 0
                    }} 
                  />
                ))}
                
                {/* Flight allocations */}
                {formattedAllocations
                  .filter(allocation => allocation.stand_name === stand)
                  .map((allocation, index) => {
                    const { left, width } = calculateFlightPosition(allocation);
                    
                    return (
                      <Tooltip 
                        key={`${allocation.id}-${index}`}
                        title={
                          <Box>
                            <Typography variant="body2">{`Flight: ${allocation.flight_number}`}</Typography>
                            <Typography variant="body2">{`Airline: ${allocation.airline_iata || 'N/A'}`}</Typography>
                            <Typography variant="body2">{`Aircraft: ${allocation.aircraft_type_iata || allocation.aircraft_type || 'N/A'}`}</Typography>
                            <Typography variant="body2">{`Type: ${allocation.flight_nature === 'A' ? 'Arrival' : 'Departure'}`}</Typography>
                            <Typography variant="body2">
                              {`Time: ${new Date(allocation.scheduled_datetime || allocation.scheduled_arrival_time || allocation.scheduled_time)
                                .toLocaleTimeString()}`}
                            </Typography>
                          </Box>
                        }
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: left,
                            top: 10,
                            width: Math.max(width, 50), // Ensure minimum width for visibility
                            height: STAND_HEIGHT - 20,
                            // Use different colors for arrivals and departures
                            bgcolor: allocation.flight_nature === 'A' 
                              ? theme.palette.success.main 
                              : theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            borderRadius: 1,
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            opacity: 0.9,
                            '&:hover': {
                              opacity: 1,
                              zIndex: 10
                            }
                          }}
                        >
                          <Typography variant="caption" noWrap>
                            {allocation.flight_number}
                            {allocation.flight_nature === 'A' ? ' ↓' : ' ↑'}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default StandTimelineGantt; 