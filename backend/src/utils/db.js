/**
 * Database connection utility
 * Provides database connection and query capabilities for the application
 */

const knex = require('knex');
const config = require('../../../knexfile');

// By default, use the development environment
const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

// Initialize db with knex instance
let db = knex(dbConfig);

/**
 * Initialize database connection if not already initialized
 * @returns {Promise<Object>} - Database connection
 */
function initialize() {
  if (!db) {
    db = knex(dbConfig);
  }
  
  console.log(`Database connection initialized for ${environment} environment`);
  return Promise.resolve(db);
}

/**
 * Test database connection with a simple query
 * @returns {Promise<boolean>} True if connection is successful
 */
function testConnection() {
  if (!db) {
    return Promise.reject(new Error('Database not initialized. Call initialize() first.'));
  }
  
  return db.raw('SELECT 1+1 AS result')
    .then(() => {
      console.log('Database connection test successful');
      return true;
    })
    .catch(error => {
      console.error('Database connection test failed:', error);
      throw error;
    });
}

/**
 * Destroy database connection
 */
function destroy() {
  if (db) {
    return db.destroy().then(() => {
      db = null;
      console.log('Database connection closed');
    });
  }
  return Promise.resolve();
}

// Add utility methods to the database instance
db.initialize = initialize;
db.testConnection = testConnection;
db.destroy = destroy;

// Export the database instance with added methods
module.exports = db; 