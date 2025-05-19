/**
 * Stand Data Service
 * 
 * This service provides data access methods for stand information, including:
 * - Fetching stands with various filtering options
 * - Finding stands by ID, code, or other attributes
 * - Getting stands with their maintenance status
 * - Aggregating stand statistics
 * 
 * It serves as a knowledge base integration layer that can be used by the Agent services.
 */

const Stand = require('../../models/Stand');
const MaintenanceRequest = require('../../models/MaintenanceRequest');
const { transaction } = require('objection');
const { DateTime } = require('luxon');

class StandDataService {
  /**
   * Get all stands with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.standType - Filter by stand type (contact, remote, cargo)
   * @param {boolean} filters.isActive - Filter by active status
   * @param {number} filters.pierId - Filter by pier ID
   * @param {boolean} filters.hasJetbridge - Filter by jetbridge presence
   * @param {string} filters.maxAircraftSize - Filter by maximum aircraft size
   * @param {string} filters.searchQuery - Search in name, code, and description
   * @returns {Promise<Array>} - Stands matching the filters
   */
  async getStands(filters = {}) {
    try {
      let query = Stand.query()
        .withGraphFetched('pier.terminal');
      
      // Apply filters
      if (filters.standType) {
        query = query.where('stand_type', filters.standType);
      }
      
      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }
      
      if (filters.pierId) {
        query = query.where('pier_id', filters.pierId);
      }
      
      if (filters.hasJetbridge !== undefined) {
        query = query.where('has_jetbridge', filters.hasJetbridge);
      }
      
      if (filters.maxAircraftSize) {
        query = query.where('max_aircraft_size_code', filters.maxAircraftSize);
      }
      
      if (filters.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.where(builder => {
          builder.where('name', 'like', searchTerm)
            .orWhere('code', 'like', searchTerm)
            .orWhere('description', 'like', searchTerm);
        });
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching stands:', error);
      throw new Error(`Failed to fetch stands: ${error.message}`);
    }
  }
  
  /**
   * Get a stand by ID
   * 
   * @param {number} standId - The stand ID
   * @param {boolean} withRelations - Whether to fetch related data
   * @returns {Promise<Object>} - The stand information
   */
  async getStandById(standId, withRelations = true) {
    try {
      let query = Stand.query().findById(standId);
      
      if (withRelations) {
        query = query.withGraphFetched('[pier.terminal, maintenanceRequests]');
      }
      
      const stand = await query;
      
      if (!stand) {
        throw new Error(`Stand with ID ${standId} not found`);
      }
      
      return stand;
    } catch (error) {
      console.error(`Error fetching stand with ID ${standId}:`, error);
      throw new Error(`Failed to fetch stand: ${error.message}`);
    }
  }
  
  /**
   * Get a stand by code
   * 
   * @param {string} standCode - The stand code
   * @returns {Promise<Object>} - The stand information
   */
  async getStandByCode(standCode) {
    try {
      const stand = await Stand.query()
        .where('code', standCode)
        .withGraphFetched('pier.terminal')
        .first();
      
      if (!stand) {
        throw new Error(`Stand with code ${standCode} not found`);
      }
      
      return stand;
    } catch (error) {
      console.error(`Error fetching stand with code ${standCode}:`, error);
      throw new Error(`Failed to fetch stand: ${error.message}`);
    }
  }
  
  /**
   * Get all stands with their current maintenance status
   * 
   * @param {Date} date - The date to check maintenance for (defaults to current date)
   * @returns {Promise<Array>} - Stands with maintenance status
   */
  async getStandsWithMaintenanceStatus(date = new Date()) {
    try {
      const dateStr = new Date(date).toISOString();
      
      // Get all stands with maintenance requests that overlap with the given date
      const stands = await Stand.query()
        .withGraphFetched({
          pier: true,
          maintenanceRequests: builder => {
            builder.where('start_datetime', '<=', dateStr)
                  .where('end_datetime', '>=', dateStr);
          }
        });
      
      // Add maintenance status to each stand
      return stands.map(stand => {
        const isUnderMaintenance = stand.maintenanceRequests && 
                                  stand.maintenanceRequests.length > 0;
        
        return {
          ...stand,
          isUnderMaintenance,
          activeMaintenanceRequests: stand.maintenanceRequests || []
        };
      });
    } catch (error) {
      console.error('Error fetching stands with maintenance status:', error);
      throw new Error(`Failed to fetch stands with maintenance status: ${error.message}`);
    }
  }
  
  /**
   * Get aggregated statistics about stands
   * 
   * @returns {Promise<Object>} - Stand statistics
   */
  async getStandStatistics() {
    try {
      // Get total count of stands
      const totalCount = await Stand.query().count('* as count').first();
      
      // Get count by stand type
      const countByType = await Stand.query()
        .select('stand_type')
        .count('* as count')
        .groupBy('stand_type');
      
      // Get count by active status
      const countByActiveStatus = await Stand.query()
        .select('is_active')
        .count('* as count')
        .groupBy('is_active');
      
      // Get count by pier
      const countByPier = await Stand.query()
        .select('pier_id')
        .count('* as count')
        .groupBy('pier_id')
        .withGraphFetched('pier');
      
      // Get count of stands currently under maintenance
      const now = new Date().toISOString();
      const underMaintenanceCount = await Stand.query()
        .joinRelated('maintenanceRequests')
        .where('maintenanceRequests.start_datetime', '<=', now)
        .where('maintenanceRequests.end_datetime', '>=', now)
        .countDistinct('stands.id as count')
        .first();
      
      return {
        totalCount: parseInt(totalCount.count),
        countByType: countByType.reduce((acc, item) => {
          acc[item.stand_type || 'unspecified'] = parseInt(item.count);
          return acc;
        }, {}),
        countByActiveStatus: countByActiveStatus.reduce((acc, item) => {
          acc[item.is_active ? 'active' : 'inactive'] = parseInt(item.count);
          return acc;
        }, {}),
        countByPier: countByPier.reduce((acc, item) => {
          const pierName = item.pier ? item.pier.name : 'unassigned';
          acc[pierName] = parseInt(item.count);
          return acc;
        }, {}),
        underMaintenanceCount: parseInt(underMaintenanceCount.count) || 0
      };
    } catch (error) {
      console.error('Error fetching stand statistics:', error);
      throw new Error(`Failed to fetch stand statistics: ${error.message}`);
    }
  }
  
  /**
   * Find stands with available capacity for a specific aircraft type
   * 
   * @param {string} aircraftSizeCode - The aircraft size code to check
   * @param {Date} startTime - The start time of the period to check
   * @param {Date} endTime - The end time of the period to check
   * @returns {Promise<Array>} - Available stands that can accommodate the aircraft
   */
  async findAvailableStandsForAircraftType(aircraftSizeCode, startTime, endTime) {
    try {
      const startTimeStr = new Date(startTime).toISOString();
      const endTimeStr = new Date(endTime).toISOString();
      
      // Find stands that can accommodate the aircraft size and are not under maintenance
      // during the specified period
      const availableStands = await Stand.query()
        .where('is_active', true)
        .where(builder => {
          builder.where('max_aircraft_size_code', aircraftSizeCode)
                .orWhere(builder => {
                  // If max_wingspan_meters and max_length_meters are set, we can do a more precise check
                  // This would require joining with aircraft_types to get the dimensions
                  // For simplicity, we're just using the max_aircraft_size_code for now
                });
        })
        .whereNotExists(
          MaintenanceRequest.query()
            .whereRaw('maintenance_requests.stand_id = stands.id')
            .where(builder => {
              builder.where(builder => {
                builder.where('start_datetime', '<=', startTimeStr)
                       .where('end_datetime', '>=', startTimeStr);
              }).orWhere(builder => {
                builder.where('start_datetime', '<=', endTimeStr)
                       .where('end_datetime', '>=', endTimeStr);
              }).orWhere(builder => {
                builder.where('start_datetime', '>=', startTimeStr)
                       .where('end_datetime', '<=', endTimeStr);
              });
            })
        )
        .withGraphFetched('pier.terminal');
      
      return availableStands;
    } catch (error) {
      console.error('Error finding available stands:', error);
      throw new Error(`Failed to find available stands: ${error.message}`);
    }
  }
  
  /**
   * Get maintenance history for a stand
   * 
   * @param {number} standId - The stand ID
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for history (defaults to 30 days ago)
   * @param {Date} options.endDate - End date for history (defaults to current date)
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Pagination offset
   * @returns {Promise<Array>} - Maintenance history for the stand
   */
  async getStandMaintenanceHistory(standId, options = {}) {
    try {
      const endDate = options.endDate || new Date();
      const startDate = options.startDate || new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days ago
      
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      
      const maintenanceHistory = await MaintenanceRequest.query()
        .where('stand_id', standId)
        .where('start_datetime', '>=', startDate.toISOString())
        .where('end_datetime', '<=', endDate.toISOString())
        .withGraphFetched('status')
        .orderBy('start_datetime', 'desc')
        .limit(limit)
        .offset(offset);
      
      return maintenanceHistory;
    } catch (error) {
      console.error(`Error fetching maintenance history for stand ${standId}:`, error);
      throw new Error(`Failed to fetch maintenance history: ${error.message}`);
    }
  }
  
  /**
   * Get availability schedule for a stand
   * 
   * @param {number} standId - The stand ID
   * @param {Date} startDate - Start date for the schedule
   * @param {Date} endDate - End date for the schedule
   * @returns {Promise<Object>} - Availability schedule with busy periods
   */
  async getStandAvailabilitySchedule(standId, startDate, endDate) {
    try {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (end < start) {
        throw new Error('End date cannot be before start date');
      }
      
      // Get the stand details
      const stand = await this.getStandById(standId, false);
      
      // Get maintenance periods that overlap with the specified date range
      const maintenancePeriods = await MaintenanceRequest.query()
        .where('stand_id', standId)
        .where(builder => {
          builder.where(builder => {
            builder.where('start_datetime', '<=', start.toISOString())
                   .where('end_datetime', '>=', start.toISOString());
          }).orWhere(builder => {
            builder.where('start_datetime', '<=', end.toISOString())
                   .where('end_datetime', '>=', end.toISOString());
          }).orWhere(builder => {
            builder.where('start_datetime', '>=', start.toISOString())
                   .where('start_datetime', '<=', end.toISOString());
          });
        })
        .select([
          'id',
          'title',
          'start_datetime',
          'end_datetime',
          'status_id'
        ])
        .withGraphFetched('status');
      
      // Calculate available periods
      const busyPeriods = maintenancePeriods.map(period => ({
        id: period.id,
        title: period.title,
        startTime: new Date(period.start_datetime),
        endTime: new Date(period.end_datetime),
        status: period.status ? period.status.name : 'Unknown',
        type: 'maintenance'
      }));
      
      // In a real implementation, we would also fetch flight allocations
      // that use this stand during the specified period
      // For now, we'll just return the maintenance periods
      
      return {
        stand,
        startDate: start,
        endDate: end,
        busyPeriods
      };
    } catch (error) {
      console.error(`Error fetching availability schedule for stand ${standId}:`, error);
      throw new Error(`Failed to fetch availability schedule: ${error.message}`);
    }
  }
}

module.exports = new StandDataService();