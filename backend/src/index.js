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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('dev')); // Logging

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

// Import and use other routes
const terminalsRoutes = require('./routes/terminals');
const piersRoutes = require('./routes/piers');
const standsRoutes = require('./routes/stands');
const aircraftTypesRoutes = require('./routes/aircraft-types');
const aircraftSizeCategoriesRoutes = require('./routes/aircraft-size-categories');
const configRoutes = require('./routes/config');
const capacityRoutes = require('./routes/capacity');
const airlineRoutes = require('./routes/airlineRoutes');
const airportRoutes = require('./routes/airportRoutes');
const ghaRoutes = require('./routes/ghaRoutes');

app.use('/api/terminals', terminalsRoutes);
app.use('/api/piers', piersRoutes);
app.use('/api/stands', standsRoutes);
app.use('/api/aircraft-types', aircraftTypesRoutes);
app.use('/api/aircraft-size-categories', aircraftSizeCategoriesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/airlines', airlineRoutes);
app.use('/api/airports', airportRoutes);
app.use('/api/ghas', ghaRoutes);

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