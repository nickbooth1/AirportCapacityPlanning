const db = require('../db');
const AirlineService = require('./AirlineService');
const AirportService = require('./AirportService');

/**
 * Service for validating flight data against repository data
 */
class RepositoryValidationService {
  constructor() {
    this.airlineService = AirlineService;
    this.airportService = AirportService;
    this.cache = {
      airlines: new Map(),
      airports: new Map(),
      aircraftTypes: new Map(),
      terminals: new Map()
    };
  }

  /**
   * Validate airline IATA code against repository
   * @param {string} airlineCode - The airline IATA code to validate
   * @returns {Promise<boolean|Object>} - Returns airline object if valid, false if not
   */
  async validateAirlineCode(airlineCode) {
    if (!airlineCode) return false;
    
    // Check cache first
    if (this.cache.airlines.has(airlineCode)) {
      return this.cache.airlines.get(airlineCode);
    }
    
    try {
      const airline = await db('airlines').where({ iata_code: airlineCode }).first();
      
      // Cache result (even if null)
      this.cache.airlines.set(airlineCode, airline || false);
      
      return airline || false;
    } catch (error) {
      console.error(`Error validating airline code ${airlineCode}:`, error);
      return false;
    }
  }

  /**
   * Validate airport IATA code against repository
   * @param {string} airportCode - The airport IATA code to validate
   * @returns {Promise<boolean|Object>} - Returns airport object if valid, false if not
   */
  async validateAirportCode(airportCode) {
    if (!airportCode) return false;
    
    // Check cache first
    if (this.cache.airports.has(airportCode)) {
      return this.cache.airports.get(airportCode);
    }
    
    try {
      const airport = await db('airports').where({ iata_code: airportCode }).first();
      
      // Cache result (even if null)
      this.cache.airports.set(airportCode, airport || false);
      
      return airport || false;
    } catch (error) {
      console.error(`Error validating airport code ${airportCode}:`, error);
      return false;
    }
  }

  /**
   * Validate aircraft type IATA code against repository
   * @param {string} aircraftTypeCode - The aircraft type IATA code to validate
   * @returns {Promise<boolean|Object>} - Returns aircraft type object if valid, false if not
   */
  async validateAircraftType(aircraftTypeCode) {
    if (!aircraftTypeCode) return false;
    
    // Check cache first
    if (this.cache.aircraftTypes.has(aircraftTypeCode)) {
      return this.cache.aircraftTypes.get(aircraftTypeCode);
    }
    
    try {
      const aircraftType = await db('aircraft_types').where({ iata_code: aircraftTypeCode }).first();
      
      // Cache result (even if null)
      this.cache.aircraftTypes.set(aircraftTypeCode, aircraftType || false);
      
      return aircraftType || false;
    } catch (error) {
      console.error(`Error validating aircraft type code ${aircraftTypeCode}:`, error);
      return false;
    }
  }

  /**
   * Validate terminal against airport configuration
   * @param {string} terminal - The terminal code to validate
   * @param {string} airportCode - The airport IATA code 
   * @returns {Promise<boolean|Object>} - Returns terminal object if valid, false if not
   */
  async validateTerminal(terminal, airportCode) {
    if (!terminal || !airportCode) return false;
    
    const cacheKey = `${airportCode}:${terminal}`;
    
    // Check cache first
    if (this.cache.terminals.has(cacheKey)) {
      return this.cache.terminals.get(cacheKey);
    }
    
    try {
      // First validate the airport exists
      const airport = await this.validateAirportCode(airportCode);
      if (!airport) return false;
      
      // Then check if the terminal exists for this airport
      const terminalExists = await db('terminals')
        .where({ code: terminal })
        .whereIn('id', function() {
          this.select('terminal_id')
            .from('airport_terminals')
            .where({ airport_id: airport.id });
        })
        .first();
      
      // Cache result
      this.cache.terminals.set(cacheKey, terminalExists || false);
      
      return terminalExists || false;
    } catch (error) {
      console.error(`Error validating terminal ${terminal} for airport ${airportCode}:`, error);
      return false;
    }
  }

  /**
   * Validate seat capacity against aircraft type
   * @param {number} capacity - The seat capacity to validate
   * @param {string} aircraftTypeCode - The aircraft type IATA code
   * @returns {Promise<boolean>} - Whether the capacity is valid for the aircraft type
   */
  async validateCapacityForAircraft(capacity, aircraftTypeCode) {
    if (!capacity || !aircraftTypeCode) return false;
    
    try {
      // Get the aircraft type
      const aircraftType = await this.validateAircraftType(aircraftTypeCode);
      if (!aircraftType) return false;
      
      // If aircraft has no capacity data, we can't validate
      if (!aircraftType.min_capacity && !aircraftType.max_capacity) return true;
      
      // Check if capacity is within the valid range for this aircraft type
      // Allow some flexibility: within 10% of min/max
      const minCapacity = aircraftType.min_capacity ? aircraftType.min_capacity * 0.9 : 0;
      const maxCapacity = aircraftType.max_capacity ? aircraftType.max_capacity * 1.1 : Number.MAX_SAFE_INTEGER;
      
      return capacity >= minCapacity && capacity <= maxCapacity;
    } catch (error) {
      console.error(`Error validating capacity ${capacity} for aircraft type ${aircraftTypeCode}:`, error);
      return false;
    }
  }

  /**
   * Clear all repository validation caches
   */
  clearCache() {
    this.cache.airlines.clear();
    this.cache.airports.clear();
    this.cache.aircraftTypes.clear();
    this.cache.terminals.clear();
  }
}

module.exports = RepositoryValidationService; 