const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorHandler');
const db = require('./utils/db');
const WebSocketService = require('./services/agent/WebSocketService').default;

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server, process.env.JWT_SECRET);

// Make WebSocket service available to other modules
app.set('webSocketService', webSocketService);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('dev')); // Logging

// Test database connection
db.testConnection()
  .then(() => console.log('Database connection successful'))
  .catch(err => console.error('Database connection error:', err));

// Routes
app.use('/api/terminals', require('./routes/terminals'));
app.use('/api/piers', require('./routes/piers'));
app.use('/api/stands', require('./routes/stands'));
app.use('/api/aircraft-types', require('./routes/aircraftTypes'));
app.use('/api/turnaround-rules', require('./routes/turnaroundRules'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agent', require('./routes/api/agent'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

module.exports = { app, server, webSocketService }; // Export for testing 