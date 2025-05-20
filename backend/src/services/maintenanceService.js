/**
 * Maintenance Service
 * This service is a facade over the individual maintenance services for use by the NLP agent.
 * It provides simpler interfaces for querying maintenance data.
 */
const maintenanceRequestService = require('./maintenanceRequestService');
const logger = require('../utils/logger');

class MaintenanceService {
  /**
   * Get scheduled maintenance requests
   * @param {Object} options - Filter options
   * @param {string} options.stand - Optional stand code or ID to filter by
   * @param {string} options.terminal - Optional terminal code or ID to filter by
   * @param {Object} options.timeRange - Optional time range to filter by
   * @param {string} options.status - Optional status filter
   * @returns {Promise<Object>} - Scheduled maintenance data
   */
  async getScheduledMaintenance(options = {}) {
    logger.info('MaintenanceService: Delegating to maintenanceRequestService.getScheduledMaintenance');
    return maintenanceRequestService.getScheduledMaintenance(options);
  }

  /**
   * Get active maintenance (in progress)
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} - Active maintenance data
   */
  async getActiveMaintenance(options = {}) {
    logger.info('MaintenanceService: Delegating to maintenanceRequestService.getActiveMaintenance');
    
    // Set status to "In Progress" to get active maintenance
    const newOptions = {
      ...options,
      status: 'In Progress'
    };
    
    return maintenanceRequestService.getScheduledMaintenance(newOptions);
  }

  /**
   * Create a new maintenance request
   * @param {Object} requestData - Request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The created request
   */
  async createMaintenanceRequest(requestData, options = {}) {
    logger.info('MaintenanceService: Delegating to maintenanceRequestService.createRequest');
    return maintenanceRequestService.createRequest(requestData, options);
  }

  /**
   * Update a maintenance request
   * @param {string} id - Request ID
   * @param {Object} requestData - Updated request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The updated request
   */
  async updateMaintenanceRequest(id, requestData, options = {}) {
    logger.info('MaintenanceService: Delegating to maintenanceRequestService.updateRequest');
    return maintenanceRequestService.updateRequest(id, requestData, options);
  }

  /**
   * Get all status types
   * @returns {Promise<Array>} - Array of status types
   */
  async getMaintenanceStatusTypes() {
    logger.info('MaintenanceService: Delegating to maintenanceRequestService.getAllStatusTypes');
    return maintenanceRequestService.getAllStatusTypes();
  }
}

module.exports = new MaintenanceService();