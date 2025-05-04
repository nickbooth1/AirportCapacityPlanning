/**
 * Capacity Controller
 * Handles API requests related to stand capacity calculations
 */
const standCapacityService = require('../services/standCapacityService');

/**
 * Calculate airport stand capacity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function calculateCapacity(req, res) {
  try {
    // Get date parameter from query, default to today
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format', 
        message: 'Date must be in YYYY-MM-DD format'
      });
    }
    
    // Call service to calculate capacity
    const capacityData = await standCapacityService.calculateCapacity(date);
    
    return res.status(200).json(capacityData);
  } catch (error) {
    console.error('Error in capacityController.calculateCapacity:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate capacity', 
      message: error.message || 'An unexpected error occurred'
    });
  }
}

/**
 * Get capacity calculation settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCapacitySettings(req, res) {
  try {
    // Get operational settings related to capacity calculation
    const settings = await standCapacityService.fetchOperationalSettings();
    
    // Format the settings for the API response
    const capacitySettings = {
      slot_duration_minutes: settings.slot_duration_minutes,
      slot_block_size: settings.slot_block_size,
      operating_start_time: settings.operating_start_time,
      operating_end_time: settings.operating_end_time,
      default_gap_minutes: settings.default_gap_minutes
    };
    
    return res.status(200).json(capacitySettings);
  } catch (error) {
    console.error('Error in capacityController.getCapacitySettings:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve capacity settings', 
      message: error.message || 'An unexpected error occurred'
    });
  }
}

module.exports = {
  calculateCapacity,
  getCapacitySettings
}; 