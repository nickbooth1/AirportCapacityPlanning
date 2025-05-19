/**
 * Application Configuration
 * 
 * This module exports the application configuration based on environment variables.
 * It serves as a centralized location for all configuration settings.
 */

require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // Database configuration
  database: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'airport_capacity_planner',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  
  // Upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '200000000'), // 200MB
    tempDir: process.env.TEMP_UPLOAD_DIR || './temp',
    allowedExtensions: ['.csv', '.xlsx', '.xls', '.json'],
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
  },
  
  // WebSocket configuration
  websocket: {
    path: process.env.WS_PATH || '/socket.io',
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // Frontend URL for redirects
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Feature flags
  features: {
    enableAgent: process.env.ENABLE_AGENT === 'true',
    enableWebsocket: process.env.ENABLE_WEBSOCKET === 'true',
  }
};