const AirlineService = require('../services/AirlineService');

class AirlineController {
  /**
   * Get all airlines with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirlines(req, res) {
    try {
      const { query } = req.query;
      const airlines = await AirlineService.findAirlines(query);
      
      res.json({
        success: true,
        data: airlines
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving airlines',
        error: error.message
      });
    }
  }

  /**
   * Get airline by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirlineById(req, res) {
    try {
      const { id } = req.params;
      const airline = await AirlineService.getAirline(id);
      
      if (!airline) {
        return res.status(404).json({
          success: false,
          message: 'Airline not found'
        });
      }
      
      res.json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving airline',
        error: error.message
      });
    }
  }

  /**
   * Get airline by IATA code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirlineByIATA(req, res) {
    try {
      const { code } = req.params;
      const airline = await AirlineService.getAirlineByIATA(code);
      
      if (!airline) {
        return res.status(404).json({
          success: false,
          message: 'Airline not found'
        });
      }
      
      res.json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving airline',
        error: error.message
      });
    }
  }

  /**
   * Get airline by ICAO code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirlineByICAO(req, res) {
    try {
      const { code } = req.params;
      const airline = await AirlineService.getAirlineByICAO(code);
      
      if (!airline) {
        return res.status(404).json({
          success: false,
          message: 'Airline not found'
        });
      }
      
      res.json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving airline',
        error: error.message
      });
    }
  }

  /**
   * Create a new airline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createAirline(req, res) {
    try {
      const airlineData = req.body;
      
      // Check if airline with IATA or ICAO code already exists
      if (airlineData.iata_code) {
        const existingIATA = await AirlineService.getAirlineByIATA(airlineData.iata_code);
        if (existingIATA) {
          return res.status(409).json({
            success: false,
            message: `Airline with IATA code ${airlineData.iata_code} already exists`
          });
        }
      }
      
      if (airlineData.icao_code) {
        const existingICAO = await AirlineService.getAirlineByICAO(airlineData.icao_code);
        if (existingICAO) {
          return res.status(409).json({
            success: false,
            message: `Airline with ICAO code ${airlineData.icao_code} already exists`
          });
        }
      }
      
      const airline = await AirlineService.createAirline(airlineData);
      
      res.status(201).json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating airline',
        error: error.message
      });
    }
  }

  /**
   * Update an existing airline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAirline(req, res) {
    try {
      const { id } = req.params;
      const airlineData = req.body;
      
      // Check if updating IATA code and ensuring it doesn't conflict
      if (airlineData.iata_code) {
        const existingIATA = await AirlineService.getAirlineByIATA(airlineData.iata_code);
        if (existingIATA && existingIATA.id !== parseInt(id, 10)) {
          return res.status(409).json({
            success: false,
            message: `Another airline with IATA code ${airlineData.iata_code} already exists`
          });
        }
      }
      
      // Check if updating ICAO code and ensuring it doesn't conflict
      if (airlineData.icao_code) {
        const existingICAO = await AirlineService.getAirlineByICAO(airlineData.icao_code);
        if (existingICAO && existingICAO.id !== parseInt(id, 10)) {
          return res.status(409).json({
            success: false,
            message: `Another airline with ICAO code ${airlineData.icao_code} already exists`
          });
        }
      }
      
      const airline = await AirlineService.updateAirline(id, airlineData);
      
      if (!airline) {
        return res.status(404).json({
          success: false,
          message: 'Airline not found'
        });
      }
      
      res.json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating airline',
        error: error.message
      });
    }
  }

  /**
   * Deactivate an airline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deactivateAirline(req, res) {
    try {
      const { id } = req.params;
      const airline = await AirlineService.deactivateAirline(id);
      
      if (!airline) {
        return res.status(404).json({
          success: false,
          message: 'Airline not found'
        });
      }
      
      res.json({
        success: true,
        data: airline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deactivating airline',
        error: error.message
      });
    }
  }

  /**
   * Import airlines from external data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async importAirlines(req, res) {
    try {
      const { airlines } = req.body;
      
      if (!airlines || !Array.isArray(airlines) || airlines.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: airlines array is required'
        });
      }
      
      const importResults = await AirlineService.bulkImport(airlines);
      
      res.json({
        success: true,
        data: importResults
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error importing airlines',
        error: error.message
      });
    }
  }

  /**
   * Validate an airline code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateAirline(req, res) {
    try {
      const { code, type = 'IATA' } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Airline code is required'
        });
      }
      
      const isValid = await AirlineService.validateAirlineReference(code, type);
      
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
        message: 'Error validating airline',
        error: error.message
      });
    }
  }
}

module.exports = new AirlineController(); 