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
      console.log(`Fetching maintenance requests from ${startDate} to ${endDate}`);
      
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
      console.log(`Found ${requests.length} maintenance requests`);
      if (requests.length > 0) {
        console.log('First request:', requests[0]);
      }
      
      // Get stand codes for any maintenance requests that don't have them
      const standIds = requests
        .filter(req => !req.stand_code && req.stand_id)
        .map(req => req.stand_id);
      
      let standsMap = new Map();
      if (standIds.length > 0) {
        const stands = await db.select('id', 'code').from('stands').whereIn('id', standIds);
        stands.forEach(stand => {
          standsMap.set(stand.id, stand.code);
        });
      }
      
      // Format for consistency with expected structure in analyzer
      const formattedRequests = requests.map(req => {
        // Find stand code by first checking the joined stand code or falling back to stand_id
        let standCode = req.stand_code;
        if (!standCode && req.stand_id) {
          standCode = standsMap.get(req.stand_id);
        }
        
        return {
          id: req.id,
          stand_id_or_code: standCode || `stand_${req.stand_id}`, // Ensure we have a valid string
          title: req.title,
          description: req.description,
          status_id: req.status_id,
          statusName: req.statusName,
          start_datetime: req.start_datetime,
          end_datetime: req.end_datetime
        };
      });
      
      console.log('Formatted first request:', formattedRequests.length > 0 ? formattedRequests[0] : 'No requests found');
      
      return formattedRequests;
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
      
      // Get stand code if not already available
      let standCode = request.stand_code;
      if (!standCode && request.stand_id) {
        const stand = await db.select('code').from('stands').where('id', request.stand_id).first();
        if (stand) {
          standCode = stand.code;
        }
      }
      
      return {
        id: request.id,
        stand_id_or_code: standCode || `stand_${request.stand_id}`,
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