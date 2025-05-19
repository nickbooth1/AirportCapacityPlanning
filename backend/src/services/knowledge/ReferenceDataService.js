/**
 * Reference Data Service
 * 
 * This service provides data access methods for reference data in the system, including:
 * - Airports
 * - Airlines
 * - Ground Handling Agents (GHAs)
 * - Aircraft Types
 * 
 * It serves as a knowledge base integration layer that can be used by the Agent services
 * to validate and reference industry data.
 */

const Airport = require('../../models/Airport');
const Airline = require('../../models/Airline');
const GroundHandlingAgent = require('../../models/GroundHandlingAgent');
const AircraftType = require('../../models/AircraftType');
const CacheService = require('./CacheService');

class ReferenceDataService {
  /**
   * Get airports with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status ('active', 'inactive')
   * @param {string} filters.type - Filter by airport type
   * @param {string} filters.country - Filter by country code
   * @param {string} filters.searchQuery - Search in name, codes, city
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} - Airports matching the filters
   */
  async getAirports(filters = {}, limit = 100, offset = 0) {
    try {
      const cacheKey = `airports:${JSON.stringify(filters)}:${limit}:${offset}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      let query = Airport.query();
      
      // Apply filters
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      
      if (filters.type) {
        query = query.where('type', filters.type);
      }
      
      if (filters.country) {
        query = query.where('country', filters.country.toUpperCase());
      }
      
      if (filters.searchQuery) {
        query = query.where(builder => {
          builder.where('name', 'like', `%${filters.searchQuery}%`)
            .orWhere('iata_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('icao_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('city', 'like', `%${filters.searchQuery}%`)
            .orWhere('country_name', 'like', `%${filters.searchQuery}%`);
        });
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      const airports = await query;
      
      // Cache the results for 1 hour (3600 seconds)
      CacheService.setConfigItem(cacheKey, airports, 3600);
      
      return airports;
    } catch (error) {
      console.error('Error fetching airports:', error);
      throw new Error(`Failed to fetch airports: ${error.message}`);
    }
  }
  
  /**
   * Get an airport by its IATA code
   * 
   * @param {string} iataCode - The IATA code (3 letters)
   * @returns {Promise<Object>} - The airport
   */
  async getAirportByIATA(iataCode) {
    try {
      if (!iataCode || iataCode.length !== 3) {
        throw new Error('Invalid IATA code format');
      }
      
      const cacheKey = `airport:iata:${iataCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const airport = await Airport.findByIATA(iataCode.toUpperCase());
      
      if (!airport) {
        throw new Error(`Airport with IATA code ${iataCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, airport, 86400);
      
      return airport;
    } catch (error) {
      console.error(`Error fetching airport with IATA code ${iataCode}:`, error);
      throw new Error(`Failed to fetch airport: ${error.message}`);
    }
  }
  
  /**
   * Get an airport by its ICAO code
   * 
   * @param {string} icaoCode - The ICAO code (4 letters)
   * @returns {Promise<Object>} - The airport
   */
  async getAirportByICAO(icaoCode) {
    try {
      if (!icaoCode || icaoCode.length !== 4) {
        throw new Error('Invalid ICAO code format');
      }
      
      const cacheKey = `airport:icao:${icaoCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const airport = await Airport.findByICAO(icaoCode.toUpperCase());
      
      if (!airport) {
        throw new Error(`Airport with ICAO code ${icaoCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, airport, 86400);
      
      return airport;
    } catch (error) {
      console.error(`Error fetching airport with ICAO code ${icaoCode}:`, error);
      throw new Error(`Failed to fetch airport: ${error.message}`);
    }
  }
  
  /**
   * Find airports near a specific location
   * 
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} - Airports within the radius
   */
  async findAirportsNearLocation(latitude, longitude, radiusKm = 100) {
    try {
      const cacheKey = `airports:near:${latitude}:${longitude}:${radiusKm}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const airports = await Airport.findAirportsInRadius(latitude, longitude, radiusKm);
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, airports, 86400);
      
      return airports;
    } catch (error) {
      console.error(`Error finding airports near location (${latitude}, ${longitude}):`, error);
      throw new Error(`Failed to find airports: ${error.message}`);
    }
  }
  
  /**
   * Get airlines with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {boolean} filters.active - Filter by active status
   * @param {string} filters.country - Filter by country
   * @param {string} filters.alliance - Filter by alliance
   * @param {string} filters.searchQuery - Search in name, codes
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} - Airlines matching the filters
   */
  async getAirlines(filters = {}, limit = 100, offset = 0) {
    try {
      const cacheKey = `airlines:${JSON.stringify(filters)}:${limit}:${offset}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      let query = Airline.query();
      
      // Apply filters
      if (filters.active !== undefined) {
        query = query.where('active', !!filters.active);
      }
      
      if (filters.country) {
        query = query.where('country', 'like', `%${filters.country}%`);
      }
      
      if (filters.alliance) {
        query = query.where('alliance', filters.alliance);
      }
      
      if (filters.searchQuery) {
        query = query.where(builder => {
          builder.where('name', 'like', `%${filters.searchQuery}%`)
            .orWhere('iata_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('icao_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('callsign', 'like', `%${filters.searchQuery}%`);
        });
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      const airlines = await query;
      
      // Cache the results for 1 hour (3600 seconds)
      CacheService.setConfigItem(cacheKey, airlines, 3600);
      
      return airlines;
    } catch (error) {
      console.error('Error fetching airlines:', error);
      throw new Error(`Failed to fetch airlines: ${error.message}`);
    }
  }
  
  /**
   * Get an airline by its IATA code
   * 
   * @param {string} iataCode - The IATA code (2 letters)
   * @returns {Promise<Object>} - The airline
   */
  async getAirlineByIATA(iataCode) {
    try {
      if (!iataCode || iataCode.length > 2) {
        throw new Error('Invalid IATA code format');
      }
      
      const cacheKey = `airline:iata:${iataCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const airline = await Airline.findByIATA(iataCode.toUpperCase());
      
      if (!airline) {
        throw new Error(`Airline with IATA code ${iataCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, airline, 86400);
      
      return airline;
    } catch (error) {
      console.error(`Error fetching airline with IATA code ${iataCode}:`, error);
      throw new Error(`Failed to fetch airline: ${error.message}`);
    }
  }
  
  /**
   * Get an airline by its ICAO code
   * 
   * @param {string} icaoCode - The ICAO code (3 letters)
   * @returns {Promise<Object>} - The airline
   */
  async getAirlineByICAO(icaoCode) {
    try {
      if (!icaoCode || icaoCode.length > 3) {
        throw new Error('Invalid ICAO code format');
      }
      
      const cacheKey = `airline:icao:${icaoCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const airline = await Airline.findByICAO(icaoCode.toUpperCase());
      
      if (!airline) {
        throw new Error(`Airline with ICAO code ${icaoCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, airline, 86400);
      
      return airline;
    } catch (error) {
      console.error(`Error fetching airline with ICAO code ${icaoCode}:`, error);
      throw new Error(`Failed to fetch airline: ${error.message}`);
    }
  }
  
  /**
   * Validate if an airline code exists
   * 
   * @param {string} code - The airline code to validate
   * @param {string} type - Code type ('IATA' or 'ICAO')
   * @returns {Promise<boolean>} - True if the airline exists
   */
  async validateAirlineCode(code, type = 'IATA') {
    try {
      return await Airline.validateAirlineReference(code, type);
    } catch (error) {
      console.error(`Error validating airline code ${code}:`, error);
      return false;
    }
  }
  
  /**
   * Get ground handling agents with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status ('active', 'inactive')
   * @param {string} filters.country - Filter by country code
   * @param {string} filters.serviceType - Filter by service type
   * @param {string} filters.airportCode - Filter by operating airport (IATA/ICAO)
   * @param {string} filters.searchQuery - Search in name, code
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} - GHAs matching the filters
   */
  async getGroundHandlingAgents(filters = {}, limit = 100, offset = 0) {
    try {
      const cacheKey = `ghas:${JSON.stringify(filters)}:${limit}:${offset}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getOperationalItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      let query = GroundHandlingAgent.query();
      
      // Apply filters
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      
      if (filters.country) {
        query = query.where('country', filters.country.toUpperCase());
      }
      
      if (filters.serviceType) {
        query = query.whereJsonSupersetOf('service_types', [filters.serviceType]);
      }
      
      if (filters.airportCode) {
        query = query.whereJsonSupersetOf('operates_at', [filters.airportCode.toUpperCase()])
          .orWhereExists(
            GroundHandlingAgent.relatedQuery('airports')
              .where('iata_code', filters.airportCode.toUpperCase())
              .orWhere('icao_code', filters.airportCode.toUpperCase())
          );
      }
      
      if (filters.searchQuery) {
        query = query.where(builder => {
          builder.where('name', 'like', `%${filters.searchQuery}%`)
            .orWhere('code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('abbreviation', 'like', `%${filters.searchQuery.toUpperCase()}%`);
        });
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      const ghas = await query;
      
      // Cache the results for 30 minutes (1800 seconds)
      CacheService.setOperationalItem(cacheKey, ghas, 1800);
      
      return ghas;
    } catch (error) {
      console.error('Error fetching ground handling agents:', error);
      throw new Error(`Failed to fetch ground handling agents: ${error.message}`);
    }
  }
  
  /**
   * Get a ground handling agent by its code
   * 
   * @param {string} code - The GHA code
   * @returns {Promise<Object>} - The ground handling agent
   */
  async getGroundHandlingAgentByCode(code) {
    try {
      if (!code) {
        throw new Error('Code is required');
      }
      
      const cacheKey = `gha:code:${code.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getOperationalItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const gha = await GroundHandlingAgent.findByCode(code.toUpperCase());
      
      if (!gha) {
        throw new Error(`Ground handling agent with code ${code.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 hour (3600 seconds)
      CacheService.setOperationalItem(cacheKey, gha, 3600);
      
      return gha;
    } catch (error) {
      console.error(`Error fetching GHA with code ${code}:`, error);
      throw new Error(`Failed to fetch ground handling agent: ${error.message}`);
    }
  }
  
  /**
   * Find ground handling agents at a specific airport
   * 
   * @param {string} airportCode - The airport IATA or ICAO code
   * @returns {Promise<Array>} - Ground handling agents at the airport
   */
  async findGHAsAtAirport(airportCode) {
    try {
      if (!airportCode) {
        throw new Error('Airport code is required');
      }
      
      const cacheKey = `ghas:airport:${airportCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getOperationalItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const ghas = await GroundHandlingAgent.findByAirport(airportCode.toUpperCase());
      
      // Cache the results for 1 hour (3600 seconds)
      CacheService.setOperationalItem(cacheKey, ghas, 3600);
      
      return ghas;
    } catch (error) {
      console.error(`Error finding GHAs at airport ${airportCode}:`, error);
      throw new Error(`Failed to find ground handling agents: ${error.message}`);
    }
  }
  
  /**
   * Validate if a GHA operates at a specific airport
   * 
   * @param {string} ghaName - The GHA name or code
   * @param {string} airportCode - The airport IATA or ICAO code
   * @returns {Promise<boolean>} - True if the GHA operates at the airport
   */
  async validateGHAAtAirport(ghaName, airportCode) {
    try {
      return await GroundHandlingAgent.validateGHAAtAirport(ghaName, airportCode);
    } catch (error) {
      console.error(`Error validating GHA ${ghaName} at airport ${airportCode}:`, error);
      return false;
    }
  }
  
  /**
   * Get aircraft types with optional filtering
   * 
   * @param {Object} filters - Optional filters
   * @param {string} filters.manufacturer - Filter by manufacturer
   * @param {string} filters.sizeCategory - Filter by size category
   * @param {string} filters.searchQuery - Search in codes, name
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} - Aircraft types matching the filters
   */
  async getAircraftTypes(filters = {}, limit = 100, offset = 0) {
    try {
      const cacheKey = `aircraft_types:${JSON.stringify(filters)}:${limit}:${offset}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      let query = AircraftType.query();
      
      // Apply filters
      if (filters.manufacturer) {
        query = query.where('manufacturer', 'like', `%${filters.manufacturer}%`);
      }
      
      if (filters.sizeCategory) {
        query = query.where('size_category_code', filters.sizeCategory);
      }
      
      if (filters.searchQuery) {
        query = query.where(builder => {
          builder.where('name', 'like', `%${filters.searchQuery}%`)
            .orWhere('iata_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('icao_code', 'like', `%${filters.searchQuery.toUpperCase()}%`)
            .orWhere('model', 'like', `%${filters.searchQuery}%`);
        });
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      const aircraftTypes = await query;
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, aircraftTypes, 86400);
      
      return aircraftTypes;
    } catch (error) {
      console.error('Error fetching aircraft types:', error);
      throw new Error(`Failed to fetch aircraft types: ${error.message}`);
    }
  }
  
  /**
   * Get an aircraft type by its IATA code
   * 
   * @param {string} iataCode - The IATA code
   * @returns {Promise<Object>} - The aircraft type
   */
  async getAircraftTypeByIATA(iataCode) {
    try {
      if (!iataCode) {
        throw new Error('IATA code is required');
      }
      
      const cacheKey = `aircraft_type:iata:${iataCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const aircraftType = await AircraftType.query()
        .where('iata_code', iataCode.toUpperCase())
        .first();
      
      if (!aircraftType) {
        throw new Error(`Aircraft type with IATA code ${iataCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, aircraftType, 86400);
      
      return aircraftType;
    } catch (error) {
      console.error(`Error fetching aircraft type with IATA code ${iataCode}:`, error);
      throw new Error(`Failed to fetch aircraft type: ${error.message}`);
    }
  }
  
  /**
   * Get an aircraft type by its ICAO code
   * 
   * @param {string} icaoCode - The ICAO code
   * @returns {Promise<Object>} - The aircraft type
   */
  async getAircraftTypeByICAO(icaoCode) {
    try {
      if (!icaoCode) {
        throw new Error('ICAO code is required');
      }
      
      const cacheKey = `aircraft_type:icao:${icaoCode.toUpperCase()}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getConfigItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const aircraftType = await AircraftType.query()
        .where('icao_code', icaoCode.toUpperCase())
        .first();
      
      if (!aircraftType) {
        throw new Error(`Aircraft type with ICAO code ${icaoCode.toUpperCase()} not found`);
      }
      
      // Cache the results for 1 day (86400 seconds)
      CacheService.setConfigItem(cacheKey, aircraftType, 86400);
      
      return aircraftType;
    } catch (error) {
      console.error(`Error fetching aircraft type with ICAO code ${icaoCode}:`, error);
      throw new Error(`Failed to fetch aircraft type: ${error.message}`);
    }
  }
  
  /**
   * Get reference data summary statistics
   * 
   * @returns {Promise<Object>} - Summary statistics
   */
  async getReferenceDataSummary() {
    try {
      const cacheKey = 'reference_data:summary';
      
      // Try to get from cache first
      const cachedData = CacheService.getStatsItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Get counts for each entity type
      const [
        airportCount,
        airlineCount,
        ghaCount,
        aircraftTypeCount
      ] = await Promise.all([
        Airport.query().where('status', 'active').resultSize(),
        Airline.query().where('active', true).resultSize(),
        GroundHandlingAgent.query().where('status', 'active').resultSize(),
        AircraftType.query().resultSize()
      ]);
      
      // Get recent items for preview
      const [
        recentAirports,
        recentAirlines,
        recentGHAs,
        popularAircraftTypes
      ] = await Promise.all([
        Airport.query().where('status', 'active').orderBy('last_updated', 'desc').limit(5),
        Airline.query().where('active', true).orderBy('updated_at', 'desc').limit(5),
        GroundHandlingAgent.query().where('status', 'active').orderBy('updated_at', 'desc').limit(5),
        AircraftType.query().limit(5)
      ]);
      
      const summary = {
        counts: {
          airports: airportCount,
          airlines: airlineCount,
          groundHandlingAgents: ghaCount,
          aircraftTypes: aircraftTypeCount
        },
        samples: {
          airports: recentAirports.map(airport => ({
            iata: airport.iata_code,
            icao: airport.icao_code,
            name: airport.name,
            city: airport.city,
            country: airport.country
          })),
          airlines: recentAirlines.map(airline => ({
            iata: airline.iata_code,
            icao: airline.icao_code,
            name: airline.name,
            country: airline.country
          })),
          groundHandlingAgents: recentGHAs.map(gha => ({
            code: gha.code,
            name: gha.name,
            country: gha.country
          })),
          aircraftTypes: popularAircraftTypes.map(type => ({
            iata: type.iata_code,
            icao: type.icao_code,
            name: type.name,
            manufacturer: type.manufacturer
          }))
        }
      };
      
      // Cache the results for 1 hour (3600 seconds)
      CacheService.setStatsItem(cacheKey, summary, 3600);
      
      return summary;
    } catch (error) {
      console.error('Error fetching reference data summary:', error);
      throw new Error(`Failed to fetch reference data summary: ${error.message}`);
    }
  }
  
  /**
   * Search across all reference data tables
   * 
   * @param {string} query - Search query
   * @param {string} category - Optional category to limit search ('airports', 'airlines', 'ghas', 'aircraft')
   * @param {number} limit - Maximum results per category
   * @returns {Promise<Object>} - Search results
   */
  async searchReferenceData(query, category = null, limit = 10) {
    try {
      if (!query || query.length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }
      
      const cacheKey = `reference_search:${query}:${category || 'all'}:${limit}`;
      
      // Try to get from cache first
      const cachedData = CacheService.getOperationalItem(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const results = {};
      const searchPromises = [];
      
      // Search airports if no category specified or category is 'airports'
      if (!category || category === 'airports') {
        searchPromises.push(
          Airport.findAirports(query).limit(limit)
            .then(airports => {
              results.airports = airports.map(airport => ({
                id: airport.id,
                name: airport.name,
                iata: airport.iata_code,
                icao: airport.icao_code,
                city: airport.city,
                country: airport.country,
                type: 'airport'
              }));
            })
        );
      }
      
      // Search airlines if no category specified or category is 'airlines'
      if (!category || category === 'airlines') {
        searchPromises.push(
          Airline.findAirlines(query).limit(limit)
            .then(airlines => {
              results.airlines = airlines.map(airline => ({
                id: airline.id,
                name: airline.name,
                iata: airline.iata_code,
                icao: airline.icao_code,
                country: airline.country,
                type: 'airline'
              }));
            })
        );
      }
      
      // Search GHAs if no category specified or category is 'ghas'
      if (!category || category === 'ghas') {
        searchPromises.push(
          GroundHandlingAgent.findGHAs(query).limit(limit)
            .then(ghas => {
              results.groundHandlingAgents = ghas.map(gha => ({
                id: gha.id,
                name: gha.name,
                code: gha.code,
                country: gha.country,
                type: 'gha'
              }));
            })
        );
      }
      
      // Search aircraft types if no category specified or category is 'aircraft'
      if (!category || category === 'aircraft') {
        searchPromises.push(
          AircraftType.query()
            .where('name', 'like', `%${query}%`)
            .orWhere('iata_code', 'like', `%${query.toUpperCase()}%`)
            .orWhere('icao_code', 'like', `%${query.toUpperCase()}%`)
            .orWhere('manufacturer', 'like', `%${query}%`)
            .orWhere('model', 'like', `%${query}%`)
            .limit(limit)
            .then(types => {
              results.aircraftTypes = types.map(type => ({
                id: type.id,
                name: type.name,
                iata: type.iata_code,
                icao: type.icao_code,
                manufacturer: type.manufacturer,
                type: 'aircraftType'
              }));
            })
        );
      }
      
      // Wait for all searches to complete
      await Promise.all(searchPromises);
      
      // Add merged results for easy access
      results.all = [
        ...(results.airports || []),
        ...(results.airlines || []),
        ...(results.groundHandlingAgents || []),
        ...(results.aircraftTypes || [])
      ].sort((a, b) => {
        // Sort by relevance - exact matches first
        const aExactMatch = 
          a.iata === query.toUpperCase() || 
          a.icao === query.toUpperCase() || 
          a.code === query.toUpperCase() ||
          a.name.toLowerCase() === query.toLowerCase();
          
        const bExactMatch = 
          b.iata === query.toUpperCase() || 
          b.icao === query.toUpperCase() || 
          b.code === query.toUpperCase() ||
          b.name.toLowerCase() === query.toLowerCase();
          
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      }).slice(0, limit);
      
      // Cache the results for 15 minutes (900 seconds)
      CacheService.setOperationalItem(cacheKey, results, 900);
      
      return results;
    } catch (error) {
      console.error(`Error searching reference data for "${query}":`, error);
      throw new Error(`Failed to search reference data: ${error.message}`);
    }
  }
}

module.exports = new ReferenceDataService();