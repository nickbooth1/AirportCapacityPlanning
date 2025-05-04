/**
 * AirportController.js
 * Controller for Airport API endpoints
 */

const Airport = require('../models/Airport');
const { NotFoundError, ValidationError } = require('../errors');
const redis = require('../config/redis');
const CACHE_TTL = 3600; // Cache for 1 hour

class AirportController {
  /**
   * Get airport by IATA code
   */
  static async getByIataCode(req, res, next) {
    try {
      const { code } = req.params;
      
      // Validate IATA code format
      const validation = Airport.validateIataCode(code);
      if (validation.error) {
        return res.status(400).json({ 
          error: 'Invalid IATA code format',
          details: validation.error.message
        });
      }
      
      // Check cache first
      const cacheKey = `airport:iata:${code}`;
      const cachedAirport = await redis.get(cacheKey);
      
      if (cachedAirport) {
        return res.json(JSON.parse(cachedAirport));
      }
      
      // Find in database
      const airport = await Airport.query()
        .findOne({ iata_code: code.toUpperCase() });
      
      if (!airport) {
        return res.status(404).json({ 
          error: 'Airport not found',
          details: `No airport found with IATA code ${code}`
        });
      }
      
      // Cache result
      await redis.set(cacheKey, JSON.stringify(airport), 'EX', CACHE_TTL);
      
      return res.json(airport);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get airport by ICAO code
   */
  static async getByIcaoCode(req, res, next) {
    try {
      const { code } = req.params;
      
      // Validate ICAO code format
      const validation = Airport.validateIcaoCode(code);
      if (validation.error) {
        return res.status(400).json({ 
          error: 'Invalid ICAO code format',
          details: validation.error.message
        });
      }
      
      // Check cache first
      const cacheKey = `airport:icao:${code}`;
      const cachedAirport = await redis.get(cacheKey);
      
      if (cachedAirport) {
        return res.json(JSON.parse(cachedAirport));
      }
      
      // Find in database
      const airport = await Airport.query()
        .findOne({ icao_code: code.toUpperCase() });
      
      if (!airport) {
        return res.status(404).json({ 
          error: 'Airport not found',
          details: `No airport found with ICAO code ${code}`
        });
      }
      
      // Cache result
      await redis.set(cacheKey, JSON.stringify(airport), 'EX', CACHE_TTL);
      
      return res.json(airport);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Search airports by name, city, country, etc.
   */
  static async searchAirports(req, res, next) {
    try {
      const { q, limit = 20, offset = 0, type, country, status = 'active' } = req.query;
      
      // Build query
      let query = Airport.query()
        .where('status', status)
        .limit(limit)
        .offset(offset)
        .orderBy('name');
      
      // Apply filters
      if (q) {
        query = query.where(builder => {
          builder.where('name', 'ILIKE', `%${q}%`)
            .orWhere('city', 'ILIKE', `%${q}%`)
            .orWhere('iata_code', 'ILIKE', `%${q}%`)
            .orWhere('icao_code', 'ILIKE', `%${q}%`);
        });
      }
      
      if (type) {
        query = query.where('type', type);
      }
      
      if (country) {
        query = query.where('country', country.toUpperCase());
      }
      
      // Execute query
      const [airports, totalCount] = await Promise.all([
        query,
        Airport.query().count('id').where('status', status).first()
      ]);
      
      return res.json({
        data: airports,
        pagination: {
          total: parseInt(totalCount.count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Validate airport reference (IATA or ICAO code)
   */
  static async validateAirportReference(req, res, next) {
    try {
      const { code, type = 'auto' } = req.body;
      
      if (!code) {
        return res.status(400).json({ 
          error: 'Missing code parameter',
          details: 'A code parameter is required'
        });
      }
      
      let airport = null;
      
      // Auto-detect or use specified type
      if (type === 'auto' || type === 'iata') {
        if (code.length === 3) {
          const validation = Airport.validateIataCode(code);
          if (!validation.error) {
            airport = await Airport.query()
              .findOne({ iata_code: code.toUpperCase() });
            
            if (airport && type === 'iata') {
              return res.json({ valid: true, airport });
            }
          }
        }
      }
      
      if (type === 'auto' || type === 'icao') {
        if (code.length === 4) {
          const validation = Airport.validateIcaoCode(code);
          if (!validation.error) {
            airport = await Airport.query()
              .findOne({ icao_code: code.toUpperCase() });
            
            if (airport) {
              return res.json({ valid: true, airport });
            }
          }
        }
      }
      
      // No valid airport found
      return res.json({ 
        valid: false,
        message: `No valid airport found with ${type !== 'auto' ? type : ''} code ${code}`
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get airports within a radius
   */
  static async getAirportsInRadius(req, res, next) {
    try {
      const { lat, long, radius = 50 } = req.query;
      
      if (!lat || !long) {
        return res.status(400).json({ 
          error: 'Missing coordinates',
          details: 'Both lat and long parameters are required'
        });
      }
      
      const latitude = parseFloat(lat);
      const longitude = parseFloat(long);
      const radiusKm = parseInt(radius);
      
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ 
          error: 'Invalid latitude',
          details: 'Latitude must be between -90 and 90'
        });
      }
      
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Invalid longitude',
          details: 'Longitude must be between -180 and 180'
        });
      }
      
      if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
        return res.status(400).json({ 
          error: 'Invalid radius',
          details: 'Radius must be between 1 and 500 kilometers'
        });
      }
      
      const airports = await Airport.getAirportsInRadius(
        req.app.get('db'),
        latitude,
        longitude,
        radiusKm
      );
      
      return res.json({
        data: airports,
        meta: {
          count: airports.length,
          radius: radiusKm,
          coordinates: { latitude, longitude }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get nearest airport
   */
  static async getNearestAirport(req, res, next) {
    try {
      const { lat, long } = req.query;
      
      if (!lat || !long) {
        return res.status(400).json({ 
          error: 'Missing coordinates',
          details: 'Both lat and long parameters are required'
        });
      }
      
      const latitude = parseFloat(lat);
      const longitude = parseFloat(long);
      
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ 
          error: 'Invalid latitude',
          details: 'Latitude must be between -90 and 90'
        });
      }
      
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Invalid longitude',
          details: 'Longitude must be between -180 and 180'
        });
      }
      
      const airport = await Airport.getNearestAirport(
        req.app.get('db'),
        latitude,
        longitude
      );
      
      if (!airport) {
        return res.status(404).json({ 
          error: 'No airport found',
          details: 'No active airports in database'
        });
      }
      
      return res.json(airport);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create new airport
   */
  static async createAirport(req, res, next) {
    try {
      const airportData = req.body;
      
      // Validate required fields
      if (!airportData.name || !airportData.icao_code) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'name and icao_code are required'
        });
      }
      
      // Check for duplicate ICAO code
      const existingIcao = await Airport.query()
        .findOne({ icao_code: airportData.icao_code.toUpperCase() });
      
      if (existingIcao) {
        return res.status(409).json({ 
          error: 'Duplicate ICAO code',
          details: `Airport with ICAO code ${airportData.icao_code} already exists`
        });
      }
      
      // Check for duplicate IATA code if provided
      if (airportData.iata_code) {
        const existingIata = await Airport.query()
          .findOne({ iata_code: airportData.iata_code.toUpperCase() });
        
        if (existingIata) {
          return res.status(409).json({ 
            error: 'Duplicate IATA code',
            details: `Airport with IATA code ${airportData.iata_code} already exists`
          });
        }
      }
      
      // Set defaults
      airportData.status = airportData.status || 'active';
      airportData.last_updated = new Date().toISOString();
      airportData.data_source = 'manual';
      
      // Create airport
      const newAirport = await Airport.query().insert(airportData);
      
      return res.status(201).json(newAirport);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update airport
   */
  static async updateAirport(req, res, next) {
    try {
      const { id } = req.params;
      const airportData = req.body;
      
      // Find airport
      const airport = await Airport.query().findById(id);
      
      if (!airport) {
        return res.status(404).json({ 
          error: 'Airport not found',
          details: `No airport found with ID ${id}`
        });
      }
      
      // Check for duplicate ICAO if changing
      if (airportData.icao_code && airportData.icao_code !== airport.icao_code) {
        const existingIcao = await Airport.query()
          .findOne({ icao_code: airportData.icao_code.toUpperCase() });
        
        if (existingIcao && existingIcao.id !== parseInt(id)) {
          return res.status(409).json({ 
            error: 'Duplicate ICAO code',
            details: `Airport with ICAO code ${airportData.icao_code} already exists`
          });
        }
      }
      
      // Check for duplicate IATA if changing
      if (airportData.iata_code && airportData.iata_code !== airport.iata_code) {
        const existingIata = await Airport.query()
          .findOne({ iata_code: airportData.iata_code.toUpperCase() });
        
        if (existingIata && existingIata.id !== parseInt(id)) {
          return res.status(409).json({ 
            error: 'Duplicate IATA code',
            details: `Airport with IATA code ${airportData.iata_code} already exists`
          });
        }
      }
      
      // Update timestamp
      airportData.last_updated = new Date().toISOString();
      
      // Update airport
      const updatedAirport = await Airport.query()
        .patchAndFetchById(id, airportData);
      
      // Clear cache for this airport
      if (updatedAirport.iata_code) {
        await redis.del(`airport:iata:${updatedAirport.iata_code}`);
      }
      if (updatedAirport.icao_code) {
        await redis.del(`airport:icao:${updatedAirport.icao_code}`);
      }
      
      return res.json(updatedAirport);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update airport status
   */
  static async updateAirportStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          details: 'Status must be either "active" or "inactive"'
        });
      }
      
      // Find airport
      const airport = await Airport.query().findById(id);
      
      if (!airport) {
        return res.status(404).json({ 
          error: 'Airport not found',
          details: `No airport found with ID ${id}`
        });
      }
      
      // Update status
      const updatedAirport = await Airport.query()
        .patchAndFetchById(id, { 
          status, 
          last_updated: new Date().toISOString() 
        });
      
      // Clear cache for this airport
      if (updatedAirport.iata_code) {
        await redis.del(`airport:iata:${updatedAirport.iata_code}`);
      }
      if (updatedAirport.icao_code) {
        await redis.del(`airport:icao:${updatedAirport.icao_code}`);
      }
      
      return res.json(updatedAirport);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AirportController; 