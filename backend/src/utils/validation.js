/**
 * Utility functions for data validation and error handling
 * Provides validation functions for various entity types and API request validation
 */

/**
 * Validates a stand ID
 * @param {string|number} id - The stand ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const validateStandId = (id) => {
  if (id === undefined || id === null) return false;
  
  // Convert to number if it's a string
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  // Check if it's a positive integer
  return Number.isInteger(numId) && numId > 0;
};

/**
 * Validates a stand constraint ID
 * @param {string|number} id - The stand constraint ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const validateStandConstraintId = (id) => {
  if (id === undefined || id === null) return false;
  
  // Convert to number if it's a string
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  // Check if it's a positive integer
  return Number.isInteger(numId) && numId > 0;
};

/**
 * Validates an aircraft type ID
 * @param {string|number} id - The aircraft type ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const validateAircraftTypeId = (id) => {
  if (id === undefined || id === null) return false;
  
  // Convert to number if it's a string
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  // Check if it's a positive integer
  return Number.isInteger(numId) && numId > 0;
};

/**
 * Validates a UUID string
 * @param {string} uuid - The UUID to validate
 * @returns {boolean} - Whether the UUID is valid
 */
const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  
  // Regular expression for UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validates an agent query
 * @param {Object} query - The query object to validate
 * @returns {Object} - Validation result with success flag and error message
 */
const validateAgentQuery = (query) => {
  const result = { success: true, errors: [] };
  
  // Validate query text
  if (!query.query || typeof query.query !== 'string' || query.query.trim() === '') {
    result.success = false;
    result.errors.push('Query text is required');
  } else if (query.query.length > 2000) {
    result.success = false;
    result.errors.push('Query text must be less than 2000 characters');
  }
  
  // Validate contextId if provided
  if (query.contextId !== undefined && query.contextId !== null && !validateUUID(query.contextId)) {
    result.success = false;
    result.errors.push('Context ID must be a valid UUID');
  }
  
  return result;
};

/**
 * Validates feedback data
 * @param {Object} feedback - The feedback data to validate
 * @returns {Object} - Validation result with success flag and error message
 */
const validateFeedback = (feedback) => {
  const result = { success: true, errors: [] };
  
  // Validate responseId
  if (!feedback.responseId) {
    result.success = false;
    result.errors.push('Response ID is required');
  }
  
  // Validate rating
  if (feedback.rating === undefined || feedback.rating === null) {
    result.success = false;
    result.errors.push('Rating is required');
  } else {
    const rating = parseInt(feedback.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      result.success = false;
      result.errors.push('Rating must be between 1 and 5');
    }
  }
  
  // Validate comment if provided
  if (feedback.comment && typeof feedback.comment === 'string' && feedback.comment.length > 1000) {
    result.success = false;
    result.errors.push('Comment must be less than 1000 characters');
  }
  
  return result;
};

/**
 * Helper function to handle API errors consistently
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default error message
 * @returns {Object} - Formatted error response
 */
const formatApiError = (error, defaultMessage = 'An unexpected error occurred') => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    success: false,
    error: error.message || defaultMessage,
    errorId,
    ...(isDev && {
      stack: error.stack,
      details: error.details || undefined
    })
  };
};

module.exports = {
  validateStandId,
  validateStandConstraintId,
  validateAircraftTypeId,
  validateUUID,
  validateAgentQuery,
  validateFeedback,
  formatApiError
}; 