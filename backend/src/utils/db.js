const knex = require('knex');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'airport_capacity_planner',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../migrations',
  },
};

// Initialize the database connection
const knexInstance = knex(config);

// Create a function that will be used by the legacy routes
const dbFunction = (tableName) => {
  return knexInstance(tableName);
};

// Add all knex methods to the db function so it acts like a Knex instance
Object.keys(knexInstance).forEach(key => {
  if (typeof knexInstance[key] === 'function') {
    dbFunction[key] = knexInstance[key].bind(knexInstance);
  } else {
    dbFunction[key] = knexInstance[key];
  }
});

// Make sure db is compatible with Objection.js by adding all necessary methods
dbFunction.queryBuilder = knexInstance.queryBuilder.bind(knexInstance);
dbFunction.raw = knexInstance.raw.bind(knexInstance);

// Explicitly bind transaction method since it's critical for many operations
dbFunction.transaction = knexInstance.transaction.bind(knexInstance);

// Ensure raw is also available via the builder when used in Objection.js context
dbFunction.knex = function() {
  const builder = {
    queryBuilder: knexInstance.queryBuilder.bind(knexInstance),
    raw: knexInstance.raw.bind(knexInstance),
    transaction: knexInstance.transaction.bind(knexInstance) // Also add transaction to the builder
  };
  
  // Add all knex methods to the builder
  Object.keys(knexInstance).forEach(key => {
    if (typeof knexInstance[key] === 'function') {
      builder[key] = knexInstance[key].bind(knexInstance);
    }
  });
  
  return builder;
};

// Test the database connection
const testConnection = async () => {
  try {
    // Run a simple query to verify connection
    await knexInstance.raw('SELECT 1+1 AS result');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Setup for both legacy and Objection.js usage
module.exports = dbFunction;
module.exports.db = dbFunction; // For legacy destructuring: const { db } = require('../utils/db');
module.exports.testConnection = testConnection;
module.exports.config = config; 