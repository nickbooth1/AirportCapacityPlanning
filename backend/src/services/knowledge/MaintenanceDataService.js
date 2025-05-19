/**
 * Maintenance Data Service
 * 
 * This service provides data access methods for maintenance information, including:
 * - Fetching maintenance requests with various filtering options
 * - Finding maintenance by ID, status, or other attributes
 * - Managing recurring maintenance schedules
 * - Aggregating maintenance statistics
 * 
 * It serves as a knowledge base integration layer that can be used by the Agent services.
 */

const MaintenanceRequest = require('../../models/MaintenanceRequest');
const MaintenanceStatusType = require('../../models/MaintenanceStatusType');
const MaintenanceApproval = require('../../models/MaintenanceApproval');
const RecurringMaintenanceSchedule = require('../../models/RecurringMaintenanceSchedule');
const Stand = require('../../models/Stand');
const { transaction } = require('objection');
const { DateTime } = require('luxon');

class MaintenanceDataService {
  /**
   * Get maintenance requests with various filtering options
   * 
   * @param {Object} filters - Optional filters
   * @param {number} filters.standId - Filter by stand ID
   * @param {number} filters.statusId - Filter by status ID
   * @param {string} filters.priority - Filter by priority
   * @param {Date} filters.startDate - Filter by start date (after or equal)
   * @param {Date} filters.endDate - Filter by end date (before or equal)
   * @param {string} filters.requestorEmail - Filter by requestor email
   * @param {string} filters.searchQuery - Search in title and description
   * @param {boolean} filters.includeInactive - Whether to include inactive statuses
   * @param {number} limit - Max number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Object>} - Maintenance requests and total count
   */
  async getMaintenanceRequests(filters = {}, limit = 50, offset = 0) {
    try {
      let query = MaintenanceRequest.query()
        .withGraphFetched('[stand.pier.terminal, status, approvals]');
      
      // Apply filters
      if (filters.standId) {
        query = query.where('stand_id', filters.standId);
      }
      
      if (filters.statusId) {
        query = query.where('status_id', filters.statusId);
      }
      
      if (filters.priority) {
        query = query.where('priority', filters.priority);
      }
      
      if (filters.startDate) {
        query = query.where('start_datetime', '>=', new Date(filters.startDate).toISOString());
      }
      
      if (filters.endDate) {
        query = query.where('end_datetime', '<=', new Date(filters.endDate).toISOString());
      }
      
      if (filters.requestorEmail) {
        query = query.where('requestor_email', filters.requestorEmail);
      }
      
      if (filters.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.where(builder => {
          builder.where('title', 'like', searchTerm)
                .orWhere('description', 'like', searchTerm);
        });
      }
      
      // By default, exclude inactive statuses unless explicitly included
      if (!filters.includeInactive) {
        // Join with status table to filter out inactive statuses
        query = query.joinRelated('status')
                     .where('status.is_active', true);
      }
      
      // Clone the query for counting total results
      const countQuery = query.clone();
      
      // Apply pagination
      query = query.orderBy('start_datetime', 'desc')
                 .limit(limit)
                 .offset(offset);
      
      // Execute both queries
      const [maintenanceRequests, countResult] = await Promise.all([
        query,
        countQuery.count('* as count').first()
      ]);
      
      return {
        maintenanceRequests,
        totalCount: parseInt(countResult.count)
      };
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      throw new Error(`Failed to fetch maintenance requests: ${error.message}`);
    }
  }
  
  /**
   * Get a maintenance request by ID
   * 
   * @param {string} requestId - The maintenance request ID
   * @param {boolean} withRelations - Whether to fetch related data
   * @returns {Promise<Object>} - The maintenance request
   */
  async getMaintenanceRequestById(requestId, withRelations = true) {
    try {
      let query = MaintenanceRequest.query().findById(requestId);
      
      if (withRelations) {
        query = query.withGraphFetched('[stand.pier.terminal, status, approvals.approver]');
      }
      
      const request = await query;
      
      if (!request) {
        throw new Error(`Maintenance request with ID ${requestId} not found`);
      }
      
      return request;
    } catch (error) {
      console.error(`Error fetching maintenance request with ID ${requestId}:`, error);
      throw new Error(`Failed to fetch maintenance request: ${error.message}`);
    }
  }
  
  /**
   * Get recurring maintenance schedules
   * 
   * @param {Object} filters - Optional filters
   * @param {number} filters.standId - Filter by stand ID
   * @param {boolean} filters.isActive - Filter by active status
   * @returns {Promise<Array>} - Recurring maintenance schedules
   */
  async getRecurringMaintenanceSchedules(filters = {}) {
    try {
      let query = RecurringMaintenanceSchedule.query()
        .withGraphFetched('[stand.pier.terminal, createdBy]');
      
      if (filters.standId) {
        query = query.where('stand_id', filters.standId);
      }
      
      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching recurring maintenance schedules:', error);
      throw new Error(`Failed to fetch recurring maintenance schedules: ${error.message}`);
    }
  }
  
  /**
   * Get a recurring maintenance schedule by ID
   * 
   * @param {string} scheduleId - The schedule ID
   * @returns {Promise<Object>} - The recurring maintenance schedule
   */
  async getRecurringMaintenanceScheduleById(scheduleId) {
    try {
      const schedule = await RecurringMaintenanceSchedule.query()
        .findById(scheduleId)
        .withGraphFetched('[stand.pier.terminal, createdBy]');
      
      if (!schedule) {
        throw new Error(`Recurring maintenance schedule with ID ${scheduleId} not found`);
      }
      
      return schedule;
    } catch (error) {
      console.error(`Error fetching recurring maintenance schedule with ID ${scheduleId}:`, error);
      throw new Error(`Failed to fetch recurring maintenance schedule: ${error.message}`);
    }
  }
  
  /**
   * Get maintenance status types
   * 
   * @param {boolean} includeInactive - Whether to include inactive status types
   * @returns {Promise<Array>} - Maintenance status types
   */
  async getMaintenanceStatusTypes(includeInactive = false) {
    try {
      let query = MaintenanceStatusType.query();
      
      if (!includeInactive) {
        query = query.where('is_active', true);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching maintenance status types:', error);
      throw new Error(`Failed to fetch maintenance status types: ${error.message}`);
    }
  }
  
  /**
   * Get upcoming maintenance events
   * 
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date (defaults to current date)
   * @param {Date} options.endDate - End date (defaults to 30 days from start)
   * @param {Array<number>} options.standIds - Filter by stand IDs
   * @param {Array<number>} options.terminalIds - Filter by terminal IDs
   * @param {Array<number>} options.pierIds - Filter by pier IDs
   * @param {Array<string>} options.priorities - Filter by priorities
   * @returns {Promise<Array>} - Upcoming maintenance events
   */
  async getUpcomingMaintenanceEvents(options = {}) {
    try {
      // Set default dates if not provided
      const startDate = options.startDate || new Date();
      let endDate = options.endDate;
      if (!endDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30); // Default to 30 days ahead
      }
      
      // Convert dates to ISO strings
      const startDateStr = new Date(startDate).toISOString();
      const endDateStr = new Date(endDate).toISOString();
      
      // Start building the query
      let query = MaintenanceRequest.query()
        .where(builder => {
          // Maintenance that starts during the period
          builder.where('start_datetime', '>=', startDateStr)
                .where('start_datetime', '<=', endDateStr);
        })
        .orWhere(builder => {
          // Maintenance that is ongoing during the period
          builder.where('start_datetime', '<', startDateStr)
                .where('end_datetime', '>', startDateStr);
        })
        .withGraphFetched('[stand.pier.terminal, status]');
      
      // Apply stand filters if provided
      if (options.standIds && options.standIds.length > 0) {
        query = query.whereIn('stand_id', options.standIds);
      }
      
      // Apply priority filters if provided
      if (options.priorities && options.priorities.length > 0) {
        query = query.whereIn('priority', options.priorities);
      }
      
      // Apply terminal or pier filters if provided
      if ((options.terminalIds && options.terminalIds.length > 0) ||
          (options.pierIds && options.pierIds.length > 0)) {
        
        query = query.joinRelated('stand.pier');
        
        if (options.pierIds && options.pierIds.length > 0) {
          query = query.whereIn('stand:pier.id', options.pierIds);
        }
        
        if (options.terminalIds && options.terminalIds.length > 0) {
          query = query.whereIn('stand:pier.terminal_id', options.terminalIds);
        }
      }
      
      // Execute the query
      const events = await query.orderBy('start_datetime', 'asc');
      
      return events;
    } catch (error) {
      console.error('Error fetching upcoming maintenance events:', error);
      throw new Error(`Failed to fetch upcoming maintenance events: ${error.message}`);
    }
  }
  
  /**
   * Get maintenance statistics
   * 
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for statistics (defaults to 30 days ago)
   * @param {Date} options.endDate - End date for statistics (defaults to current date)
   * @returns {Promise<Object>} - Maintenance statistics
   */
  async getMaintenanceStatistics(options = {}) {
    try {
      const endDate = options.endDate || new Date();
      const startDate = options.startDate || new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days ago
      
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      // Get total count of maintenance requests in period
      const totalCount = await MaintenanceRequest.query()
        .where('start_datetime', '>=', startDateStr)
        .where('start_datetime', '<=', endDateStr)
        .count('* as count')
        .first();
      
      // Get count by status
      const countByStatus = await MaintenanceRequest.query()
        .select('status_id')
        .where('start_datetime', '>=', startDateStr)
        .where('start_datetime', '<=', endDateStr)
        .count('* as count')
        .groupBy('status_id')
        .withGraphFetched('status');
      
      // Get count by priority
      const countByPriority = await MaintenanceRequest.query()
        .select('priority')
        .where('start_datetime', '>=', startDateStr)
        .where('start_datetime', '<=', endDateStr)
        .count('* as count')
        .groupBy('priority');
      
      // Get count by month
      const countByMonth = await MaintenanceRequest.query()
        .select(MaintenanceRequest.raw('DATE_TRUNC(\'month\', start_datetime) as month'))
        .where('start_datetime', '>=', startDateStr)
        .where('start_datetime', '<=', endDateStr)
        .count('* as count')
        .groupBy('month')
        .orderBy('month');
      
      // Get average duration in days
      const avgDuration = await MaintenanceRequest.query()
        .select(
          MaintenanceRequest.raw('AVG(EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 86400) as avg_days')
        )
        .where('start_datetime', '>=', startDateStr)
        .where('start_datetime', '<=', endDateStr)
        .first();
      
      return {
        totalCount: parseInt(totalCount.count),
        countByStatus: countByStatus.reduce((acc, item) => {
          const statusName = item.status ? item.status.name : `Status ${item.status_id}`;
          acc[statusName] = parseInt(item.count);
          return acc;
        }, {}),
        countByPriority: countByPriority.reduce((acc, item) => {
          acc[item.priority || 'unspecified'] = parseInt(item.count);
          return acc;
        }, {}),
        countByMonth: countByMonth.reduce((acc, item) => {
          const monthStr = item.month.toISOString().split('T')[0].substring(0, 7); // Format as YYYY-MM
          acc[monthStr] = parseInt(item.count);
          return acc;
        }, {}),
        averageDurationDays: parseFloat(avgDuration.avg_days || 0).toFixed(1)
      };
    } catch (error) {
      console.error('Error fetching maintenance statistics:', error);
      throw new Error(`Failed to fetch maintenance statistics: ${error.message}`);
    }
  }
  
  /**
   * Get overlapping maintenance requests for a period
   * 
   * @param {Date} startDate - Start date of the period
   * @param {Date} endDate - End date of the period
   * @param {number} standId - Optional stand ID to filter by
   * @returns {Promise<Array>} - Overlapping maintenance requests
   */
  async getOverlappingMaintenanceRequests(startDate, endDate, standId = null) {
    try {
      const startDateStr = new Date(startDate).toISOString();
      const endDateStr = new Date(endDate).toISOString();
      
      let query = MaintenanceRequest.query()
        .where(builder => {
          // Requests that start during our period
          builder.where('start_datetime', '>=', startDateStr)
                .where('start_datetime', '<', endDateStr);
        })
        .orWhere(builder => {
          // Requests that end during our period
          builder.where('end_datetime', '>', startDateStr)
                .where('end_datetime', '<=', endDateStr);
        })
        .orWhere(builder => {
          // Requests that span our entire period
          builder.where('start_datetime', '<=', startDateStr)
                .where('end_datetime', '>=', endDateStr);
        })
        .withGraphFetched('[stand.pier.terminal, status]');
      
      // Filter by stand ID if provided
      if (standId) {
        query = query.where('stand_id', standId);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching overlapping maintenance requests:', error);
      throw new Error(`Failed to fetch overlapping maintenance requests: ${error.message}`);
    }
  }
}

module.exports = new MaintenanceDataService();