/**
 * StandService.js
 * 
 * Service layer for managing stands in the airport capacity planner.
 * Provides CRUD operations for stands with validation and error handling.
 */

const Stand = require('../models/Stand');
const Pier = require('../models/Pier');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class StandService {
  /**
   * Get all stands with optional filtering and pagination
   * @param {Object} options - Query options
   * @param {boolean} options.includeRelations - Whether to include relations (pier, terminal)
   * @param {Object} options.filter - Filter criteria (e.g., {is_active: true})
   * @param {number} options.limit - Maximum number of stands to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} - Array of stands
   */
  async getAllStands(options = {}) {
    try {
      const { 
        includeRelations = true, 
        filter = {}, 
        limit = 100, 
        offset = 0,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      // Build the query
      let query = Stand.query();
      
      // Apply filters
      if (Object.keys(filter).length > 0) {
        query = query.where(filter);
      }
      
      // Include relations if requested
      if (includeRelations) {
        query = query.withGraphFetched('[pier.[terminal]]');
      }
      
      // Apply pagination and sorting
      query = query
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset);
      
      const stands = await query;
      
      return stands;
    } catch (error) {
      logger.error(`Error retrieving stands: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a stand by ID
   * @param {number} id - Stand ID
   * @param {boolean} includeRelations - Whether to include relations
   * @returns {Promise<Object>} - The stand
   */
  async getStandById(id, includeRelations = true) {
    try {
      let query = Stand.query().findById(id);
      
      if (includeRelations) {
        query = query.withGraphFetched('[pier.[terminal]]');
      }
      
      const stand = await query;
      
      if (!stand) {
        throw new NotFoundError(`Stand with ID ${id} not found`);
      }
      
      return stand;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error retrieving stand ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get stands by pier ID
   * @param {number} pierId - Pier ID
   * @returns {Promise<Array>} - Array of stands
   */
  async getStandsByPierId(pierId) {
    try {
      // Verify pier exists
      const pier = await Pier.query().findById(pierId);
      
      if (!pier) {
        throw new NotFoundError(`Pier with ID ${pierId} not found`);
      }
      
      // Get stands for the pier
      const stands = await Stand.query()
        .where('pier_id', pierId)
        .withGraphFetched('pier.[terminal]');
      
      return stands;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error retrieving stands for pier ${pierId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get stands by terminal ID
   * @param {number} terminalId - Terminal ID
   * @returns {Promise<Array>} - Array of stands
   */
  async getStandsByTerminalId(terminalId) {
    try {
      // Get piers for the terminal
      const piers = await Pier.query().where('terminal_id', terminalId);
      
      if (piers.length === 0) {
        return [];
      }
      
      // Get stands for all piers in the terminal
      const pierIds = piers.map(pier => pier.id);
      const stands = await Stand.query()
        .whereIn('pier_id', pierIds)
        .withGraphFetched('pier.[terminal]');
      
      return stands;
    } catch (error) {
      logger.error(`Error retrieving stands for terminal ${terminalId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new stand
   * @param {Object} standData - Stand data
   * @returns {Promise<Object>} - The created stand
   */
  async createStand(standData) {
    try {
      // Extract data
      const { 
        name, 
        code, 
        pier_id, 
        is_active = true, 
        stand_type = 'remote', 
        has_jetbridge = false, 
        max_wingspan_meters = null, 
        max_length_meters = null,
        max_aircraft_size_code = null,
        description = null,
        latitude = null,
        longitude = null
      } = standData;
      
      // Validate required fields
      if (!name || !code || !pier_id) {
        throw new ValidationError('Name, code, and pier_id are required');
      }
      
      // Verify pier exists
      const pier = await Pier.query().findById(pier_id);
      if (!pier) {
        throw new ValidationError(`Pier with ID ${pier_id} not found`);
      }
      
      // Check for unique code within pier
      const existingStand = await Stand.query()
        .where({ code, pier_id })
        .first();
        
      if (existingStand) {
        throw new ConflictError('A stand with this code already exists for this pier');
      }
      
      // Create stand
      const newStand = await Stand.query().insert({
        name,
        code,
        pier_id,
        is_active,
        stand_type,
        has_jetbridge,
        max_wingspan_meters,
        max_length_meters,
        max_aircraft_size_code,
        description,
        latitude,
        longitude
      });
      
      // Return with relations
      return this.getStandById(newStand.id);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error(`Error creating stand: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a stand
   * @param {number} id - Stand ID
   * @param {Object} standData - Updated stand data
   * @returns {Promise<Object>} - The updated stand
   */
  async updateStand(id, standData) {
    try {
      // Check if stand exists
      const stand = await Stand.query().findById(id);
      if (!stand) {
        throw new NotFoundError(`Stand with ID ${id} not found`);
      }
      
      // If pier_id is being updated, verify pier exists
      if (standData.pier_id && standData.pier_id !== stand.pier_id) {
        const pier = await Pier.query().findById(standData.pier_id);
        if (!pier) {
          throw new ValidationError(`Pier with ID ${standData.pier_id} not found`);
        }
        
        // Check for unique code within pier if code is being updated
        if (standData.code && (standData.code !== stand.code || standData.pier_id !== stand.pier_id)) {
          const existingStand = await Stand.query()
            .where({ code: standData.code, pier_id: standData.pier_id })
            .whereNot({ id })
            .first();
            
          if (existingStand) {
            throw new ConflictError('A stand with this code already exists for this pier');
          }
        }
      }
      
      // Update stand
      await Stand.query().findById(id).patch(standData);
      
      // Return updated stand with relations
      return this.getStandById(id);
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error updating stand ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a stand
   * @param {number} id - Stand ID
   * @param {boolean} force - Force deletion even if there are dependencies
   * @returns {Promise<boolean>} - Success status
   */
  async deleteStand(id, force = false) {
    try {
      // Check if stand exists
      const stand = await Stand.query().findById(id);
      if (!stand) {
        throw new NotFoundError(`Stand with ID ${id} not found`);
      }
      
      // Check for dependencies unless force is true
      if (!force) {
        // Check for maintenance requests
        const maintenanceRequests = await stand.$relatedQuery('maintenanceRequests');
        if (maintenanceRequests.length > 0) {
          throw new ConflictError(
            `Cannot delete stand ${id} because it has ${maintenanceRequests.length} maintenance requests associated with it. Use force=true to delete anyway.`
          );
        }
        
        // Add other dependency checks as needed
      }
      
      // Delete stand
      await Stand.query().deleteById(id);
      
      return true;
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error deleting stand ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Search stands by name, code, or other criteria
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Matching stands
   */
  async searchStands(searchTerm, options = {}) {
    try {
      const { 
        includeInactive = false, 
        limit = 20, 
        terminalId = null,
        pierId = null
      } = options;
      
      let query = Stand.query()
        .where(builder => {
          builder
            .where('name', 'like', `%${searchTerm}%`)
            .orWhere('code', 'like', `%${searchTerm}%`)
            .orWhere('description', 'like', `%${searchTerm}%`);
        })
        .withGraphFetched('pier.[terminal]');
      
      // Filter by active status
      if (!includeInactive) {
        query = query.where('is_active', true);
      }
      
      // Filter by terminal
      if (terminalId) {
        query = query.whereExists(
          Pier.query()
            .whereColumn('piers.id', 'stands.pier_id')
            .where('piers.terminal_id', terminalId)
        );
      }
      
      // Filter by pier
      if (pierId) {
        query = query.where('pier_id', pierId);
      }
      
      query = query.limit(limit);
      
      const stands = await query;
      
      return stands;
    } catch (error) {
      logger.error(`Error searching stands: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get the count of stands with applied filters
   * @param {Object} options - Filter options
   * @returns {Promise<number>} - Total count of matching stands
   */
  async getStandCount(options = {}) {
    try {
      const { filter = {} } = options;
      
      // Build the query
      let query = Stand.query();
      
      // Apply filters
      if (Object.keys(filter).length > 0) {
        query = query.where(filter);
      }
      
      // If terminal_id is specified, we need special handling
      if (options.terminal_id) {
        // Get all piers in the terminal
        const piers = await Pier.query().where('terminal_id', options.terminal_id);
        
        if (piers.length === 0) {
          return 0;
        }
        
        // Filter stands by pier IDs
        const pierIds = piers.map(pier => pier.id);
        query = query.whereIn('pier_id', pierIds);
      }
      
      // Execute count query
      const result = await query.count('id as count').first();
      
      return parseInt(result.count, 10);
    } catch (error) {
      logger.error(`Error counting stands: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get the count of search results
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<number>} - Total count of matching stands
   */
  async getSearchResultCount(searchTerm, options = {}) {
    try {
      const { 
        includeInactive = false, 
        terminalId = null,
        pierId = null
      } = options;
      
      let query = Stand.query()
        .where(builder => {
          builder
            .where('name', 'like', `%${searchTerm}%`)
            .orWhere('code', 'like', `%${searchTerm}%`)
            .orWhere('description', 'like', `%${searchTerm}%`);
        });
      
      // Filter by active status
      if (!includeInactive) {
        query = query.where('is_active', true);
      }
      
      // Filter by terminal
      if (terminalId) {
        query = query.whereExists(
          Pier.query()
            .whereColumn('piers.id', 'stands.pier_id')
            .where('piers.terminal_id', terminalId)
        );
      }
      
      // Filter by pier
      if (pierId) {
        query = query.where('pier_id', pierId);
      }
      
      // Execute count query
      const result = await query.count('id as count').first();
      
      return parseInt(result.count, 10);
    } catch (error) {
      logger.error(`Error counting search results: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Bulk create stands
   * @param {Array} standsData - Array of stand data objects
   * @returns {Promise<Array>} - Created stands
   */
  async bulkCreateStands(standsData) {
    try {
      if (!Array.isArray(standsData) || standsData.length === 0) {
        throw new ValidationError('Stands data must be a non-empty array');
      }
      
      // Validate each stand and check for duplicates
      const pierIds = new Set();
      const codesByPier = {};
      
      for (const standData of standsData) {
        if (!standData.name || !standData.code || !standData.pier_id) {
          throw new ValidationError('Each stand must have name, code, and pier_id');
        }
        
        pierIds.add(standData.pier_id);
        
        if (!codesByPier[standData.pier_id]) {
          codesByPier[standData.pier_id] = new Set();
        }
        
        codesByPier[standData.pier_id].add(standData.code);
      }
      
      // Verify all piers exist
      const piers = await Pier.query().whereIn('id', Array.from(pierIds));
      if (piers.length !== pierIds.size) {
        throw new ValidationError('One or more pier IDs do not exist');
      }
      
      // Check for existing stands with the same code in the same pier
      const conflicts = [];
      
      for (const pierId of pierIds) {
        const codes = Array.from(codesByPier[pierId]);
        const existingStands = await Stand.query()
          .where('pier_id', pierId)
          .whereIn('code', codes);
          
        if (existingStands.length > 0) {
          for (const stand of existingStands) {
            conflicts.push(`Stand with code ${stand.code} already exists in pier ${pierId}`);
          }
        }
      }
      
      if (conflicts.length > 0) {
        throw new ConflictError('Conflicts detected: ' + conflicts.join(', '));
      }
      
      // Create all stands in a transaction
      const createdStands = await Stand.transaction(async trx => {
        return Promise.all(
          standsData.map(standData => 
            Stand.query(trx).insert({
              name: standData.name,
              code: standData.code,
              pier_id: standData.pier_id,
              is_active: standData.is_active ?? true,
              stand_type: standData.stand_type ?? 'remote',
              has_jetbridge: standData.has_jetbridge ?? false,
              max_wingspan_meters: standData.max_wingspan_meters ?? null,
              max_length_meters: standData.max_length_meters ?? null,
              max_aircraft_size_code: standData.max_aircraft_size_code ?? null,
              description: standData.description ?? null,
              latitude: standData.latitude ?? null,
              longitude: standData.longitude ?? null
            })
          )
        );
      });
      
      // Return the created stands with their IDs
      return createdStands;
    } catch (error) {
      if (
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error in bulk stand creation: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StandService();