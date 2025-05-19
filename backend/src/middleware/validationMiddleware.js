/**
 * Validation middleware for API requests
 * Provides consistent validation and error handling across the application
 */

const { ValidationError } = require('./errorHandler');
const validation = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Middleware to validate agent query requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateAgentQuery = (req, res, next) => {
  const result = validation.validateAgentQuery(req.body);
  
  if (!result.success) {
    return next(new ValidationError('Invalid query parameters', result.errors));
  }
  
  next();
};

/**
 * Middleware to validate feedback requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateFeedback = (req, res, next) => {
  const result = validation.validateFeedback(req.body);
  
  if (!result.success) {
    return next(new ValidationError('Invalid feedback data', result.errors));
  }
  
  next();
};

/**
 * Middleware to validate UUID parameters
 * @param {string} paramName - Parameter name to validate
 * @returns {Function} - Express middleware function
 */
const validateUuidParam = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    
    if (!validation.validateUUID(uuid)) {
      return next(new ValidationError(`Invalid UUID format for ${paramName}`));
    }
    
    next();
  };
};

/**
 * Middleware to validate pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePagination = (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  
  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return next(new ValidationError('Invalid limit parameter', ['Limit must be between 1 and 50']));
  }
  
  // Validate offset
  if (isNaN(offset) || offset < 0) {
    return next(new ValidationError('Invalid offset parameter', ['Offset must be a non-negative integer']));
  }
  
  // Add validated values to request
  req.pagination = { limit, offset };
  next();
};

/**
 * Middleware to validate UUID format for context IDs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateContextId = validateUuidParam('contextId');

/**
 * Middleware to validate UUID format for response IDs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateResponseId = (req, res, next) => {
  if (!req.body.responseId) {
    return next(new ValidationError('Response ID is required'));
  }
  
  next();
};

/**
 * Middleware to validate UUID format for proposal IDs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateProposalId = validateUuidParam('proposalId');

module.exports = {
  validateAgentQuery,
  validateFeedback,
  validateContextId,
  validateResponseId,
  validateProposalId,
  validatePagination,
  validateUuidParam
};