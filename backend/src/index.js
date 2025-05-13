const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Model } = require('objection');
const { errorHandler } = require('./middleware/errorHandler');
const db = require('./utils/db');
const maintenanceRoutes = require('./routes/maintenanceRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Bind all Objection.js models to the knex instance
// We need to use the underlying knex instance from db
Model.knex(db);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('dev')); // Logging

// Add file upload middleware
const fileUpload = require('express-fileupload');
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: process.env.NODE_ENV === 'development'
}));

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    await db.testConnection();
    res.status(200).json({ message: 'Database connection successful' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// API routes
app.use('/api/maintenance', maintenanceRoutes);

// Import routes
const apiRoutes = require('./routes');

// Mount API routes
app.use('/api', apiRoutes);

// Import and use other routes
const terminalsRoutes = require('./routes/terminals');
const piersRoutes = require('./routes/piers');
const standsRoutes = require('./routes/stands');
const aircraftTypesRoutes = require('./routes/aircraft-types');
const aircraftSizeCategoriesRoutes = require('./routes/aircraft-size-categories');
const configRoutes = require('./routes/config');
const capacityRoutes = require('./routes/capacity');
const airportRoutes = require('./routes/airportRoutes');
const ghaRoutes = require('./routes/ghaRoutes');
const airportConfigRoutes = require('./routes/airportConfig');
const flightUploadRoutes = require('./routes/api/flightUpload');
const flightDataRoutes = require('./routes/api/flightData');
const flightScheduleRoutes = require('./routes/api/flightSchedule');
const standConstraintsRoutes = require('./routes/stand-constraints');
const standAdjacenciesRoutes = require('./routes/standAdjacencies');

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

// Add mock routes for airlines and airport-config
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

// We now use the real terminals API route instead of this mock
// app.get('/api/terminals', (req, res) => {
//   const mockTerminals = [
//     { id: 1, code: 'T1', name: 'Terminal 1', max_capacity: 1200, current_capacity: 850, status: 'OPERATIONAL' },
//     { id: 2, code: 'T2', name: 'Terminal 2', max_capacity: 1500, current_capacity: 1100, status: 'OPERATIONAL' },
//     { id: 3, code: 'T3', name: 'Terminal 3', max_capacity: 1800, current_capacity: 1300, status: 'OPERATIONAL' },
//     { id: 4, code: 'T4', name: 'Terminal 4', max_capacity: 2000, current_capacity: 1400, status: 'OPERATIONAL' },
//     { id: 5, code: 'T5', name: 'Terminal 5', max_capacity: 2200, current_capacity: 1600, status: 'OPERATIONAL' }
//   ];
//   res.json({
//     success: true,
//     message: "Terminals retrieved successfully",
//     data: mockTerminals
//   });
// });

// Remove mock routes for airport-config since we're now using real routes

// Error handling
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log a message if we get a successful database connection
  db.testConnection()
    .then(() => console.log('Database connection successful'))
    .catch(error => console.error('Database connection failed:', error.message));
});

// Export the app for testing
module.exports = app; 