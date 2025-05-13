/**
 * MaintenanceRequestService
 * Service to handle maintenance request data
 */

const db = require('../../utils/db');

class MaintenanceRequestService {
  /**
   * Get all maintenance requests within a date range and status
   * @param {Object} options - Search options
   * @param {string} options.startDate - Start date (YYYY-MM-DD)
   * @param {string} options.endDate - End date (YYYY-MM-DD)
   * @param {number[]} options.statusIds - Array of status IDs to filter by
   * @returns {Promise<Array>} Maintenance requests matching criteria
   */
  async getAllRequests({ startDate, endDate, statusIds = [] }) {
    try {
      let query = db.select(
        'mr.*',
        'mst.name as statusName',
        's.code as stand_code'
      )
      .from('maintenance_requests as mr')
      .leftJoin('maintenance_status_types as mst', 'mr.status_id', 'mst.id')
      .leftJoin('stands as s', 'mr.stand_id', 's.id')
      .whereRaw('mr.end_datetime >= ?', [startDate])
      .whereRaw('mr.start_datetime <= ?', [endDate]);
      
      // Filter by status IDs if provided
      if (statusIds && statusIds.length > 0) {
        query = query.whereIn('mr.status_id', statusIds);
      }
      
      // Order by start date and then stand
      query = query.orderBy([
        { column: 'mr.start_datetime', order: 'asc' },
        { column: 'mr.stand_id', order: 'asc' }
      ]);
      
      const requests = await query;
      
      // Format for consistency with expected structure in analyzer
      return requests.map(req => ({
        id: req.id,
        stand_id_or_code: req.stand_code || req.stand_id,
        title: req.title,
        description: req.description,
        status_id: req.status_id,
        statusName: req.statusName,
        start_datetime: req.start_datetime,
        end_datetime: req.end_datetime
      }));
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      throw error;
    }
  }
  
  /**
   * Get a single maintenance request by ID
   * @param {string|number} id - Maintenance request ID
   * @returns {Promise<Object>} The maintenance request
   */
  async getRequestById(id) {
    try {
      const request = await db.select(
        'mr.*',
        'mst.name as statusName',
        's.code as stand_code'
      )
      .from('maintenance_requests as mr')
      .leftJoin('maintenance_status_types as mst', 'mr.status_id', 'mst.id')
      .leftJoin('stands as s', 'mr.stand_id', 's.id')
      .where('mr.id', id)
      .first();
      
      if (!request) {
        throw new Error(`Maintenance request with ID ${id} not found`);
      }
      
      return {
        id: request.id,
        stand_id_or_code: request.stand_code || request.stand_id,
        title: request.title,
        description: request.description,
        status_id: request.status_id,
        statusName: request.statusName,
        start_datetime: request.start_datetime,
        end_datetime: request.end_datetime
      };
    } catch (error) {
      console.error(`Error fetching maintenance request ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new maintenance request
   * @param {Object} requestData - The request data to create
   * @returns {Promise<Object>} The created maintenance request
   */
  async createRequest(requestData) {
    // Implementation for creating a request
    // (Not needed for the CLI tool, but included for completeness)
  }
  
  /**
   * Update an existing maintenance request
   * @param {string|number} id - Maintenance request ID
   * @param {Object} requestData - The updated request data
   * @returns {Promise<Object>} The updated maintenance request
   */
  async updateRequest(id, requestData) {
    // Implementation for updating a request
    // (Not needed for the CLI tool, but included for completeness)
  }
}

module.exports = MaintenanceRequestService; 