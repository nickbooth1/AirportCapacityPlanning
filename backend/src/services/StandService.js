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
const { transaction } = require('objection');
const AuditService = require('./AuditService');
const CascadeDeleteService = require('./CascadeDeleteService');

class StandService {
  /**
   * Get all stands with optional filtering and pagination
   * @param {Object} options - Query options
   * @param {boolean} options.includeRelations - Whether to include relations (pier, terminal)
   * @param {Object} options.filter - Filter criteria (e.g., {is_active: true})
   * @param {number} options.limit - Maximum number of stands to return
   * @param {number} options.offset - Offset for pagination
   * @param {boolean} options.includeDeleted - Whether to include soft-deleted stands
   * @param {boolean} options.onlyDeleted - Whether to return only soft-deleted stands
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
        sortOrder = 'asc',
        includeDeleted = false,
        onlyDeleted = false
      } = options;

      // Build the query
      let query = Stand.query();
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      } else {
        query = query.modify('withDeleted');
      }
      
      // Apply other filters
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
   * @param {boolean} includeDeleted - Whether to include soft-deleted stands
   * @returns {Promise<Object>} - The stand
   */
  async getStandById(id, includeRelations = true, includeDeleted = false) {
    try {
      let query = Stand.query();
      
      // Apply soft delete filter
      if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
      // Find by ID
      query = query.findById(id);
      
      // Include relations if requested
      if (includeRelations) {
        query = query.withGraphFetched('[pier.[terminal]]');
      }
      
      const stand = await query;
      
      if (!stand) {
        throw new NotFoundError(`Stand with ID ${id} not found${!includeDeleted ? ' or is deleted' : ''}`);
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
   * @param {boolean} includeDeleted - Whether to include soft-deleted stands
   * @param {boolean} onlyDeleted - Whether to return only soft-deleted stands
   * @returns {Promise<Array>} - Array of stands
   */
  async getStandsByPierId(pierId, includeDeleted = false, onlyDeleted = false) {
    try {
      // Verify pier exists
      const pier = await Pier.query().findById(pierId);
      
      if (!pier) {
        throw new NotFoundError(`Pier with ID ${pierId} not found`);
      }
      
      // Build query
      let query = Stand.query().where('pier_id', pierId);
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
      // Include relations
      query = query.withGraphFetched('pier.[terminal]');
      
      const stands = await query;
      
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
   * @param {boolean} includeDeleted - Whether to include soft-deleted stands
   * @param {boolean} onlyDeleted - Whether to return only soft-deleted stands
   * @returns {Promise<Array>} - Array of stands
   */
  async getStandsByTerminalId(terminalId, includeDeleted = false, onlyDeleted = false) {
    try {
      // Get piers for the terminal
      const piers = await Pier.query().where('terminal_id', terminalId);
      
      if (piers.length === 0) {
        return [];
      }
      
      // Get stands for all piers in the terminal
      const pierIds = piers.map(pier => pier.id);
      let query = Stand.query().whereIn('pier_id', pierIds);
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
      // Include relations
      query = query.withGraphFetched('pier.[terminal]');
      
      const stands = await query;
      
      return stands;
    } catch (error) {
      logger.error(`Error retrieving stands for terminal ${terminalId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new stand
   * @param {Object} standData - Stand data
   * @param {Object} options - Additional options
   * @param {Object} options.user - User performing the creation
   * @param {Object} options.request - Express request object
   * @returns {Promise<Object>} - The created stand
   */
  async createStand(standData, options = {}) {
    const trx = await transaction.start(Stand.knex());
    
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
        await trx.rollback();
        throw new ValidationError('Name, code, and pier_id are required');
      }
      
      // Verify pier exists
      const pier = await Pier.query(trx).findById(pier_id);
      if (!pier) {
        await trx.rollback();
        throw new ValidationError(`Pier with ID ${pier_id} not found`);
      }
      
      // Check for unique code within pier
      const existingStand = await Stand.query(trx)
        .where({ code, pier_id })
        .first();
        
      if (existingStand) {
        await trx.rollback();
        throw new ConflictError('A stand with this code already exists for this pier');
      }
      
      // Create stand
      const newStand = await Stand.query(trx).insert({
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
      
      // Create audit log
      await AuditService.logChange({
        entityType: 'stand',
        entityId: newStand.id,
        action: 'create',
        previousState: null,
        newState: newStand,
        user: options.user,
        request: options.request,
        transaction: trx
      });
      
      // Commit transaction
      await trx.commit();
      
      // Return with relations
      return this.getStandById(newStand.id);
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
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
   * @param {Object} options - Additional options
   * @param {Object} options.user - User performing the update
   * @param {Object} options.request - Express request object
   * @param {string} options.modifiedAt - Last modified timestamp for concurrency check
   * @returns {Promise<Object>} - The updated stand
   */
  async updateStand(id, standData, options = {}) {
    const trx = await transaction.start(Stand.knex());
    
    try {
      // Check if stand exists
      const stand = await Stand.query(trx).findById(id);
      if (!stand) {
        await trx.rollback();
        throw new NotFoundError(`Stand with ID ${id} not found`);
      }
      
      // Optimistic concurrency control if modifiedAt is provided
      if (options.modifiedAt && stand.updated_at && 
          new Date(options.modifiedAt).getTime() !== new Date(stand.updated_at).getTime()) {
        await trx.rollback();
        throw new ConflictError('Stand has been modified by another user. Please refresh and try again.');
      }
      
      // Detect maintenance conflicts - if the stand has active maintenance
      if (stand.maintenanceRequests && Array.isArray(stand.maintenanceRequests)) {
        const now = new Date();
        const activeMaintenanceRequests = stand.maintenanceRequests.filter(req => {
          const startDate = new Date(req.start_datetime);
          const endDate = new Date(req.end_datetime);
          return startDate <= now && endDate >= now && [2, 4].includes(req.status_id); // Approved or In Progress
        });
        
        if (activeMaintenanceRequests.length > 0) {
          // Log a warning but don't block the update
          logger.warn(`Updating stand ${id} with active maintenance requests`, {
            standId: id,
            maintenance: activeMaintenanceRequests.map(r => r.id)
          });
          
          // If changing status to inactive while maintenance is active, that's a conflict
          if (standData.is_active === false && stand.is_active === true) {
            await trx.rollback();
            throw new ConflictError('Cannot deactivate stand with active maintenance requests');
          }
        }
      }
      
      // If pier_id is being updated, verify pier exists
      if (standData.pier_id && standData.pier_id !== stand.pier_id) {
        const pier = await Pier.query(trx).findById(standData.pier_id);
        if (!pier) {
          await trx.rollback();
          throw new ValidationError(`Pier with ID ${standData.pier_id} not found`);
        }
        
        // Check for unique code within pier if code is being updated
        if (standData.code && (standData.code !== stand.code || standData.pier_id !== stand.pier_id)) {
          const existingStand = await Stand.query(trx)
            .where({ code: standData.code, pier_id: standData.pier_id })
            .whereNot({ id })
            .first();
            
          if (existingStand) {
            await trx.rollback();
            throw new ConflictError('A stand with this code already exists for this pier');
          }
        }
      }
      
      // Save the previous state for audit log
      const previousState = { ...stand };
      
      // Update stand
      await Stand.query(trx).findById(id).patch(standData);
      
      // Get updated stand for audit and return value
      const updatedStand = await Stand.query(trx).findById(id);
      
      // Create audit log
      await AuditService.logChange({
        entityType: 'stand',
        entityId: id,
        action: 'update',
        previousState,
        newState: updatedStand,
        user: options.user,
        request: options.request,
        transaction: trx
      });
      
      // Commit transaction
      await trx.commit();
      
      // Return updated stand with relations
      return this.getStandById(id);
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
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
   * @param {Object} options - Additional options
   * @param {Object} options.user - User performing the deletion
   * @param {Object} options.request - Express request object
   * @param {boolean} options.softDelete - Whether to perform a soft delete (default: true)
   * @param {string} options.reason - Reason for deletion
   * @param {boolean} options.cancelMaintenance - Whether to cancel maintenance (default: false)
   * @returns {Promise<Object>} - Success status and detail information
   */
  async deleteStand(id, force = false, options = {}) {
    const trx = await transaction.start(Stand.knex());
    
    try {
      // Default to soft delete unless specifically set to false
      const softDelete = options.softDelete !== false;
      const reason = options.reason || null;
      const cancelMaintenance = options.cancelMaintenance === true;
      
      // Check if stand exists and include deleted stands only if not using soft delete
      let query = Stand.query(trx);
      
      // If we're doing permanent deletion and the stand is already soft-deleted,
      // we want to find it regardless of deleted status
      if (!softDelete) {
        query = query.modify('withDeleted');
      } else {
        query = query.modify('notDeleted');
      }
      
      // Get the stand with maintenance requests
      const stand = await query.findById(id).withGraphFetched('maintenanceRequests');
      if (!stand) {
        await trx.rollback();
        throw new NotFoundError(`Stand with ID ${id} not found${softDelete ? ' or is already deleted' : ''}`);
      }
      
      // Get all dependencies for this stand
      const dependencies = await CascadeDeleteService.getStandDependencies(id);
      
      // Check for active maintenance if we're not forcing cancellation
      if (dependencies.hasActiveDependencies && !cancelMaintenance) {
        await trx.rollback();
        throw new ConflictError(
          `Cannot delete stand ${id} because it has active maintenance in progress. Use cancelMaintenance=true to automatically cancel these requests.`
        );
      }
      
      // Check for other dependencies if not forcing
      if (!force && dependencies.hasAnyDependencies) {
        await trx.rollback();
        throw new ConflictError(
          `Cannot delete stand ${id} because it has dependencies: ${dependencies.dependencies.maintenance.total} maintenance requests and ${dependencies.dependencies.adjacencyRules.total} adjacency rules. Use force=true to delete anyway.`
        );
      }
      
      // Handle cascade operations if cancelling maintenance or forcing delete
      const cascadeResults = {};
      if ((force || cancelMaintenance) && dependencies.hasAnyDependencies) {
        // Handle cascade operations before deleting the stand
        const cascadeResult = await CascadeDeleteService.handleStandDeletionCascade(id, {
          ...options,
          softDelete,
          cancelActiveMaintenanceOrFail: cancelMaintenance,
          reason: reason || `Stand ${id} deletion`
        });
        
        // Store cascade results for the response
        cascadeResults.maintenance = cascadeResult.result.maintenance;
        cascadeResults.adjacencyRules = cascadeResult.result.adjacencyRules;
      }
      
      // Create audit log
      const actionType = softDelete ? 'soft_delete' : 'delete';
      await AuditService.logChange({
        entityType: 'stand',
        entityId: id,
        action: actionType,
        previousState: stand,
        newState: null,
        user: options.user,
        request: options.request,
        notes: `${force ? 'Forced deletion with dependencies. ' : ''}${cancelMaintenance ? 'Cancelled maintenance. ' : ''}${reason ? 'Reason: ' + reason : ''}`,
        transaction: trx
      });
      
      if (softDelete) {
        // Perform soft delete
        await Stand.query(trx).findById(id).patch({
          deleted_at: new Date().toISOString(),
          deleted_by: options.user ? options.user.id || options.user.name : 'system',
          deletion_reason: reason
        });
      } else {
        // Perform hard delete
        await Stand.query(trx).deleteById(id);
      }
      
      // Commit transaction
      await trx.commit();
      
      // Return detailed result
      return {
        success: true,
        standId: id,
        deleteType: softDelete ? 'soft_delete' : 'permanent_delete',
        cascadeOperations: cascadeResults,
        message: `Stand ${id} ${softDelete ? 'soft' : 'permanently'} deleted successfully.`
      };
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
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
        pierId = null,
        includeDeleted = false,
        onlyDeleted = false
      } = options;
      
      let query = Stand.query()
        .where(builder => {
          builder
            .where('name', 'like', `%${searchTerm}%`)
            .orWhere('code', 'like', `%${searchTerm}%`)
            .orWhere('description', 'like', `%${searchTerm}%`);
        });
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
      // Include relations
      query = query.withGraphFetched('pier.[terminal]');
      
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
   * @param {Object} options.filter - Filter criteria
   * @param {number} options.terminal_id - Terminal ID for filtering
   * @param {boolean} options.includeDeleted - Whether to include soft-deleted stands
   * @param {boolean} options.onlyDeleted - Whether to count only soft-deleted stands
   * @returns {Promise<number>} - Total count of matching stands
   */
  async getStandCount(options = {}) {
    try {
      const { 
        filter = {},
        terminal_id = null,
        includeDeleted = false,
        onlyDeleted = false 
      } = options;
      
      // Build the query
      let query = Stand.query();
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
      // Apply other filters
      if (Object.keys(filter).length > 0) {
        query = query.where(filter);
      }
      
      // If terminal_id is specified, we need special handling
      if (terminal_id) {
        // Get all piers in the terminal
        const piers = await Pier.query().where('terminal_id', terminal_id);
        
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
   * @param {boolean} options.includeInactive - Whether to include inactive stands
   * @param {number} options.terminalId - Terminal ID for filtering
   * @param {number} options.pierId - Pier ID for filtering
   * @param {boolean} options.includeDeleted - Whether to include soft-deleted stands
   * @param {boolean} options.onlyDeleted - Whether to count only soft-deleted stands
   * @returns {Promise<number>} - Total count of matching stands
   */
  async getSearchResultCount(searchTerm, options = {}) {
    try {
      const { 
        includeInactive = false, 
        terminalId = null,
        pierId = null,
        includeDeleted = false,
        onlyDeleted = false
      } = options;
      
      let query = Stand.query()
        .where(builder => {
          builder
            .where('name', 'like', `%${searchTerm}%`)
            .orWhere('code', 'like', `%${searchTerm}%`)
            .orWhere('description', 'like', `%${searchTerm}%`);
        });
      
      // Apply soft delete filter
      if (onlyDeleted) {
        query = query.modify('onlyDeleted');
      } else if (!includeDeleted) {
        query = query.modify('notDeleted');
      }
      
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
        // Include both deleted and non-deleted stands in the conflict check
        const existingStands = await Stand.query()
          .modify('withDeleted')
          .where('pier_id', pierId)
          .whereIn('code', codes);
          
        if (existingStands.length > 0) {
          for (const stand of existingStands) {
            conflicts.push(`Stand with code ${stand.code} already exists in pier ${pierId}${stand.deleted_at ? ' (deleted)' : ''}`);
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
  
  /**
   * Restore a soft-deleted stand
   * @param {number} id - Stand ID to restore
   * @param {Object} options - Additional options
   * @param {Object} options.user - User performing the restoration
   * @param {Object} options.request - Express request object
   * @returns {Promise<Object>} - The restored stand
   */
  async undeleteStand(id, options = {}) {
    const trx = await transaction.start(Stand.knex());
    
    try {
      // Check if stand exists and is soft-deleted
      const stand = await Stand.query(trx)
        .modify('onlyDeleted')
        .findById(id)
        .withGraphFetched('pier');
      
      if (!stand) {
        await trx.rollback();
        throw new NotFoundError(`Stand with ID ${id} not found or is not deleted`);
      }
      
      // Check for code uniqueness conflicts
      const existingStand = await Stand.query(trx)
        .modify('notDeleted')
        .where({
          code: stand.code,
          pier_id: stand.pier_id
        })
        .first();
      
      if (existingStand) {
        await trx.rollback();
        throw new ConflictError(
          `Cannot restore stand with code ${stand.code} because another active stand with this code exists in the same pier`
        );
      }
      
      // Save the previous state for audit log
      const previousState = { ...stand };
      
      // Restore the stand
      await Stand.query(trx)
        .findById(id)
        .patch({
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null
        });
      
      // Get the updated stand for audit and return
      const restoredStand = await Stand.query(trx)
        .findById(id)
        .withGraphFetched('pier.[terminal]');
      
      // Create audit log
      await AuditService.logChange({
        entityType: 'stand',
        entityId: id,
        action: 'restore',
        previousState,
        newState: restoredStand,
        user: options.user,
        request: options.request,
        transaction: trx
      });
      
      // Commit transaction
      await trx.commit();
      
      return restoredStand;
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback();
      }
      
      if (
        error instanceof NotFoundError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error restoring stand ${id}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StandService();