const Airport = require('../models/Airport');

class AirportService {
  /**
   * Get an airport by its IATA code
   * @param {string} code - IATA code
   * @returns {Promise<Airport>} - Airport object
   */
  async getAirportByIATA(code) {
    return Airport.findByIATA(code);
  }

  /**
   * Get an airport by its ICAO code
   * @param {string} code - ICAO code
   * @returns {Promise<Airport>} - Airport object
   */
  async getAirportByICAO(code) {
    return Airport.findByICAO(code);
  }

  /**
   * Find airports by name, code, city, or country
   * @param {string} query - Search query
   * @returns {Promise<Airport[]>} - Array of airport objects
   */
  async findAirports(query) {
    return Airport.findAirports(query);
  }

  /**
   * Get an airport by ID
   * @param {number} id - Airport ID
   * @returns {Promise<Airport>} - Airport object
   */
  async getAirport(id) {
    return Airport.query().findById(id);
  }

  /**
   * Create a new airport
   * @param {Object} airportData - Airport data
   * @returns {Promise<Airport>} - New airport object
   */
  async createAirport(airportData) {
    // Ensure proper formatting and defaults
    if (airportData.iata_code) {
      airportData.iata_code = airportData.iata_code.toUpperCase();
    }
    
    if (airportData.icao_code) {
      airportData.icao_code = airportData.icao_code.toUpperCase();
    }
    
    if (airportData.country) {
      airportData.country = airportData.country.toUpperCase();
    }
    
    // Set status default if not provided
    if (!airportData.status) {
      airportData.status = 'active';
    }
    
    // Set timestamp
    airportData.last_updated = new Date().toISOString();
    
    return Airport.query().insert(airportData);
  }

  /**
   * Update an airport
   * @param {number} id - Airport ID
   * @param {Object} airportData - Airport data to update
   * @returns {Promise<Airport>} - Updated airport object
   */
  async updateAirport(id, airportData) {
    // Format data
    if (airportData.iata_code) {
      airportData.iata_code = airportData.iata_code.toUpperCase();
    }
    
    if (airportData.icao_code) {
      airportData.icao_code = airportData.icao_code.toUpperCase();
    }
    
    if (airportData.country) {
      airportData.country = airportData.country.toUpperCase();
    }
    
    // Update timestamp
    airportData.last_updated = new Date().toISOString();
    
    return Airport.query().patchAndFetchById(id, airportData);
  }

  /**
   * Delete an airport (soft delete by marking inactive)
   * @param {number} id - Airport ID
   * @returns {Promise<Airport>} - Updated airport object
   */
  async deactivateAirport(id) {
    return Airport.query().patchAndFetchById(id, {
      status: 'inactive',
      last_updated: new Date().toISOString()
    });
  }

  /**
   * Find airports within a radius from a point
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Airport[]>} - Array of airport objects
   */
  async getAirportsInRadius(lat, lon, radiusKm) {
    return Airport.findAirportsInRadius(lat, lon, radiusKm);
  }

  /**
   * Find the nearest airport to a point
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Airport>} - Nearest airport
   */
  async getNearestAirport(lat, lon) {
    return Airport.findNearestAirport(lat, lon);
  }

  /**
   * Validate an airport reference (IATA or ICAO code)
   * @param {string} code - Airport code
   * @param {string} type - Code type (IATA or ICAO)
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async validateAirportReference(code, type = 'IATA') {
    if (!code) {
      return false;
    }
    
    // Normalize type
    type = type.toUpperCase();
    
    let airport = null;
    
    if (type === 'IATA') {
      airport = await this.getAirportByIATA(code);
    } else if (type === 'ICAO') {
      airport = await this.getAirportByICAO(code);
    } else if (type === 'AUTO') {
      // Try to auto-detect based on length
      if (code.length === 3) {
        airport = await this.getAirportByIATA(code);
      } else if (code.length === 4) {
        airport = await this.getAirportByICAO(code);
      }
    }
    
    return !!airport;
  }

  /**
   * Bulk import airports
   * @param {Array} airports - Array of airport objects
   * @returns {Promise<Object>} - Import results with counts
   */
  async bulkImport(airports) {
    const results = {
      total: airports.length,
      created: 0,
      updated: 0,
      errors: []
    };

    for (const airportData of airports) {
      try {
        // Check if airport already exists by IATA or ICAO code
        const existingAirport = airportData.iata_code
          ? await this.getAirportByIATA(airportData.iata_code)
          : airportData.icao_code
            ? await this.getAirportByICAO(airportData.icao_code)
            : null;

        if (existingAirport) {
          // Update existing airport
          await this.updateAirport(existingAirport.id, airportData);
          results.updated++;
        } else {
          // Create new airport
          await this.createAirport(airportData);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          airport: airportData,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get all airports with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Number of airports per page
   * @param {string} options.search - Search query for name/code/city/country
   * @param {string} options.type - Filter by airport type
   * @param {string} options.country - Filter by country code
   * @param {string} options.status - Filter by status
   * @returns {Promise<Object>} - Object containing data and count
   */
  async getAllAirports(options = {}) {
    const {
      page = 1,
      limit = 100,
      search = '',
      type = '',
      country = '',
      status = 'active'
    } = options;
    
    // Build query
    let query = Airport.query();
    
    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = query.where(builder => {
        builder.whereRaw('LOWER(name) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(iata_code) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(icao_code) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(city) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(country) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(country_name) LIKE ?', [searchTerm]);
      });
    }
    
    // Apply type filter if provided
    if (type && type.trim() !== '') {
      query = query.where('type', type.trim());
    }
    
    // Apply country filter if provided
    if (country && country.trim() !== '') {
      query = query.where('country', country.trim().toUpperCase());
    }
    
    // Apply status filter if provided
    if (status && status.trim() !== '') {
      query = query.where('status', status.trim());
    }
    
    // Count total matching entries (before pagination)
    const total = await query.clone().resultSize();
    
    // Apply pagination
    const data = await query
      .orderBy('name')
      .page(page - 1, limit);
    
    return {
      data: data.results,
      total
    };
  }
}

module.exports = new AirportService(); 