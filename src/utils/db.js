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
const db = knex(config);

// Test the database connection
const testConnection = async () => {
  try {
    // Run a simple query to verify connection
    await db.raw('SELECT 1+1 AS result');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

module.exports = {
  db,
  testConnection,
  config,
}; 