const FlightProcessorService = require('../services/FlightProcessorService');

// Create an instance of the service
const flightProcessorService = new FlightProcessorService();

/**
 * Flight Schedule Controller
 * Handles API requests related to flight schedule processing
 */
const FlightScheduleController = {
  /**
   * Process a flight schedule from upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async processFlightSchedule(req, res) {
    try {
      const { uploadId } = req.params;
      const { skipValidation, skipAllocation, allocationSettings } = req.body;
      
      if (!uploadId || isNaN(parseInt(uploadId, 10))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid upload ID provided'
        });
      }
      
      console.log(`Processing flight schedule for upload ID: ${uploadId} with options:`, {
        skipValidation: skipValidation || false,
        skipAllocation: skipAllocation || false
      });
      
      const results = await flightProcessorService.processFlightSchedule(
        parseInt(uploadId, 10),
        {
          skipValidation: skipValidation || false,
          skipAllocation: skipAllocation || false,
          allocationSettings: allocationSettings || {}
        }
      );
      
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error processing flight schedule:', error);
      
      // Truncate error message if it's too long
      let errorMessage = error.message || 'Unknown error occurred';
      if (errorMessage && errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + '...';
      }
      
      // Return a structured error response
      res.status(500).json({
        success: false,
        message: 'Error processing flight schedule',
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      });
    }
  },
  
  /**
   * Get flight schedule by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFlightSchedule(req, res) {
    try {
      const { id } = req.params;
      
      // Get the schedule from the database
      const db = require('../db');
      const schedule = await db('flight_schedules')
        .where('id', id)
        .first();
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error getting flight schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting flight schedule',
        error: error.message
      });
    }
  },
  
  /**
   * List all flight schedules
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async listFlightSchedules(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      // Get schedules from the database
      const db = require('../db');
      let query = db('flight_schedules')
        .select('*')
        .orderBy('created_at', 'desc');
      
      // Apply status filter if provided
      if (status) {
        query = query.where('status', status);
      }
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
      
      // Execute query
      const schedules = await query;
      
      // Get total count
      const countQuery = db('flight_schedules');
      if (status) {
        countQuery.where('status', status);
      }
      const [{ count }] = await countQuery.count('* as count');
      
      res.status(200).json({
        success: true,
        data: schedules,
        meta: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(count, 10),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error listing flight schedules:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing flight schedules',
        error: error.message
      });
    }
  },
  
  /**
   * Get allocations for a flight schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScheduleAllocations(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100, standId, flightNature } = req.query;
      
      // Get the schedule from the database
      const db = require('../db');
      const schedule = await db('flight_schedules')
        .where('id', id)
        .first();
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      // Build query for allocations
      let query = db('stand_allocations')
        .where('schedule_id', id)
        .join('flights', 'stand_allocations.flight_id', 'flights.id')
        .join('stands', 'stand_allocations.stand_id', 'stands.id')
        .select(
          'stand_allocations.*',
          'flights.flight_number',
          'flights.airline_iata',
          'flights.aircraft_type_iata',
          'flights.flight_nature',
          'flights.scheduled_datetime',
          'stands.name as stand_name',
          'stands.terminal'
        )
        .orderBy('scheduled_datetime', 'asc');
      
      // Apply filters
      if (standId) {
        query = query.where('stand_allocations.stand_id', standId);
      }
      
      if (flightNature) {
        query = query.where('flights.flight_nature', flightNature);
      }
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
      
      // Execute query
      const allocations = await query;
      
      // Get total count
      const countQuery = db('stand_allocations')
        .where('schedule_id', id)
        .join('flights', 'stand_allocations.flight_id', 'flights.id');
      
      if (standId) {
        countQuery.where('stand_allocations.stand_id', standId);
      }
      
      if (flightNature) {
        countQuery.where('flights.flight_nature', flightNature);
      }
      
      const [{ count }] = await countQuery.count('* as count');
      
      res.status(200).json({
        success: true,
        data: allocations,
        meta: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(count, 10),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error getting schedule allocations:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting schedule allocations',
        error: error.message
      });
    }
  },
  
  /**
   * Get unallocated flights for a schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUnallocatedFlights(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100 } = req.query;
      
      // Get the schedule from the database
      const db = require('../db');
      const schedule = await db('flight_schedules')
        .where('id', id)
        .first();
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      // Build query for unallocated flights
      let query = db('unallocated_flights')
        .where('schedule_id', id)
        .join('flights', 'unallocated_flights.flight_id', 'flights.id')
        .select(
          'unallocated_flights.*',
          'flights.flight_number',
          'flights.airline_iata',
          'flights.aircraft_type_iata',
          'flights.flight_nature',
          'flights.scheduled_datetime'
        )
        .orderBy('scheduled_datetime', 'asc');
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
      
      // Execute query
      const unallocatedFlights = await query;
      
      // Get total count
      const [{ count }] = await db('unallocated_flights')
        .where('schedule_id', id)
        .count('* as count');
      
      res.status(200).json({
        success: true,
        data: unallocatedFlights,
        meta: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(count, 10),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error getting unallocated flights:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting unallocated flights',
        error: error.message
      });
    }
  },
  
  /**
   * Get utilization metrics for a schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUtilizationMetrics(req, res) {
    try {
      const { id } = req.params;
      const { timePeriod = 'daily', standId, terminal } = req.query;
      
      // Get the schedule from the database
      const db = require('../db');
      const schedule = await db('flight_schedules')
        .where('id', id)
        .first();
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      // Build query for metrics
      let query = db('stand_utilization_metrics')
        .where('schedule_id', id)
        .where('time_period', timePeriod)
        .join('stands', 'stand_utilization_metrics.stand_id', 'stands.id')
        .select(
          'stand_utilization_metrics.*',
          'stands.name as stand_name',
          'stands.terminal'
        )
        .orderBy(['period_start', 'stand_id']);
      
      // Apply filters
      if (standId) {
        query = query.where('stand_utilization_metrics.stand_id', standId);
      }
      
      if (terminal) {
        query = query.where('stands.terminal', terminal);
      }
      
      // Execute query
      const metrics = await query;
      
      // Format metrics for charting
      const formattedMetrics = {
        metrics,
        summary: {
          averageUtilization: metrics.length > 0 
            ? metrics.reduce((sum, m) => sum + m.utilization_percentage, 0) / metrics.length 
            : 0
        }
      };
      
      // Group metrics by terminal for aggregated view
      const terminalMetrics = {};
      
      for (const metric of metrics) {
        const terminal = metric.terminal;
        
        terminalMetrics[terminal] = terminalMetrics[terminal] || {
          totalUtilization: 0,
          count: 0,
          metrics: []
        };
        
        terminalMetrics[terminal].totalUtilization += metric.utilization_percentage;
        terminalMetrics[terminal].count++;
        terminalMetrics[terminal].metrics.push(metric);
      }
      
      // Calculate average utilization by terminal
      for (const terminal in terminalMetrics) {
        terminalMetrics[terminal].averageUtilization = 
          terminalMetrics[terminal].totalUtilization / terminalMetrics[terminal].count;
      }
      
      formattedMetrics.terminalSummary = terminalMetrics;
      
      res.status(200).json({
        success: true,
        data: formattedMetrics
      });
    } catch (error) {
      console.error('Error getting utilization metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting utilization metrics',
        error: error.message
      });
    }
  },
  
  /**
   * Get issues for a schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllocationIssues(req, res) {
    try {
      const { id } = req.params;
      const { issueType, severity, resolved } = req.query;
      
      // Get the schedule from the database
      const db = require('../db');
      const schedule = await db('flight_schedules')
        .where('id', id)
        .first();
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      // Build query for issues
      let query = db('allocation_issues')
        .where('schedule_id', id)
        .orderBy(['severity', 'created_at']);
      
      // Apply filters
      if (issueType) {
        query = query.where('issue_type', issueType);
      }
      
      if (severity) {
        query = query.where('severity', severity);
      }
      
      if (resolved !== undefined) {
        query = query.where('is_resolved', resolved === 'true');
      }
      
      // Execute query
      const issues = await query;
      
      // Parse JSON fields
      const parsedIssues = issues.map(issue => {
        try {
          // Check if affected_entities is already an object
          const affectedEntities = 
            typeof issue.affected_entities === 'object' && issue.affected_entities !== null
              ? issue.affected_entities
              : (
                  // Try to parse JSON string
                  typeof issue.affected_entities === 'string' && issue.affected_entities !== "[object Object]"
                    ? JSON.parse(issue.affected_entities)
                    : {} // Default to empty object if parsing fails or if value is "[object Object]"
                );
          
          return {
            ...issue,
            affected_entities: affectedEntities
          };
        } catch (parseError) {
          console.warn(`Error parsing affected_entities for issue ${issue.id}: ${parseError.message}`);
          // Return the issue with an empty object for affected_entities
          return {
            ...issue,
            affected_entities: {}
          };
        }
      });
      
      res.status(200).json({
        success: true,
        data: parsedIssues
      });
    } catch (error) {
      console.error('Error getting allocation issues:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting allocation issues',
        error: error.message
      });
    }
  },
  
  /**
   * Generate a comprehensive report for a schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScheduleReport(req, res) {
    try {
      const { id } = req.params;
      
      const report = await flightProcessorService.generateAllocationReport(id);
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating schedule report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating schedule report',
        error: error.message
      });
    }
  },
  
  /**
   * Update schedule status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateScheduleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['draft', 'validated', 'allocated', 'finalized'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Update the status
      const db = require('../db');
      const result = await db('flight_schedules')
        .where('id', id)
        .update({
          status,
          updated_at: new Date()
        });
      
      if (result === 0) {
        return res.status(404).json({
          success: false,
          message: `Flight schedule with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        message: `Schedule status updated to: ${status}`
      });
    } catch (error) {
      console.error('Error updating schedule status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating schedule status',
        error: error.message
      });
    }
  }
};

module.exports = FlightScheduleController; 