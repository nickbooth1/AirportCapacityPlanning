import React from 'react';
import { Link } from 'react-router-dom';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import BuildIcon from '@mui/icons-material/Build';
import FlightIcon from '@mui/icons-material/Flight';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';

const NavigationSidebar = () => {
  return (
    <div>
      {/* ... other list items ... */}
      <ListItem button component={Link} href="/stands">
        <ListItemIcon>
          <AirplaneTicketIcon />
        </ListItemIcon>
        <ListItemText primary="Stands" />
      </ListItem>

      <ListItem button component={Link} href="/maintenance/requests">
        <ListItemIcon>
          <BuildIcon />
        </ListItemIcon>
        <ListItemText primary="Stand Maintenance" />
      </ListItem>

      <ListItem button component={Link} href="/aircraft-types">
        <ListItemIcon>
          <FlightIcon />
        </ListItemIcon>
        <ListItemText primary="Aircraft Types" />
      </ListItem>
      
      <ListItem button component={Link} href="/capacity">
        <ListItemIcon>
          <AssessmentIcon />
        </ListItemIcon>
        <ListItemText primary="Stand Capacity" />
      </ListItem>

      <ListItem button component={Link} href="/config">
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="Configuration" />
      </ListItem>
      {/* ... rest of the list items ... */}
    </div>
  );
};

export default NavigationSidebar; 