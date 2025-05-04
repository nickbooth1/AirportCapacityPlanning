const AirportService = require('../services/AirportService');

class AirportController {
  /**
   * Get all airports with optional pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllAirports(req, res) {
    try {
      const { 
        page = 1, 
        limit = 100,
        search = '',
        type = '',
        country = '',
        status = 'active'
      } = req.query;
      
      // Convert page and limit to integers
      const pageInt = parseInt(page, 10);
      const limitInt = parseInt(limit, 10);
      
      // Get airports with pagination and filters
      const result = await AirportService.getAllAirports({
        page: pageInt,
        limit: limitInt,
        search,
        type,
        country,
        status
      });
      
      return res.json({
        success: true,
        message: 'Airports retrieved successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: pageInt,
          limit: limitInt,
          totalPages: Math.ceil(result.total / limitInt)
        }
      });
    } catch (error) {
      console.error('Error getting airports:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving airports',
        error: error.message
      });
    }
  }
  
  /**
   * Get an airport by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirportById(req, res) {
    try {
      const { id } = req.params;
      const airport = await AirportService.getAirport(id);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: `Airport with ID ${id} not found`
        });
      }
      
      return res.json({
        success: true,
        message: 'Airport retrieved successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error getting airport:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving airport',
        error: error.message
      });
    }
  }
  
  /**
   * Get an airport by IATA code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirportByIATA(req, res) {
    try {
      const { code } = req.params;
      const airport = await AirportService.getAirportByIATA(code);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: `Airport with IATA code ${code} not found`
        });
      }
      
      return res.json({
        success: true,
        message: 'Airport retrieved successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error getting airport by IATA:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving airport',
        error: error.message
      });
    }
  }
  
  /**
   * Get an airport by ICAO code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirportByICAO(req, res) {
    try {
      const { code } = req.params;
      const airport = await AirportService.getAirportByICAO(code);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: `Airport with ICAO code ${code} not found`
        });
      }
      
      return res.json({
        success: true,
        message: 'Airport retrieved successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error getting airport by ICAO:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving airport',
        error: error.message
      });
    }
  }
  
  /**
   * Search airports by query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchAirports(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }
      
      const airports = await AirportService.findAirports(query);
      
      return res.json({
        success: true,
        message: 'Airports search completed',
        data: airports
      });
    } catch (error) {
      console.error('Error searching airports:', error);
      return res.status(500).json({
        success: false,
        message: 'Error searching airports',
        error: error.message
      });
    }
  }
  
  /**
   * Create a new airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createAirport(req, res) {
    try {
      const airport = await AirportService.createAirport(req.body);
      return res.status(201).json({
        success: true,
        message: 'Airport created successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error creating airport:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating airport',
        error: error.message
      });
    }
  }
  
  /**
   * Update an airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAirport(req, res) {
    try {
      const { id } = req.params;
      const airport = await AirportService.updateAirport(id, req.body);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: `Airport with ID ${id} not found`
        });
      }
      
      return res.json({
        success: true,
        message: 'Airport updated successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error updating airport:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating airport',
        error: error.message
      });
    }
  }
  
  /**
   * Deactivate an airport (soft delete)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deactivateAirport(req, res) {
    try {
      const { id } = req.params;
      const airport = await AirportService.deactivateAirport(id);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: `Airport with ID ${id} not found`
        });
      }
      
      return res.json({
        success: true,
        message: 'Airport deactivated successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error deactivating airport:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deactivating airport',
        error: error.message
      });
    }
  }
  
  /**
   * Get airports within a radius
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirportsInRadius(req, res) {
    try {
      const { lat, lon, radius = 100 } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }
      
      const latFloat = parseFloat(lat);
      const lonFloat = parseFloat(lon);
      const radiusFloat = parseFloat(radius);
      
      if (isNaN(latFloat) || isNaN(lonFloat) || isNaN(radiusFloat)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates or radius'
        });
      }
      
      const airports = await AirportService.getAirportsInRadius(latFloat, lonFloat, radiusFloat);
      
      return res.json({
        success: true,
        message: 'Airports retrieved successfully',
        data: airports,
        meta: {
          center: { lat: latFloat, lon: lonFloat },
          radius: radiusFloat,
          count: airports.length
        }
      });
    } catch (error) {
      console.error('Error getting airports in radius:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving airports',
        error: error.message
      });
    }
  }
  
  /**
   * Get the nearest airport to coordinates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getNearestAirport(req, res) {
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }
      
      const latFloat = parseFloat(lat);
      const lonFloat = parseFloat(lon);
      
      if (isNaN(latFloat) || isNaN(lonFloat)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }
      
      const airport = await AirportService.getNearestAirport(latFloat, lonFloat);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          message: 'No airport found'
        });
      }
      
      return res.json({
        success: true,
        message: 'Nearest airport retrieved successfully',
        data: airport
      });
    } catch (error) {
      console.error('Error getting nearest airport:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving nearest airport',
        error: error.message
      });
    }
  }

  /**
   * Validate an airport code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateAirport(req, res) {
    try {
      const { code, type = 'IATA' } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Airport code is required'
        });
      }
      
      const isValid = await AirportService.validateAirportReference(code, type);
      
      res.json({
        success: true,
        data: {
          code,
          type,
          isValid
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error validating airport',
        error: error.message
      });
    }
  }

  /**
   * Import airports from external data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async importAirports(req, res) {
    try {
      const { airports } = req.body;
      
      if (!airports || !Array.isArray(airports) || airports.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: airports array is required'
        });
      }
      
      const importResults = await AirportService.bulkImport(airports);
      
      res.json({
        success: true,
        data: importResults
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error importing airports',
        error: error.message
      });
    }
  }
}

module.exports = new AirportController(); 