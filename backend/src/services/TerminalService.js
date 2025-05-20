/**
 * TerminalService.js
 * 
 * Service layer for managing terminals and piers in the airport capacity planner.
 * Provides CRUD operations for terminals and piers with validation and error handling.
 */

const Terminal = require('../models/Terminal');
const Pier = require('../models/Pier');
const Stand = require('../models/Stand');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class TerminalService {
  /**
   * Get all terminals with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of terminals
   */
  async getAllTerminals(options = {}) {
    try {
      const { 
        includeRelations = true, 
        includePierCount = true,
        includeStandCount = true,
        limit = 100, 
        offset = 0,
        sortBy = 'name',
        sortOrder = 'asc',
        filter = {}
      } = options;

      // Build the query
      let query = Terminal.query();
      
      // Apply filters
      if (Object.keys(filter).length > 0) {
        query = query.where(filter);
      }
      
      // Include relations if requested
      if (includeRelations) {
        query = query.withGraphFetched('piers');
      }
      
      // Apply pagination and sorting
      query = query
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset);
      
      let terminals = await query;
      
      // Add pier and stand counts if requested
      if ((includePierCount || includeStandCount) && terminals.length > 0) {
        const terminalIds = terminals.map(terminal => terminal.id);
        
        // Get pier counts
        if (includePierCount) {
          const pierCounts = await Pier.query()
            .select('terminal_id')
            .count('* as count')
            .whereIn('terminal_id', terminalIds)
            .groupBy('terminal_id');
            
          const pierCountMap = pierCounts.reduce((map, item) => {
            map[item.terminal_id] = parseInt(item.count, 10);
            return map;
          }, {});
          
          terminals = terminals.map(terminal => ({
            ...terminal,
            pier_count: pierCountMap[terminal.id] || 0
          }));
        }
        
        // Get stand counts
        if (includeStandCount) {
          // This requires a more complex query with a join
          const standCounts = await Stand.query()
            .select('terminals.id as terminal_id')
            .count('stands.id as count')
            .join('piers', 'stands.pier_id', 'piers.id')
            .join('terminals', 'piers.terminal_id', 'terminals.id')
            .whereIn('terminals.id', terminalIds)
            .groupBy('terminals.id');
            
          const standCountMap = standCounts.reduce((map, item) => {
            map[item.terminal_id] = parseInt(item.count, 10);
            return map;
          }, {});
          
          terminals = terminals.map(terminal => ({
            ...terminal,
            stand_count: standCountMap[terminal.id] || 0
          }));
        }
      }
      
      return terminals;
    } catch (error) {
      logger.error(`Error retrieving terminals: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a terminal by ID
   * @param {string} id - Terminal ID
   * @param {boolean} includeRelations - Whether to include relations
   * @returns {Promise<Object>} - The terminal
   */
  async getTerminalById(id, includeRelations = true) {
    try {
      let query = Terminal.query().findById(id);
      
      if (includeRelations) {
        query = query.withGraphFetched('piers');
      }
      
      const terminal = await query;
      
      if (!terminal) {
        throw new NotFoundError(`Terminal with ID ${id} not found`);
      }
      
      // Get stand count
      const standCount = await Stand.query()
        .count('* as count')
        .join('piers', 'stands.pier_id', 'piers.id')
        .where('piers.terminal_id', id)
        .first();
        
      return {
        ...terminal,
        stand_count: parseInt(standCount.count, 10) || 0
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error retrieving terminal ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new terminal
   * @param {Object} terminalData - Terminal data
   * @returns {Promise<Object>} - The created terminal
   */
  async createTerminal(terminalData) {
    try {
      // Extract data
      const { name, code, description = null } = terminalData;
      
      // Validate required fields
      if (!name || !code) {
        throw new ValidationError('Name and code are required');
      }
      
      // Check code format - should be 1-10 alphanumeric characters
      if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
        throw new ValidationError('Code must be 1-10 alphanumeric characters');
      }
      
      // Check for unique code
      const existingTerminal = await Terminal.query()
        .where('code', code)
        .first();
        
      if (existingTerminal) {
        throw new ConflictError(`Terminal with code ${code} already exists`);
      }
      
      // Create terminal
      const newTerminal = await Terminal.query().insert({
        name,
        code,
        description
      });
      
      return newTerminal;
    } catch (error) {
      if (
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error creating terminal: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a terminal
   * @param {string} id - Terminal ID
   * @param {Object} terminalData - Updated terminal data
   * @returns {Promise<Object>} - The updated terminal
   */
  async updateTerminal(id, terminalData) {
    try {
      // Check if terminal exists
      const terminal = await Terminal.query().findById(id);
      if (!terminal) {
        throw new NotFoundError(`Terminal with ID ${id} not found`);
      }
      
      // Check if code is being updated
      if (terminalData.code && terminalData.code !== terminal.code) {
        // Check code format
        if (!/^[A-Za-z0-9]{1,10}$/.test(terminalData.code)) {
          throw new ValidationError('Code must be 1-10 alphanumeric characters');
        }
        
        // Check for uniqueness
        const existingTerminal = await Terminal.query()
          .where('code', terminalData.code)
          .whereNot('id', id)
          .first();
          
        if (existingTerminal) {
          throw new ConflictError(`Terminal with code ${terminalData.code} already exists`);
        }
      }
      
      // Update terminal
      await Terminal.query().findById(id).patch(terminalData);
      
      // Return updated terminal with relations
      return this.getTerminalById(id);
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error updating terminal ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a terminal
   * @param {string} id - Terminal ID
   * @param {boolean} force - Force deletion even if there are dependencies
   * @returns {Promise<boolean>} - Success status
   */
  async deleteTerminal(id, force = false) {
    try {
      // Check if terminal exists
      const terminal = await Terminal.query().findById(id);
      if (!terminal) {
        throw new NotFoundError(`Terminal with ID ${id} not found`);
      }
      
      // Check for dependencies unless force is true
      if (!force) {
        // Check for piers
        const piers = await Pier.query().where('terminal_id', id);
        if (piers.length > 0) {
          throw new ConflictError(
            `Cannot delete terminal ${id} because it has ${piers.length} piers associated with it. Use force=true to delete anyway.`
          );
        }
      }
      
      // If force is true, delete all piers (which will cascade to stands)
      if (force) {
        await Pier.query().where('terminal_id', id).delete();
      }
      
      // Delete terminal
      await Terminal.query().deleteById(id);
      
      return true;
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error deleting terminal ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all piers with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of piers
   */
  async getAllPiers(options = {}) {
    try {
      const { 
        includeRelations = true, 
        includeStandCount = true,
        terminalId = null,
        limit = 100, 
        offset = 0,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options;

      // Build the query
      let query = Pier.query();
      
      // Filter by terminal if provided
      if (terminalId) {
        query = query.where('terminal_id', terminalId);
      }
      
      // Include relations if requested
      if (includeRelations) {
        query = query.withGraphFetched('terminal');
      }
      
      // Apply pagination and sorting
      query = query
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset);
      
      let piers = await query;
      
      // Add stand counts if requested
      if (includeStandCount && piers.length > 0) {
        const pierIds = piers.map(pier => pier.id);
        
        // Get stand counts
        const standCounts = await Stand.query()
          .select('pier_id')
          .count('* as count')
          .whereIn('pier_id', pierIds)
          .groupBy('pier_id');
          
        const standCountMap = standCounts.reduce((map, item) => {
          map[item.pier_id] = parseInt(item.count, 10);
          return map;
        }, {});
        
        piers = piers.map(pier => ({
          ...pier,
          stand_count: standCountMap[pier.id] || 0
        }));
      }
      
      return piers;
    } catch (error) {
      logger.error(`Error retrieving piers: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get a pier by ID
   * @param {string} id - Pier ID
   * @param {boolean} includeRelations - Whether to include relations
   * @returns {Promise<Object>} - The pier
   */
  async getPierById(id, includeRelations = true) {
    try {
      let query = Pier.query().findById(id);
      
      if (includeRelations) {
        query = query.withGraphFetched('[terminal, stands]');
      }
      
      const pier = await query;
      
      if (!pier) {
        throw new NotFoundError(`Pier with ID ${id} not found`);
      }
      
      return pier;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error(`Error retrieving pier ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new pier
   * @param {Object} pierData - Pier data
   * @returns {Promise<Object>} - The created pier
   */
  async createPier(pierData) {
    try {
      // Extract data
      const { name, code, terminal_id, description = null } = pierData;
      
      // Validate required fields
      if (!name || !code || !terminal_id) {
        throw new ValidationError('Name, code, and terminal_id are required');
      }
      
      // Check code format - should be 1-20 alphanumeric characters and hyphens
      if (!/^[A-Za-z0-9\-]{1,20}$/.test(code)) {
        throw new ValidationError('Code must be 1-20 alphanumeric characters or hyphens');
      }
      
      // Verify terminal exists
      const terminal = await Terminal.query().findById(terminal_id);
      if (!terminal) {
        throw new ValidationError(`Terminal with ID ${terminal_id} not found`);
      }
      
      // Check for unique code within terminal
      const existingPier = await Pier.query()
        .where({ code, terminal_id })
        .first();
        
      if (existingPier) {
        throw new ConflictError(`Pier with code ${code} already exists in this terminal`);
      }
      
      // Create pier
      const newPier = await Pier.query().insert({
        name,
        code,
        terminal_id,
        description
      });
      
      // Return with relations
      return this.getPierById(newPier.id);
    } catch (error) {
      if (
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error creating pier: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a pier
   * @param {string} id - Pier ID
   * @param {Object} pierData - Updated pier data
   * @returns {Promise<Object>} - The updated pier
   */
  async updatePier(id, pierData) {
    try {
      // Check if pier exists
      const pier = await Pier.query().findById(id);
      if (!pier) {
        throw new NotFoundError(`Pier with ID ${id} not found`);
      }
      
      // If terminal_id is being updated, verify terminal exists
      if (pierData.terminal_id && pierData.terminal_id !== pier.terminal_id) {
        const terminal = await Terminal.query().findById(pierData.terminal_id);
        if (!terminal) {
          throw new ValidationError(`Terminal with ID ${pierData.terminal_id} not found`);
        }
      }
      
      // Check if code is being updated
      if ((pierData.code && pierData.code !== pier.code) || 
          (pierData.terminal_id && pierData.terminal_id !== pier.terminal_id)) {
        // Check code format
        if (pierData.code && !/^[A-Za-z0-9\-]{1,20}$/.test(pierData.code)) {
          throw new ValidationError('Code must be 1-20 alphanumeric characters or hyphens');
        }
        
        // Check for uniqueness within terminal
        const terminal_id = pierData.terminal_id || pier.terminal_id;
        const code = pierData.code || pier.code;
        
        const existingPier = await Pier.query()
          .where({ code, terminal_id })
          .whereNot('id', id)
          .first();
          
        if (existingPier) {
          throw new ConflictError(`Pier with code ${code} already exists in this terminal`);
        }
      }
      
      // Update pier
      await Pier.query().findById(id).patch(pierData);
      
      // Return updated pier with relations
      return this.getPierById(id);
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error updating pier ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a pier
   * @param {string} id - Pier ID
   * @param {boolean} force - Force deletion even if there are dependencies
   * @returns {Promise<boolean>} - Success status
   */
  async deletePier(id, force = false) {
    try {
      // Check if pier exists
      const pier = await Pier.query().findById(id);
      if (!pier) {
        throw new NotFoundError(`Pier with ID ${id} not found`);
      }
      
      // Check for dependencies unless force is true
      if (!force) {
        // Check for stands
        const stands = await Stand.query().where('pier_id', id);
        if (stands.length > 0) {
          throw new ConflictError(
            `Cannot delete pier ${id} because it has ${stands.length} stands associated with it. Use force=true to delete anyway.`
          );
        }
      }
      
      // If force is true, delete all stands
      if (force) {
        await Stand.query().where('pier_id', id).delete();
      }
      
      // Delete pier
      await Pier.query().deleteById(id);
      
      return true;
    } catch (error) {
      if (
        error instanceof NotFoundError || 
        error instanceof ConflictError
      ) {
        throw error;
      }
      
      logger.error(`Error deleting pier ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Search terminals and piers by name or code
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async search(searchTerm, options = {}) {
    try {
      const { limit = 20 } = options;
      
      // Search terminals
      const terminals = await Terminal.query()
        .where('name', 'like', `%${searchTerm}%`)
        .orWhere('code', 'like', `%${searchTerm}%`)
        .limit(limit);
      
      // Search piers
      const piers = await Pier.query()
        .where('name', 'like', `%${searchTerm}%`)
        .orWhere('code', 'like', `%${searchTerm}%`)
        .withGraphFetched('terminal')
        .limit(limit);
      
      return {
        terminals,
        piers
      };
    } catch (error) {
      logger.error(`Error searching terminals and piers: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TerminalService();