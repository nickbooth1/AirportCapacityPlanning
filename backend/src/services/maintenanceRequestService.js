const MaintenanceRequest = require('../models/MaintenanceRequest');
const MaintenanceStatusType = require('../models/MaintenanceStatusType');
const { ValidationError } = require('objection');
const { raw } = require('objection'); // Import raw

class MaintenanceRequestService {
  async getAllRequests(filters = {}) {
    let query = MaintenanceRequest.query()
      .withGraphFetched('[stand(selectName), status(selectName)]');
    
    // Apply filters
    if (filters.standId) {
      query = query.where('stand_id', filters.standId);
    }
    
    // Filter by multiple stand IDs
    if (filters.standIds && Array.isArray(filters.standIds)) {
      query = query.whereIn('stand_id', filters.standIds);
    }
    
    // Status filtering with support for multiple statuses
    if (filters.status) {
      // Handle status as a single value or array
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status_id', filters.status);
      } else {
        query = query.where('status_id', filters.status);
      }
    }
    
    // Date filtering - find any maintenance that overlaps with the date range
    if (filters.startDate && filters.endDate) {
      // Request starts before range end AND ends after range start
      query = query.where('start_datetime', '<=', filters.endDate)
                  .where('end_datetime', '>=', filters.startDate);
    } else {
      // Legacy filtering if only one date is provided
      if (filters.startDate) {
        query = query.where('start_datetime', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('end_datetime', '<=', filters.endDate);
      }
    }
    
    // Priority filtering (can be a single value or array)
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.whereIn('priority', filters.priority);
      } else {
        query = query.where('priority', filters.priority);
      }
    }
    
    // Search by title or description
    if (filters.search) {
      query = query.where(builder => {
        builder.where('title', 'like', `%${filters.search}%`)
               .orWhere('description', 'like', `%${filters.search}%`);
      });
    }
    
    // Filter by requestor
    if (filters.requestor) {
      query = query.where('requestor_name', 'like', `%${filters.requestor}%`);
    }
    
    // Filter by department
    if (filters.department) {
      query = query.where('requestor_department', filters.department);
    }
    
    // Apply pagination
    if (filters.limit !== undefined && filters.offset !== undefined) {
      query = query.limit(filters.limit).offset(filters.offset);
    }
    
    // Apply sorting
    const orderBy = filters.orderBy || 'start_datetime';
    const order = filters.order === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(orderBy, order);
    
    return await query;
  }
  
  /**
   * Get count of maintenance requests with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} - Count of matching maintenance requests
   */
  async getRequestCount(filters = {}) {
    let query = MaintenanceRequest.query();
    
    // Apply the same filters as getAllRequests
    if (filters.standId) {
      query = query.where('stand_id', filters.standId);
    }
    
    // Filter by multiple stand IDs
    if (filters.standIds && Array.isArray(filters.standIds)) {
      query = query.whereIn('stand_id', filters.standIds);
    }
    
    // Status filtering with support for multiple statuses
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status_id', filters.status);
      } else {
        query = query.where('status_id', filters.status);
      }
    }
    
    // Date filtering
    if (filters.startDate && filters.endDate) {
      query = query.where('start_datetime', '<=', filters.endDate)
                  .where('end_datetime', '>=', filters.startDate);
    } else {
      if (filters.startDate) {
        query = query.where('start_datetime', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('end_datetime', '<=', filters.endDate);
      }
    }
    
    // Priority filtering
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.whereIn('priority', filters.priority);
      } else {
        query = query.where('priority', filters.priority);
      }
    }
    
    // Search by title or description
    if (filters.search) {
      query = query.where(builder => {
        builder.where('title', 'like', `%${filters.search}%`)
               .orWhere('description', 'like', `%${filters.search}%`);
      });
    }
    
    // Filter by requestor
    if (filters.requestor) {
      query = query.where('requestor_name', 'like', `%${filters.requestor}%`);
    }
    
    // Filter by department
    if (filters.department) {
      query = query.where('requestor_department', filters.department);
    }
    
    const result = await query.count('id as count').first();
    return parseInt(result.count, 10);
  }
  
  async getRequestById(id) {
    return await MaintenanceRequest.query()
      .findById(id)
      .withGraphFetched('[stand, status, approvals]');
  }
  
  async getRequestsByStand(standId) {
    return await MaintenanceRequest.query()
      .where('stand_id', standId)
      .withGraphFetched('[status, approvals]')
      .orderBy('start_datetime', 'asc');
  }
  
  async createRequest(requestData) {
    this.validateDates(requestData.start_datetime, requestData.end_datetime);
    if (!requestData.status_id) {
      requestData.status_id = 1; // Default to 'Requested'
    }
    return await MaintenanceRequest.query().insert(requestData);
  }
  
  async updateRequest(id, requestData) {
    const existingRequest = await MaintenanceRequest.query().findById(id);
    if (!existingRequest) {
      throw new ValidationError({ type: 'NotFound', message: 'Request not found' });
    }
    
    const startDate = requestData.start_datetime || existingRequest.start_datetime;
    const endDate = requestData.end_datetime || existingRequest.end_datetime;
    this.validateDates(startDate, endDate);
    
    return await MaintenanceRequest.query().patchAndFetchById(id, requestData);
  }
  
  validateDates(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError({ message: 'Invalid date format', type: 'ValidationError' });
    }
    if (start >= end) {
      throw new ValidationError({ message: 'Start date must be before end date', type: 'ValidationError' });
    }
  }
  
  async getAllStatusTypes() {
    return await MaintenanceStatusType.query().orderBy('id');
  }

  // Added for Calendar View
  async getCalendarData(filters = {}) {
    let query = MaintenanceRequest.query()
      .withGraphFetched('[stand(selectName), status(selectName)]');

    // Filter by date range (required for calendar)
    if (!filters.startDate || !filters.endDate) {
        throw new ValidationError({ message: 'startDate and endDate are required for calendar data', type: 'ValidationError' });
    }
    query = query.where('start_datetime', '<=', filters.endDate)
                 .where('end_datetime', '>=', filters.startDate);

    // Apply optional filters
    if (filters.standId) {
      query = query.where('stand_id', filters.standId);
    }
    if (filters.statusId) {
      query = query.where('status_id', filters.statusId);
    }
    if (filters.terminalId) {
      // We can't filter by terminal_id since there's no terminal relation
      // This filter will be ignored
    }

    const requests = await query;

    // Transform to FullCalendar event format
    return requests.map(request => {
      let color;
      switch (request.status?.name) {
        case 'Requested': color = '#FFC107'; break; // amber
        case 'Approved': color = '#4CAF50'; break; // green
        case 'Rejected': color = '#F44336'; break; // red
        case 'In Progress': color = '#2196F3'; break; // blue
        case 'Completed': color = '#9E9E9E'; break; // grey
        case 'Cancelled': color = '#9C27B0'; break; // purple
        default: color = '#607D8B'; // blue grey
      }

      return {
        id: request.id,
        title: `${request.stand?.name || 'Stand'}: ${request.title}`,
        start: request.start_datetime,
        end: request.end_datetime,
        color,
        extendedProps: {
          standId: request.stand_id,
          standName: request.stand?.name,
          // Remove terminalName and pierName since they don't exist in our model
          status: request.status?.name,
          requestor: request.requestor_name,
          priority: request.priority,
          description: request.description
        }
      };
    });
  }
}

module.exports = new MaintenanceRequestService(); 