const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

/**
 * Controller for Ground Handling Agent API endpoints
 */
class GroundHandlingAgentController {
  /**
   * Get all GHAs with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllGHAs(req, res) {
    try {
      console.log('GET /api/ghas request received with query:', req.query);
      
      const filter = {
        query: req.query.q,
        country: req.query.country,
        status: req.query.status,
        serviceType: req.query.service_type,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortBy: req.query.sort_by,
        sortDir: req.query.sort_dir
      };
      
      console.log('Processing filter:', filter);
      
      try {
        const ghas = await GroundHandlingAgentService.getAllGHAs(filter);
        console.log(`Successfully retrieved ${ghas.length} GHAs`);
        
        const total = await GroundHandlingAgentService.getGHACount(filter);
        console.log(`Total GHA count: ${total}`);
        
        // Calculate pagination metadata
        const page = parseInt(filter.page);
        const limit = parseInt(filter.limit);
        const totalPages = Math.ceil(total / limit);
        
        res.json({
          data: ghas,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });
      } catch (serviceError) {
        console.error('Error in service layer:', serviceError);
        throw serviceError;
      }
    } catch (error) {
      console.error('Error getting GHAs:', error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      if (error.code) {
        console.error('Error code:', error.code);
      }
      res.status(500).json({ error: 'Failed to retrieve ground handling agents', details: error.message });
    }
  }

  /**
   * Get a specific GHA by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGHAById(req, res) {
    try {
      const ghaId = req.params.id;
      const gha = await GroundHandlingAgentService.getGHAById(ghaId);
      
      if (!gha) {
        return res.status(404).json({ error: 'Ground handling agent not found' });
      }
      
      res.json(gha);
    } catch (error) {
      console.error(`Error getting GHA ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve ground handling agent' });
    }
  }

  /**
   * Search for GHAs by name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchGHAs(req, res) {
    try {
      const query = req.query.q;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const ghas = await GroundHandlingAgentService.findGHAsByName(query);
      res.json(ghas);
    } catch (error) {
      console.error('Error searching GHAs:', error);
      res.status(500).json({ error: 'Failed to search ground handling agents' });
    }
  }

  /**
   * Get GHAs operating at a specific airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGHAsByAirport(req, res) {
    try {
      const airportCode = req.params.code;
      
      if (!airportCode) {
        return res.status(400).json({ error: 'Airport code is required' });
      }
      
      const ghas = await GroundHandlingAgentService.findGHAsByAirport(airportCode);
      res.json(ghas);
    } catch (error) {
      console.error(`Error getting GHAs for airport ${req.params.code}:`, error);
      res.status(500).json({ error: 'Failed to retrieve ground handling agents for the specified airport' });
    }
  }

  /**
   * Create a new GHA
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createGHA(req, res) {
    try {
      const ghaData = req.body;
      
      // Validate required fields
      if (!ghaData.name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const newGHA = await GroundHandlingAgentService.createGHA({
        ...ghaData,
        last_updated: new Date().toISOString()
      });
      
      res.status(201).json(newGHA);
    } catch (error) {
      console.error('Error creating GHA:', error);
      res.status(500).json({ error: 'Failed to create ground handling agent' });
    }
  }

  /**
   * Update an existing GHA
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateGHA(req, res) {
    try {
      const ghaId = req.params.id;
      const ghaData = req.body;
      
      // Check if GHA exists
      const gha = await GroundHandlingAgentService.getGHAById(ghaId);
      
      if (!gha) {
        return res.status(404).json({ error: 'Ground handling agent not found' });
      }
      
      // Update the GHA
      const updatedGHA = await GroundHandlingAgentService.updateGHA(ghaId, ghaData);
      
      res.json(updatedGHA);
    } catch (error) {
      console.error(`Error updating GHA ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update ground handling agent' });
    }
  }

  /**
   * Delete a GHA
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteGHA(req, res) {
    try {
      const ghaId = req.params.id;
      
      // Check if GHA exists
      const gha = await GroundHandlingAgentService.getGHAById(ghaId);
      
      if (!gha) {
        return res.status(404).json({ error: 'Ground handling agent not found' });
      }
      
      // Delete the GHA
      await GroundHandlingAgentService.deleteGHA(ghaId);
      
      res.status(204).end();
    } catch (error) {
      console.error(`Error deleting GHA ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete ground handling agent' });
    }
  }

  /**
   * Import multiple GHAs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async importGHAs(req, res) {
    try {
      const ghas = req.body;
      
      if (!Array.isArray(ghas)) {
        return res.status(400).json({ error: 'Request body must be an array of ground handling agents' });
      }
      
      const results = await GroundHandlingAgentService.bulkImport(ghas);
      
      res.json({
        message: 'Import completed',
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        errorDetails: results.errors
      });
    } catch (error) {
      console.error('Error importing GHAs:', error);
      res.status(500).json({ error: 'Failed to import ground handling agents' });
    }
  }

  /**
   * Validate if a GHA operates at a specific airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateGHAAtAirport(req, res) {
    try {
      const { gha_name, airport_code } = req.query;
      
      if (!gha_name || !airport_code) {
        return res.status(400).json({ error: 'GHA name and airport code are required' });
      }
      
      const isValid = await GroundHandlingAgentService.validateGHAAtAirport(gha_name, airport_code);
      
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error validating GHA at airport:', error);
      res.status(500).json({ error: 'Failed to validate ground handling agent at airport' });
    }
  }

  /**
   * Associate a GHA with an airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addAirportRelation(req, res) {
    try {
      const { gha_id, airport_id } = req.params;
      const relationData = req.body;
      
      const relation = await GroundHandlingAgentService.addAirportRelation(
        gha_id,
        airport_id,
        relationData
      );
      
      res.status(201).json(relation);
    } catch (error) {
      console.error('Error adding airport relation:', error);
      res.status(500).json({ error: 'Failed to associate GHA with airport' });
    }
  }

  /**
   * Remove a GHA's association with an airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeAirportRelation(req, res) {
    try {
      const { gha_id, airport_id } = req.params;
      
      await GroundHandlingAgentService.removeAirportRelation(gha_id, airport_id);
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing airport relation:', error);
      res.status(500).json({ error: 'Failed to remove GHA-airport association' });
    }
  }
}

module.exports = new GroundHandlingAgentController(); 