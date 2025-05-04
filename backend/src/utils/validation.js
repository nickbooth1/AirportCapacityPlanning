/**
 * Utility functions for data validation
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

module.exports = {
  validateStandId,
  validateStandConstraintId,
  validateAircraftTypeId
}; 