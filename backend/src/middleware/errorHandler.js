/**
 * Global error handling middleware
 * Provides consistent error response formatting and logging
 * 
 * Custom error types:
 * - ValidationError: 400 Bad Request (validation failures)
 * - UnauthorizedError: 401 Unauthorized (authentication issues)
 * - ForbiddenError: 403 Forbidden (authorization issues)
 * - NotFoundError: 404 Not Found (resource not found)
 * - ConflictError: 409 Conflict (resource conflict)
 * - RateLimitError: 429 Too Many Requests (rate limit exceeded)
 */
// Import logger
const logger = require('../utils/logger');

/**
 * Custom error classes for common API errors
 */
class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found', resource = null) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.resource = resource;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

/**
 * Global error handling middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Generate a unique error ID for tracking
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Determine status code from error or default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error with context
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](`API Error [${errorId}]: ${message}`, {
    errorId,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    errorName: err.name,
    errorStack: err.stack
  });
  
  // Construct the error response
  const errorResponse = {
    success: false,
    error: message,
    errorId
  };
  
  // Include error details for validation errors
  if (err.name === 'ValidationError' && Array.isArray(err.details)) {
    errorResponse.details = err.details;
  }
  
  // Include retry information for rate limit errors
  if (err.name === 'RateLimitError' && err.retryAfter) {
    errorResponse.retryAfter = err.retryAfter;
    res.set('Retry-After', String(err.retryAfter));
  }
  
  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    if (err.details) errorResponse.details = err.details;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError
}; 