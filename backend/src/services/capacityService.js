/**
 * Capacity Service
 * This service is a facade over the standCapacityService for use by the NLP agent.
 * It provides simpler interfaces for querying terminal and stand capacity.
 */
const standCapacityService = require('./standCapacityService');
const db = require('../utils/db');

class CapacityService {
  /**
   * Get terminal capacity data for a specific terminal
   * @param {Object} options - Filter and calculation options
   * @param {string} options.terminal - Terminal code or ID
   * @param {string} options.aircraft_type - Optional aircraft type to filter by
   * @param {string} options.timeRange - Optional time range (start/end dates)
   * @param {boolean} options.includeVisualization - Whether to include visualization data
   * @returns {Promise<Object>} - Terminal capacity data
   */
  async getTerminalCapacity(options = {}) {
    console.log('CapacityService: Delegating to standCapacityService.getTerminalCapacity');
    return standCapacityService.getTerminalCapacity(options);
  }

  /**
   * Get stand capacity data 
   * @param {Object} options - Filter and calculation options
   * @param {Array<number>} [options.standIds] - Stand IDs to include
   * @param {Array<number>} [options.timeSlotIds] - Time slot IDs to include
   * @param {boolean} [options.useDefinedTimeSlots] - Use defined time slots
   * @param {string} [options.date] - Date for calculation
   * @returns {Promise<Object>} Capacity calculation result
   */
  async getStandCapacity(options = {}) {
    console.log('CapacityService: Delegating to standCapacityService.calculateStandCapacity');
    return standCapacityService.calculateStandCapacity(options);
  }

  /**
   * Calculate capacity - main method called by the NLP agent
   * @param {Object} options - Options for capacity calculation
   * @returns {Promise<Object>} - Capacity calculation result
   */
  async calculateCapacity(options) {
    console.log('CapacityService: calculateCapacity called with options:', options);
    
    // If a terminal is specified, return terminal capacity
    if (options.terminal) {
      return this.getTerminalCapacity(options);
    } 
    
    // Otherwise, return stand capacity
    return this.getStandCapacity(options);
  }
}

module.exports = new CapacityService();