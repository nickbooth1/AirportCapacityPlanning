/**
 * Application initialization utility
 * 
 * This module contains functions to initialize the Express application,
 * set up middleware, and register routes.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const fileUpload = require('express-fileupload');
const { Model } = require('objection');
const { errorHandler } = require('../middleware/errorHandler');
const db = require('./db');
const logger = require('./logger');
const { ServiceLocator } = require('./di');
const { registerServices } = require('./serviceRegistry');

/**
 * Initialize the Express application
 * @returns {Object} - The initialized Express app and HTTP server
 */
function initializeApp() {
  // Load environment variables
  dotenv.config();

  // Register services with DI container
  registerServices();

  // Create Express app
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Create HTTP server for both Express and WebSocket
  const server = http.createServer(app);

  // Bind all Objection.js models to the knex instance
  // We need to use the underlying knex instance from db
  Model.knex(db);

  // Configure middleware
  configureMiddleware(app);

  // Add test route for database connection
  addTestRoutes(app);

  // Register all application routes
  registerRoutes(app);

  // Add error handling middleware
  app.use(errorHandler);

  // Initialize WebSocket service
  initializeWebSocket(server);

  // Start the server
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Maximum file upload size: 200MB`);
    
    // Log a message if we get a successful database connection
    db.testConnection()
      .then(() => logger.info('Database connection successful'))
      .catch(error => logger.error(`Database connection failed: ${error.message}`));
  });

  return { app, server };
}

/**
 * Configure Express middleware
 * @param {Object} app - Express application
 */
function configureMiddleware(app) {
  // Security headers
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  // Increase JSON body limit to handle larger requests
  app.use(express.json({ limit: '100mb' })); // Increased from default
  app.use(express.urlencoded({ extended: true, limit: '100mb' })); // Add support for URL-encoded bodies
  
  // Request logging
  app.use(morgan('dev'));

  // File upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 200 * 1024 * 1024 // 200MB max file size
    },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: process.env.NODE_ENV === 'development'
  }));
}

/**
 * Add test routes
 * @param {Object} app - Express application
 */
function addTestRoutes(app) {
  // Test database connection
  app.get('/test-db', async (req, res) => {
    try {
      await db.testConnection();
      res.status(200).json({ message: 'Database connection successful' });
    } catch (error) {
      res.status(500).json({ error: true, message: error.message });
    }
  });
  
  // Service health check
  app.get('/health', (req, res) => {
    const registeredServices = ServiceLocator.getRegisteredServiceNames();
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      servicesCount: registeredServices.length
    });
  });
}

/**
 * Register application routes
 * @param {Object} app - Express application
 */
function registerRoutes(app) {
  const express = require('express');
  
  // Define a function to safely import and mount routes
  function safelyMountRoutes(path, routeModule, fallbackMessage) {
    try {
      const routes = require(routeModule);
      
      // Verify that routes is a valid Express router
      if (routes && typeof routes.use === 'function') {
        app.use(path, routes);
        logger.info(`Routes mounted: ${path}`);
        return true;
      } else {
        logger.error(`Invalid router export from ${routeModule}, creating fallback`);
        const fallbackRouter = express.Router();
        fallbackRouter.all('*', (req, res) => {
          res.status(500).json({ 
            error: 'Invalid router',
            message: fallbackMessage || `The ${path} routes are improperly configured`
          });
        });
        app.use(path, fallbackRouter);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to initialize routes for ${path}: ${error.message}`);
      
      // Create a fallback router for error responses
      const fallbackRouter = express.Router();
      fallbackRouter.all('*', (req, res) => {
        res.status(500).json({ 
          error: 'Route initialization failed',
          message: fallbackMessage || `The ${path} routes are currently unavailable`
        });
      });
      
      app.use(path, fallbackRouter);
      return false;
    }
  }

  // Mount standard API routes
  safelyMountRoutes('/api', '../routes', 'API routes initialization failed');
  safelyMountRoutes('/api/maintenance', '../routes/maintenanceRoutes', 'Maintenance routes unavailable');
  safelyMountRoutes('/api/terminals', '../routes/terminals', 'Terminal routes unavailable');
  safelyMountRoutes('/api/piers', '../routes/piers', 'Pier routes unavailable');
  safelyMountRoutes('/api/stands', '../routes/stands', 'Stand routes unavailable');
  safelyMountRoutes('/api/aircraft-types', '../routes/aircraft-types', 'Aircraft types routes unavailable');
  safelyMountRoutes('/api/aircraft-size-categories', '../routes/aircraft-size-categories', 'Aircraft categories routes unavailable');
  safelyMountRoutes('/api/config', '../routes/config', 'Configuration routes unavailable');
  safelyMountRoutes('/api/capacity', '../routes/capacity', 'Capacity routes unavailable');
  safelyMountRoutes('/api/airports', '../routes/airportRoutes', 'Airport routes unavailable');
  safelyMountRoutes('/api/ghas', '../routes/ghaRoutes', 'Ground handling agent routes unavailable');
  safelyMountRoutes('/api/airport-config', '../routes/airportConfig', 'Airport config routes unavailable');
  safelyMountRoutes('/api/flights/upload', '../routes/api/flightUpload', 'Flight upload routes unavailable');
  safelyMountRoutes('/api/flights', '../routes/api/flightData', 'Flight data routes unavailable');
  safelyMountRoutes('/api/flight-schedules', '../routes/api/flightSchedule', 'Flight schedule routes unavailable');
  safelyMountRoutes('/api/stand-constraints', '../routes/stand-constraints', 'Stand constraint routes unavailable');
  safelyMountRoutes('/api/stand-adjacencies', '../routes/standAdjacencies', 'Stand adjacencies routes unavailable');
  safelyMountRoutes('/api/agent', '../routes/api/agent', 'Agent routes unavailable');

  // Add mock routes for airlines
  app.get('/api/airlines', (req, res) => {
    const mockAirlines = [
      { id: 1, code: 'BA', name: 'British Airways', country: 'GB', active: true },
      { id: 2, code: 'LH', name: 'Lufthansa', country: 'DE', active: true },
      { id: 3, code: 'AF', name: 'Air France', country: 'FR', active: true },
      { id: 4, code: 'UA', name: 'United Airlines', country: 'US', active: true },
      { id: 5, code: 'DL', name: 'Delta Air Lines', country: 'US', active: true },
      { id: 6, code: 'EK', name: 'Emirates', country: 'AE', active: true },
      { id: 7, code: 'QF', name: 'Qantas', country: 'AU', active: true },
      { id: 8, code: 'SQ', name: 'Singapore Airlines', country: 'SG', active: true },
      { id: 9, code: 'CX', name: 'Cathay Pacific', country: 'HK', active: true }
    ];
    res.json({
      success: true,
      message: "Airlines retrieved successfully",
      data: mockAirlines
    });
  });
}

/**
 * Initialize WebSocket service
 * @param {Object} server - HTTP server
 */
function initializeWebSocket(server) {
  try {
    const webSocketService = ServiceLocator.get('webSocketService');
    
    if (webSocketService && typeof webSocketService.initialize === 'function') {
      webSocketService.initialize(server, process.env.JWT_SECRET);
      logger.info('WebSocket service initialized');
    } else {
      // Fallback to direct initialization
      const { initializeWebSocketService } = require('../services/agent/WebSocketService');
      initializeWebSocketService(server, process.env.JWT_SECRET);
      logger.info('WebSocket service initialized (legacy mode)');
    }
  } catch (error) {
    logger.error(`Failed to initialize WebSocket service: ${error.message}`);
  }
}

module.exports = {
  initializeApp
};