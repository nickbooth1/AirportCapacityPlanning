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
  // Import routes
  const apiRoutes = require('../routes');
  const maintenanceRoutes = require('../routes/maintenanceRoutes');
  const terminalsRoutes = require('../routes/terminals');
  const piersRoutes = require('../routes/piers');
  const standsRoutes = require('../routes/stands');
  const aircraftTypesRoutes = require('../routes/aircraft-types');
  const aircraftSizeCategoriesRoutes = require('../routes/aircraft-size-categories');
  const configRoutes = require('../routes/config');
  const capacityRoutes = require('../routes/capacity');
  const airportRoutes = require('../routes/airportRoutes');
  const ghaRoutes = require('../routes/ghaRoutes');
  const airportConfigRoutes = require('../routes/airportConfig');
  const flightUploadRoutes = require('../routes/api/flightUpload');
  const flightDataRoutes = require('../routes/api/flightData');
  const flightScheduleRoutes = require('../routes/api/flightSchedule');
  const standConstraintsRoutes = require('../routes/stand-constraints');
  const standAdjacenciesRoutes = require('../routes/standAdjacencies');

  // Mount routes
  app.use('/api', apiRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/terminals', terminalsRoutes);
  app.use('/api/piers', piersRoutes);
  app.use('/api/stands', standsRoutes);
  app.use('/api/aircraft-types', aircraftTypesRoutes);
  app.use('/api/aircraft-size-categories', aircraftSizeCategoriesRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/capacity', capacityRoutes);
  app.use('/api/airports', airportRoutes);
  app.use('/api/ghas', ghaRoutes);
  app.use('/api/airport-config', airportConfigRoutes);
  app.use('/api/flights/upload', flightUploadRoutes);
  app.use('/api/flights', flightDataRoutes);
  app.use('/api/flight-schedules', flightScheduleRoutes);
  app.use('/api/stand-constraints', standConstraintsRoutes);
  app.use('/api/stand-adjacencies', standAdjacenciesRoutes);

  // Import and use agent routes if available
  try {
    const agentRoutes = require('../routes/api/agent');
    app.use('/api/agent', agentRoutes);
    logger.info('Agent routes initialized');
  } catch (error) {
    logger.warn(`Failed to initialize agent routes: ${error.message}`);
  }

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