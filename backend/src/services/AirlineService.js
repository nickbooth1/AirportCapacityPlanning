const Airline = require('../models/Airline');

class AirlineService {
  /**
   * Get an airline by its IATA code
   * @param {string} code - IATA code
   * @returns {Promise<Airline>} - Airline object
   */
  async getAirlineByIATA(code) {
    return Airline.findByIATA(code);
  }

  /**
   * Get an airline by its ICAO code
   * @param {string} code - ICAO code
   * @returns {Promise<Airline>} - Airline object
   */
  async getAirlineByICAO(code) {
    return Airline.findByICAO(code);
  }

  /**
   * Find airlines by name, code, or country
   * @param {string} query - Search query
   * @returns {Promise<Airline[]>} - Array of airline objects
   */
  async findAirlines(query) {
    return Airline.findAirlines(query);
  }

  /**
   * Validate if a code corresponds to a known airline
   * @param {string} code - Airline code
   * @param {string} type - Code type ('IATA' or 'ICAO')
   * @returns {Promise<boolean>} - True if valid, false otherwise
   */
  async validateAirlineReference(code, type = 'IATA') {
    return Airline.validateAirlineReference(code, type);
  }

  /**
   * Create a new airline
   * @param {Object} data - Airline data
   * @returns {Promise<Airline>} - Created airline object
   */
  async createAirline(data) {
    return Airline.query().insert(data);
  }

  /**
   * Update an existing airline
   * @param {number} id - Airline ID
   * @param {Object} data - Updated airline data
   * @returns {Promise<Airline>} - Updated airline object
   */
  async updateAirline(id, data) {
    return Airline.query().patchAndFetchById(id, data);
  }

  /**
   * Deactivate an airline
   * @param {number} id - Airline ID
   * @returns {Promise<Airline>} - Updated airline object
   */
  async deactivateAirline(id) {
    return this.updateAirline(id, { active: false });
  }

  /**
   * Bulk import airlines
   * @param {Array} airlines - Array of airline objects
   * @returns {Promise<Object>} - Import results with counts
   */
  async bulkImport(airlines) {
    const results = {
      total: airlines.length,
      created: 0,
      updated: 0,
      errors: []
    };

    for (const airlineData of airlines) {
      try {
        // Check if airline already exists by IATA or ICAO code
        const existingAirline = airlineData.iata_code
          ? await this.getAirlineByIATA(airlineData.iata_code)
          : airlineData.icao_code
            ? await this.getAirlineByICAO(airlineData.icao_code)
            : null;

        if (existingAirline) {
          // Update existing airline
          await this.updateAirline(existingAirline.id, airlineData);
          results.updated++;
        } else {
          // Create new airline
          await this.createAirline(airlineData);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          airline: airlineData,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new AirlineService(); 