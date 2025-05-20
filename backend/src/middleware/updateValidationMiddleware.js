/**
 * Update Validation Middleware
 * 
 * This middleware provides validation for update operations, including:
 * - Common validation rules for different entity types
 * - Concurrency control via ETag headers
 * - Input sanitization and type conversion
 */

const { ValidationError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Validate stand update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateStandUpdate = (req, res, next) => {
  try {
    const standData = req.body;
    
    // Check if there's any data to update
    if (!standData || Object.keys(standData).length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'No update data provided'
      });
    }
    
    // Convert string values to appropriate types
    if (standData.pier_id) standData.pier_id = parseInt(standData.pier_id, 10);
    if (standData.is_active !== undefined) {
      standData.is_active = standData.is_active === true || standData.is_active === 'true';
    }
    if (standData.has_jetbridge !== undefined) {
      standData.has_jetbridge = standData.has_jetbridge === true || standData.has_jetbridge === 'true';
    }
    if (standData.max_wingspan_meters) {
      standData.max_wingspan_meters = parseInt(standData.max_wingspan_meters, 10);
    }
    if (standData.max_length_meters) {
      standData.max_length_meters = parseInt(standData.max_length_meters, 10);
    }
    
    // Special validation rules
    if (standData.code && !/^[A-Z0-9]{1,10}$/i.test(standData.code)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Stand code must be 1-10 alphanumeric characters'
      });
    }
    
    if (standData.stand_type && !['contact', 'remote', 'cargo'].includes(standData.stand_type)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: "Stand type must be one of: 'contact', 'remote', 'cargo'"
      });
    }
    
    // Update request body with sanitized data
    req.body = standData;
    
    next();
  } catch (error) {
    logger.error('Stand update validation error:', error);
    next(error);
  }
};

/**
 * Validate maintenance request update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateMaintenanceRequestUpdate = (req, res, next) => {
  try {
    const requestData = req.body;
    
    // Check if there's any data to update
    if (!requestData || Object.keys(requestData).length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'No update data provided'
      });
    }
    
    // Convert values to appropriate types
    if (requestData.stand_id) {
      requestData.stand_id = parseInt(requestData.stand_id, 10);
    }
    
    if (requestData.status_id) {
      requestData.status_id = parseInt(requestData.status_id, 10);
    }
    
    // Validate dates if provided
    if (requestData.start_datetime) {
      const start = new Date(requestData.start_datetime);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Invalid start date format'
        });
      }
    }
    
    if (requestData.end_datetime) {
      const end = new Date(requestData.end_datetime);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Invalid end date format'
        });
      }
    }
    
    // If both dates are provided, validate end is after start
    if (requestData.start_datetime && requestData.end_datetime) {
      const start = new Date(requestData.start_datetime);
      const end = new Date(requestData.end_datetime);
      
      if (start >= end) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'End date must be after start date'
        });
      }
    }
    
    // Validate priority if provided
    if (requestData.priority && !['Low', 'Medium', 'High', 'Critical'].includes(requestData.priority)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: "Priority must be one of: 'Low', 'Medium', 'High', 'Critical'"
      });
    }
    
    // Email validation
    if (requestData.requestor_email && !validateEmail(requestData.requestor_email)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid requestor email format'
      });
    }
    
    // Update request body with sanitized data
    req.body = requestData;
    
    next();
  } catch (error) {
    logger.error('Maintenance request update validation error:', error);
    next(error);
  }
};

/**
 * Middleware for optimistic concurrency control using ETags
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateETagForUpdate = (req, res, next) => {
  // Skip validation if not an update operation
  if (!['PUT', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  const ifMatch = req.headers['if-match'];
  
  // If If-Match header is not provided, proceed without validation
  if (!ifMatch) {
    // For APIs that require strict concurrency, uncomment this block
    /*
    return res.status(428).json({
      error: 'Precondition Required',
      message: 'If-Match header is required for updates'
    });
    */
    return next();
  }
  
  // Validate that If-Match is a valid timestamp
  // The service layer will compare this with the entity's updated_at timestamp
  if (!/^\d+$/.test(ifMatch)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'If-Match header must be a valid timestamp'
    });
  }
  
  next();
};

/**
 * Helper function to validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
function validateEmail(email) {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateStandUpdate,
  validateMaintenanceRequestUpdate,
  validateETagForUpdate
};