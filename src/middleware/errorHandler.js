/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error:', err);

  // Set default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(val => val.message);
  }

  // Handle Knex/database errors
  if (err.code) {
    // Postgres unique violation
    if (err.code === '23505') {
      statusCode = 409;
      message = 'Duplicate entry';
    }
    // Postgres foreign key violation
    else if (err.code === '23503') {
      statusCode = 400;
      message = 'Referenced resource does not exist';
    }
  }

  // Return structured error response
  res.status(statusCode).json({
    status: 'error',
    message,
    errors: errors.length ? errors : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = {
  errorHandler,
}; 