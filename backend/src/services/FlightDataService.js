const db = require('../db');
const { format } = require('date-fns');

/**
 * Service for managing flight data
 */
class FlightDataService {
  constructor() {
    this.cache = {
      airports: new Map(),
      airlines: new Map()
    };
  }

  /**
   * Get airport details by IATA code (with caching)
   * @param {string} iataCode - IATA code to look up
   * @returns {Promise<Object|null>} - Airport object or null if not found
   */
  async getAirportByCode(iataCode) {
    if (!iataCode) return null;
    
    // Check cache first
    if (this.cache.airports.has(iataCode)) {
      return this.cache.airports.get(iataCode);
    }
    
    try {
      // Look up airport in database
      const airport = await db('airports').where({ iata_code: iataCode }).first();
      
      if (airport) {
        // Store in cache
        this.cache.airports.set(iataCode, airport);
      }
      
      return airport || null;
    } catch (error) {
      console.error(`Error fetching airport ${iataCode}:`, error);
      return null;
    }
  }

  /**
   * Get airline details by IATA code (with caching)
   * @param {string} iataCode - IATA code to look up
   * @returns {Promise<Object|null>} - Airline object or null if not found
   */
  async getAirlineByCode(iataCode) {
    if (!iataCode) return null;
    
    // Check cache first
    if (this.cache.airlines.has(iataCode)) {
      return this.cache.airlines.get(iataCode);
    }
    
    try {
      // Look up airline in database
      const airline = await db('airlines').where({ iata_code: iataCode }).first();
      
      if (airline) {
        // Store in cache
        this.cache.airlines.set(iataCode, airline);
      }
      
      return airline || null;
    } catch (error) {
      console.error(`Error fetching airline ${iataCode}:`, error);
      return null;
    }
  }

  /**
   * Enhance flight data with full names for airports and airlines
   * @param {Array} flights - Array of flight objects
   * @returns {Promise<Array>} - Enhanced flight objects
   */
  async enhanceFlightData(flights) {
    const enhancedFlights = [];
    
    for (const flight of flights) {
      const enhancedFlight = { ...flight };
      
      // Get airline details
      if (flight.airline_iata) {
        const airline = await this.getAirlineByCode(flight.airline_iata);
        if (airline) {
          enhancedFlight.airline_name = airline.name;
        }
      }
      
      // Get airport details
      if (flight.origin_destination_iata) {
        const airport = await this.getAirportByCode(flight.origin_destination_iata);
        if (airport) {
          enhancedFlight.origin_destination_name = airport.name;
        }
      }
      
      enhancedFlights.push(enhancedFlight);
    }
    
    return enhancedFlights;
  }

  /**
   * Get all flights with pagination and filtering
   * @param {Object} filters - Filter criteria
   * @param {Number} page - Page number
   * @param {Number} pageSize - Items per page
   * @returns {Promise<Object>} Paginated flights and total count
   */
  async getAllFlights(filters = {}, page = 1, pageSize = 20) {
    try {
      // Build the base query
      const query = db('flights').select('*');
      
      // Apply filters
      if (filters.startDate && filters.endDate) {
        query.whereBetween('scheduled_datetime', [filters.startDate, filters.endDate]);
      }
      
      if (filters.flightType && filters.flightType !== 'all') {
        query.where('flight_nature', filters.flightType);
      }
      
      if (filters.airline && filters.airline !== 'all') {
        query.where('airline_iata', filters.airline);
      }
      
      if (filters.terminal && filters.terminal !== 'all') {
        query.where('terminal', filters.terminal);
      }
      
      if (filters.status && filters.status !== 'all') {
        query.where('validation_status', filters.status);
      }
      
      // Filter by upload ID
      if (filters.uploadId) {
        query.where('upload_id', filters.uploadId);
        console.log(`Filtering flights by upload_id: ${filters.uploadId}`);
      }
      
      if (filters.searchTerm) {
        query.where(function() {
          this.where('flight_number', 'like', `%${filters.searchTerm}%`)
            .orWhere('airline_iata', 'like', `%${filters.searchTerm}%`)
            .orWhere('origin_destination_iata', 'like', `%${filters.searchTerm}%`);
        });
      }
      
      // Get total count for pagination (separate query to avoid SQL GROUP BY issues)
      const countQuery = db('flights').count('id as count');
      
      // Apply the same filters to the count query
      if (filters.startDate && filters.endDate) {
        countQuery.whereBetween('scheduled_datetime', [filters.startDate, filters.endDate]);
      }
      
      if (filters.flightType && filters.flightType !== 'all') {
        countQuery.where('flight_nature', filters.flightType);
      }
      
      if (filters.airline && filters.airline !== 'all') {
        countQuery.where('airline_iata', filters.airline);
      }
      
      if (filters.terminal && filters.terminal !== 'all') {
        countQuery.where('terminal', filters.terminal);
      }
      
      if (filters.status && filters.status !== 'all') {
        countQuery.where('validation_status', filters.status);
      }
      
      if (filters.uploadId) {
        countQuery.where('upload_id', filters.uploadId);
      }
      
      if (filters.searchTerm) {
        countQuery.where(function() {
          this.where('flight_number', 'like', `%${filters.searchTerm}%`)
            .orWhere('airline_iata', 'like', `%${filters.searchTerm}%`)
            .orWhere('origin_destination_iata', 'like', `%${filters.searchTerm}%`);
        });
      }
      
      const countResult = await countQuery.first();
      const count = countResult ? parseInt(countResult.count, 10) : 0;
      
      // Apply pagination
      const offset = (page - 1) * pageSize;
      query.offset(offset).limit(pageSize);
      
      // Apply sorting - always sort by scheduled_datetime ascending by default
      if (filters.sortBy) {
        const sortOrder = filters.sortOrder === 'desc' ? 'desc' : 'asc';
        query.orderBy(filters.sortBy, sortOrder);
      } else {
        query.orderBy('scheduled_datetime', 'asc');
      }
      
      // Execute query
      const flights = await query;
      console.log(`Fetched ${flights.length} flights from database.`);
      
      // Enhance flight data with full names
      const enhancedFlights = await this.enhanceFlightData(flights);
      
      return {
        data: enhancedFlights,
        meta: {
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize)
        }
      };
    } catch (error) {
      console.error('Error getting flights:', error);
      throw error;
    }
  }
  
  /**
   * Get flights for a specific date range
   * @param {String} startDate - Start date
   * @param {String} endDate - End date
   * @returns {Promise<Array>} List of flights
   */
  async getFlightsByDate(startDate, endDate) {
    return db('flights')
      .whereBetween('scheduled_datetime', [startDate, endDate])
      .orderBy('scheduled_datetime', 'asc');
  }
  
  /**
   * Get detailed information for a specific flight
   * @param {String} id - Flight ID
   * @returns {Promise<Object>} Flight details
   */
  async getFlightDetails(id) {
    const flight = await db('flights').where('id', id).first();
    
    if (!flight) {
      throw new Error('Flight not found');
    }
    
    // Get related information if needed
    // Note: Commented out because these tables might not exist
    // const airline = await db('airlines').where('code', flight.airline_iata).first();
    // const aircraft = await db('aircraft_types').where('code', flight.aircraft_type_iata).first();
    
    return {
      ...flight,
      // airline: airline || null,
      // aircraft: aircraft || null
    };
  }
  
  /**
   * Get statistics about flight data
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Flight statistics
   */
  async getFlightStatistics(filters = {}) {
    try {
      let query = db('flights');
      
      // Apply date filters
      if (filters.startDate && filters.endDate) {
        query = query.whereBetween('scheduled_datetime', [filters.startDate, filters.endDate]);
      }
      
      // Filter by upload ID
      if (filters.uploadId) {
        query = query.where('upload_id', filters.uploadId);
      }
      
      // Get total count
      const totalResult = await query.clone().count('id as total').first();
      const total = totalResult ? parseInt(totalResult.total, 10) : 0;
      
      // Get flights by validation status
      const statusStats = await query.clone()
        .select('validation_status')
        .count('id as count')
        .groupBy('validation_status');
      
      // Get flights by airline
      const airlineStats = await query.clone()
        .select('airline_iata as airline_code')
        .count('id as count')
        .groupBy('airline_iata')
        .orderBy('count', 'desc')
        .limit(10);
      
      // Get flights by terminal
      const terminalStats = await query.clone()
        .select('terminal')
        .count('id as count')
        .groupBy('terminal');
      
      // Get flights by hour of day
      const hourlyStats = await query.clone()
        .select(db.raw("EXTRACT(HOUR FROM scheduled_datetime) as hour"))
        .count('id as count')
        .groupBy('hour')
        .orderBy('hour');
      
      // Get flights by nature (arrival/departure)
      const flightNatureStats = await query.clone()
        .select('flight_nature as type')
        .count('id as count')
        .groupBy('flight_nature');
      
      return {
        total,
        byStatus: statusStats,
        byAirline: airlineStats,
        byTerminal: terminalStats,
        byHour: hourlyStats,
        byFlightNature: flightNatureStats
      };
    } catch (error) {
      console.error('Error getting flight statistics:', error);
      throw error;
    }
  }

  /**
   * Delete flights by ID or query parameters
   * @param {Array|Object} params - Flight IDs or filter criteria
   * @returns {Promise<Number>} Number of deleted flights
   */
  async deleteFlights(params) {
    let query = db('flights');
    
    if (Array.isArray(params)) {
      // Delete by IDs
      query = query.whereIn('id', params);
    } else {
      // Delete by filter criteria
      if (params.startDate && params.endDate) {
        query = query.whereBetween('scheduled_datetime', [params.startDate, params.endDate]);
      }
      
      if (params.airline) {
        query = query.where('airline_code', params.airline);
      }
      
      if (params.terminal) {
        query = query.where('terminal', params.terminal);
      }
    }
    
    return query.delete();
  }
}

module.exports = new FlightDataService(); 