/**
 * Application entry point
 */

const { initializeApp } = require('./utils/initializeApp');
const logger = require('./utils/logger');

// Initialize application
try {
  const { app, server } = initializeApp();
  
  // Export for testing
  module.exports = { app, server };
} catch (error) {
  logger.error(`Application failed to start: ${error.message}`, {
    error: error.stack
  });
  process.exit(1);
}