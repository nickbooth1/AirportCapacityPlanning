import React from 'react';
import Head from 'next/head';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  IconButton,
  Divider,
  CssBaseline,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Flight as FlightIcon,
  Home as HomeIcon,
  AccountTree as AccountTreeIcon,
  Place as PlaceIcon,
  Settings as SettingsIcon,
  Category as CategoryIcon,
  LocalAirport as LocalAirportIcon,
  Build as BuildIcon,
  Event as EventIcon,
  InsertChart as InsertChartIcon,
  Assessment as AssessmentIcon,
  FlightTakeoff as FlightTakeoffIcon,
  FlightLand as FlightLandIcon,
  Engineering as EngineeringIcon,
  Handyman as HandymanIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';

const drawerWidth = 240;

export default function Layout({ children, title = 'Airport Capacity Planner' }) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        px: [1]
      }}>
        <Typography variant="h6" noWrap component="div">
          Navigation
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button component={Link} href="/">
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} href="/terminals">
          <ListItemIcon>
            <AccountTreeIcon />
          </ListItemIcon>
          <ListItemText primary="Terminals" />
        </ListItem>
        <ListItem button component={Link} href="/piers">
          <ListItemIcon>
            <PlaceIcon />
          </ListItemIcon>
          <ListItemText primary="Piers" />
        </ListItem>
        <ListItem button component={Link} href="/stands">
          <ListItemIcon>
            <FlightIcon />
          </ListItemIcon>
          <ListItemText primary="Stands" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button component={Link} href="/maintenance/requests">
          <ListItemIcon>
            <BuildIcon />
          </ListItemIcon>
          <ListItemText primary="Maintenance Requests" />
        </ListItem>
        <ListItem button component={Link} href="/maintenance/calendar">
          <ListItemIcon>
            <EventIcon />
          </ListItemIcon>
          <ListItemText primary="Maintenance Calendar" />
        </ListItem>
        <ListItem button component={Link} href="/maintenance/impact">
          <ListItemIcon>
            <InsertChartIcon />
          </ListItemIcon>
          <ListItemText primary="Capacity Impact" />
        </ListItem>
        <ListItem button component={Link} href="/capacity">
          <ListItemIcon>
            <AssessmentIcon />
          </ListItemIcon>
          <ListItemText primary="Stand Capacity" />
        </ListItem>
        <Divider sx={{ my: 1 }} />
        <ListItem button component={Link} href="/config">
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Configuration" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Airport Capacity Planner - Optimize terminal, pier, and stand management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {title}
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: '64px', // AppBar height
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
} 