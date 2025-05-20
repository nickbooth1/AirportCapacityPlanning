const MaintenanceRequest = require('../models/MaintenanceRequest');
const MaintenanceStatusType = require('../models/MaintenanceStatusType');
const Stand = require('../models/Stand');
const { ValidationError, transaction } = require('objection');
const { raw } = require('objection'); // Import raw
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const AuditService = require('./AuditService');

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
  
  /**
   * Create a new maintenance request
   * @param {Object} requestData - Request data
   * @param {Object} options - Additional options
   * @param {Object} options.user - User creating the request
   * @param {Object} options.request - Express request object
   * @returns {Promise<Object>} - The created request
   */
  async createRequest(requestData, options = {}) {
    const trx = await transaction.start(MaintenanceRequest.knex());
    
    try {
      // Validate dates
      this.validateDates(requestData.start_datetime, requestData.end_datetime);
      
      // Set default status if not provided
      if (!requestData.status_id) {
        requestData.status_id = 1; // Default to 'Requested'
      }
      
      // Verify stand exists and is active
      const stand = await Stand.query(trx).findById(requestData.stand_id);
      if (!stand) {
        await trx.rollback();
        throw new ValidationError({ 
          message: `Stand with ID ${requestData.stand_id} not found`,
          type: 'ValidationError'
        });
      }
      
      if (!stand.is_active) {
        await trx.rollback();
        throw new ValidationError({ 
          message: 'Cannot assign maintenance to an inactive stand',
          type: 'ValidationError'
        });
      }
      
      // Check for date overlap with other maintenance requests
      const overlaps = await this.checkForOverlappingMaintenance(
        requestData.stand_id, 
        requestData.start_datetime, 
        requestData.end_datetime,
        null,
        trx
      );
      
      if (overlaps.length > 0) {
        await trx.rollback();
        const conflictMessage = overlaps.map(o => 
          `ID: ${o.id}, Title: ${o.title}, Period: ${new Date(o.start_datetime).toLocaleDateString()} - ${new Date(o.end_datetime).toLocaleDateString()}`
        ).join('; ');
        
        throw new ConflictError(`Maintenance period overlaps with existing requests: ${conflictMessage}`);
      }
      
      // Set timestamps
      const now = new Date().toISOString();
      requestData.created_at = now;
      requestData.updated_at = now;
      
      // Create the request
      const newRequest = await MaintenanceRequest.query(trx).insert(requestData);
      
      // Create audit log
      await AuditService.logChange({
        entityType: 'maintenance_request',
        entityId: newRequest.id,
        action: 'create',
        previousState: null,
        newState: newRequest,
        user: options.user,
        request: options.request,
        transaction: trx
      });
      
      // Commit transaction
      await trx.commit();
      
      // Return created request with relations
      return await MaintenanceRequest.query()
        .findById(newRequest.id)
        .withGraphFetched('[stand, status]');
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
      // Log the error
      logger.error(`Error creating maintenance request: ${error.message}`, { error });
      
      // Rethrow the error
      throw error;
    }
  }
  
  /**
   * Update a maintenance request
   * @param {string} id - Request ID
   * @param {Object} requestData - Updated request data
   * @param {Object} options - Additional options
   * @param {Object} options.user - User performing the update
   * @param {Object} options.request - Express request object
   * @param {string} options.modifiedAt - Last modified timestamp for concurrency check
   * @returns {Promise<Object>} - The updated request
   */
  async updateRequest(id, requestData, options = {}) {
    const trx = await transaction.start(MaintenanceRequest.knex());
    
    try {
      // Get existing request with related data
      const existingRequest = await MaintenanceRequest.query(trx)
        .findById(id)
        .withGraphFetched('[stand, status]');
        
      if (!existingRequest) {
        await trx.rollback();
        throw new NotFoundError('Maintenance request not found');
      }
      
      // Optimistic concurrency control if modifiedAt is provided
      if (options.modifiedAt && existingRequest.updated_at && 
          new Date(options.modifiedAt).getTime() !== new Date(existingRequest.updated_at).getTime()) {
        await trx.rollback();
        throw new ConflictError('Request has been modified by another user. Please refresh and try again.');
      }
      
      // Verify stand exists if changing stand
      if (requestData.stand_id && requestData.stand_id !== existingRequest.stand_id) {
        const stand = await Stand.query(trx).findById(requestData.stand_id);
        if (!stand) {
          await trx.rollback();
          throw new ValidationError({ message: `Stand with ID ${requestData.stand_id} not found` });
        }
        
        // Check if stand is active
        if (!stand.is_active) {
          await trx.rollback();
          throw new ValidationError({ message: 'Cannot assign maintenance to an inactive stand' });
        }
      }
      
      // Validate dates
      const startDate = requestData.start_datetime || existingRequest.start_datetime;
      const endDate = requestData.end_datetime || existingRequest.end_datetime;
      this.validateDates(startDate, endDate);
      
      // Check for date overlap with other maintenance requests for the same stand
      if (requestData.start_datetime || requestData.end_datetime) {
        const standId = requestData.stand_id || existingRequest.stand_id;
        const overlaps = await this.checkForOverlappingMaintenance(
          standId, 
          startDate, 
          endDate, 
          id, // exclude current request
          trx
        );
        
        if (overlaps.length > 0) {
          await trx.rollback();
          const conflictMessage = overlaps.map(o => 
            `ID: ${o.id}, Title: ${o.title}, Period: ${new Date(o.start_datetime).toLocaleDateString()} - ${new Date(o.end_datetime).toLocaleDateString()}`
          ).join('; ');
          
          throw new ConflictError(`Maintenance period overlaps with existing requests: ${conflictMessage}`);
        }
      }
      
      // Status transition validation - if changing status
      if (requestData.status_id && requestData.status_id !== existingRequest.status_id) {
        // Define allowed transitions
        const allowedTransitions = {
          1: [2, 3, 6],     // Requested -> Approved, Rejected, Cancelled
          2: [4, 6],        // Approved -> In Progress, Cancelled
          3: [1],           // Rejected -> Requested (resubmit)
          4: [5, 6],        // In Progress -> Completed, Cancelled
          5: [],            // Completed -> (no further transitions)
          6: [1]            // Cancelled -> Requested (resubmit)
        };
        
        if (!allowedTransitions[existingRequest.status_id] || 
            !allowedTransitions[existingRequest.status_id].includes(Number(requestData.status_id))) {
          await trx.rollback();
          throw new ValidationError({ 
            message: `Invalid status transition from ${existingRequest.status.name} to status ID ${requestData.status_id}`,
            type: 'ValidationError'
          });
        }
      }
      
      // Save the previous state for audit log
      const previousState = { ...existingRequest };
      
      // Update the request
      const updatedRequest = await MaintenanceRequest.query(trx)
        .patchAndFetchById(id, {
          ...requestData,
          updated_at: new Date().toISOString()
        });
      
      // Create audit log
      await AuditService.logChange({
        entityType: 'maintenance_request',
        entityId: id,
        action: 'update',
        previousState,
        newState: updatedRequest,
        user: options.user,
        request: options.request,
        transaction: trx
      });
      
      // Commit transaction
      await trx.commit();
      
      // Return updated request with relations
      return await MaintenanceRequest.query()
        .findById(id)
        .withGraphFetched('[stand, status, approvals]');
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
      // Log the error
      logger.error(`Error updating maintenance request ${id}: ${error.message}`, { error });
      
      // Rethrow the error
      throw error;
    }
  }
  
  /**
   * Check for overlapping maintenance on a stand
   * @param {number} standId - Stand ID
   * @param {string} startDate - Start date/time
   * @param {string} endDate - End date/time
   * @param {string} excludeRequestId - Request ID to exclude from check
   * @param {Object} trx - Transaction object
   * @returns {Promise<Array>} - Array of overlapping requests
   */
  async checkForOverlappingMaintenance(standId, startDate, endDate, excludeRequestId = null, trx = null) {
    let query = MaintenanceRequest.query(trx)
      .where('stand_id', standId)
      .where(builder => {
        // Overlapping period logic: 
        // New request starts before existing ends AND new request ends after existing starts
        builder
          .where('start_datetime', '<=', endDate)
          .where('end_datetime', '>=', startDate);
      })
      // Only consider active maintenance (requested, approved, in progress)
      .whereIn('status_id', [1, 2, 4]);
    
    // Exclude the current request if updating
    if (excludeRequestId) {
      query = query.whereNot('id', excludeRequestId);
    }
    
    return await query;
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