/**
 * Authentication middleware
 * 
 * This is a placeholder middleware that allows all requests through.
 * In a production environment, this would validate JWT tokens.
 */

const jwt = require('jsonwebtoken');

/**
 * Authenticate user middleware
 * In development mode, this will allow all requests through
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = (req, res, next) => {
  // For now, bypass authentication in development mode
  console.log('Auth middleware: Bypassing authentication in development mode');
  
  // Add a dummy user to the request
  req.user = {
    id: 1,
    username: 'admin',
    role: 'admin'
  };
  
  // Continue to the next middleware
  next();
};

module.exports = {
  authenticateUser
}; 