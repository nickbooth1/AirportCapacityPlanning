const GroundHandlingAgent = require('../models/GroundHandlingAgent');
const { transaction } = require('objection');

/**
 * Service for Ground Handling Agent operations
 */
class GroundHandlingAgentService {
  /**
   * Get a GHA by its ID
   * @param {number} id - GHA ID
   * @returns {Promise<GroundHandlingAgent>} - GHA object
   */
  async getGHAById(id) {
    return GroundHandlingAgent.query().findById(id);
  }

  /**
   * Find GHAs by name search
   * @param {string} name - Name to search for
   * @returns {Promise<Array<GroundHandlingAgent>>}
   */
  async findGHAsByName(name) {
    return GroundHandlingAgent.findByName(name);
  }

  /**
   * Find GHAs operating at a specific airport
   * @param {string} airportCode - IATA or ICAO code of the airport
   * @returns {Promise<Array<GroundHandlingAgent>>}
   */
  async findGHAsByAirport(airportCode) {
    return GroundHandlingAgent.findByAirport(airportCode);
  }

  /**
   * Validate if a GHA operates at a specific airport
   * @param {string} ghaName - Name of the GHA
   * @param {string} airportCode - IATA or ICAO code of the airport
   * @returns {Promise<boolean>}
   */
  async validateGHAAtAirport(ghaName, airportCode) {
    return GroundHandlingAgent.validateGHAAtAirport(ghaName, airportCode);
  }

  /**
   * Get all GHAs with optional filtering
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array<GroundHandlingAgent>>}
   */
  async getAllGHAs(filter = {}) {
    let query = GroundHandlingAgent.query();
    
    if (filter.query) {
      query = query.where(builder => {
        builder.where('name', 'like', `%${filter.query}%`)
          .orWhere('code', 'like', `%${filter.query}%`)
          .orWhere('abbreviation', 'like', `%${filter.query}%`)
          .orWhere('country', 'like', `%${filter.query}%`)
          .orWhere('country_name', 'like', `%${filter.query}%`);
      });
    }
    
    if (filter.country) {
      query = query.where('country', filter.country);
    }
    
    if (filter.status) {
      query = query.where('status', filter.status);
    }
    
    if (filter.serviceType) {
      query = query.whereJsonSupersetOf('service_types', [filter.serviceType]);
    }
    
    // Add pagination
    if (filter.page && filter.limit) {
      const page = parseInt(filter.page) || 1;
      const limit = parseInt(filter.limit) || 10;
      const offset = (page - 1) * limit;
      
      query = query.offset(offset).limit(limit);
    }
    
    // Add sorting
    if (filter.sortBy) {
      const direction = filter.sortDir === 'desc' ? 'desc' : 'asc';
      query = query.orderBy(filter.sortBy, direction);
    } else {
      // Default sort by name
      query = query.orderBy('name', 'asc');
    }
    
    return query;
  }

  /**
   * Create a new GHA
   * @param {Object} ghaData - GHA data
   * @returns {Promise<GroundHandlingAgent>} - Created GHA
   */
  async createGHA(ghaData) {
    return GroundHandlingAgent.query().insert(ghaData);
  }

  /**
   * Update an existing GHA
   * @param {number} id - GHA ID
   * @param {Object} ghaData - Updated GHA data
   * @returns {Promise<GroundHandlingAgent>} - Updated GHA
   */
  async updateGHA(id, ghaData) {
    return GroundHandlingAgent.query()
      .patchAndFetchById(id, {
        ...ghaData,
        last_updated: new Date().toISOString()
      });
  }

  /**
   * Delete a GHA
   * @param {number} id - GHA ID
   * @returns {Promise<number>} - Number of rows deleted
   */
  async deleteGHA(id) {
    return GroundHandlingAgent.query().deleteById(id);
  }

  /**
   * Import multiple GHAs at once
   * @param {Array<Object>} ghas - Array of GHA objects to import
   * @returns {Promise<Object>} - Import results
   */
  async bulkImport(ghas) {
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };
    
    for (const gha of ghas) {
      try {
        // Check if GHA already exists by name (case insensitive)
        const existing = await GroundHandlingAgent.query()
          .whereRaw('LOWER(name) = LOWER(?)', [gha.name])
          .first();
        
        if (existing) {
          // Update existing record
          await GroundHandlingAgent.query()
            .patchAndFetchById(existing.id, {
              ...gha,
              last_updated: new Date().toISOString()
            });
          results.updated++;
        } else {
          // Create new record
          await GroundHandlingAgent.query().insert({
            ...gha,
            last_updated: new Date().toISOString()
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          name: gha.name,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Associate a GHA with an airport
   * @param {number} ghaId - GHA ID
   * @param {number} airportId - Airport ID
   * @param {Object} relationData - Additional relationship data
   * @returns {Promise<Object>} - Created relationship
   */
  async addAirportRelation(ghaId, airportId, relationData = {}) {
    const gha = await GroundHandlingAgent.query().findById(ghaId);
    
    if (!gha) {
      throw new Error(`GHA with ID ${ghaId} not found`);
    }
    
    return gha.$relatedQuery('airports').relate({
      id: airportId,
      ...relationData
    });
  }

  /**
   * Remove a GHA's association with an airport
   * @param {number} ghaId - GHA ID
   * @param {number} airportId - Airport ID
   * @returns {Promise<number>} - Number of relationships removed
   */
  async removeAirportRelation(ghaId, airportId) {
    const gha = await GroundHandlingAgent.query().findById(ghaId);
    
    if (!gha) {
      throw new Error(`GHA with ID ${ghaId} not found`);
    }
    
    return gha.$relatedQuery('airports').unrelate().where('id', airportId);
  }

  /**
   * Get the total count of GHAs with the applied filters (for pagination)
   * @param {Object} filter - Filter criteria
   * @returns {Promise<number>} - Total count
   */
  async getGHACount(filter = {}) {
    let query = GroundHandlingAgent.query();
    
    if (filter.query) {
      query = query.where(builder => {
        builder.where('name', 'like', `%${filter.query}%`)
          .orWhere('code', 'like', `%${filter.query}%`)
          .orWhere('abbreviation', 'like', `%${filter.query}%`)
          .orWhere('country', 'like', `%${filter.query}%`)
          .orWhere('country_name', 'like', `%${filter.query}%`);
      });
    }
    
    if (filter.country) {
      query = query.where('country', filter.country);
    }
    
    if (filter.status) {
      query = query.where('status', filter.status);
    }
    
    if (filter.serviceType) {
      query = query.whereJsonSupersetOf('service_types', [filter.serviceType]);
    }
    
    const result = await query.count('id as count').first();
    return parseInt(result.count, 10);
  }
}

module.exports = new GroundHandlingAgentService(); 