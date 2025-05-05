const FlightDataService = require('../services/FlightDataService');

/**
 * Controller for flight data operations
 */
class FlightDataController {
  /**
   * Get flights with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFlights(req, res) {
    try {
      const { 
        page = 1, 
        pageSize = 25, 
        sortBy = 'scheduled_datetime',
        sortOrder = 'asc',
        searchTerm,
        startDate,
        endDate,
        flightType,
        airline,
        terminal,
        status,
        uploadId
      } = req.query;
      
      // Prepare filters
      const filters = {
        searchTerm,
        startDate,
        endDate,
        flightType: flightType !== 'all' ? flightType : null,
        airline: airline !== 'all' ? airline : null,
        terminal: terminal !== 'all' ? terminal : null,
        status: status !== 'all' ? status : null,
        sortBy,
        sortOrder,
        uploadId: uploadId !== 'all' ? uploadId : null
      };
      
      // Get flights from service
      const result = await FlightDataService.getAllFlights(
        filters,
        parseInt(page, 10),
        parseInt(pageSize, 10)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error getting flights:', error);
      res.status(500).json({ error: 'Failed to retrieve flight data' });
    }
  }
  
  /**
   * Get detailed information for a specific flight
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFlightById(req, res) {
    try {
      const { id } = req.params;
      const flight = await FlightDataService.getFlightDetails(id);
      res.json(flight);
    } catch (error) {
      console.error('Error getting flight details:', error);
      if (error.message === 'Flight not found') {
        res.status(404).json({ error: 'Flight not found' });
      } else {
        res.status(500).json({ error: 'Failed to retrieve flight details' });
      }
    }
  }
  
  /**
   * Get flight statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFlightStats(req, res) {
    try {
      const { startDate, endDate, uploadId } = req.query;
      
      // Prepare filters
      const filters = {
        startDate,
        endDate,
        uploadId: uploadId !== 'all' ? uploadId : null
      };
      
      // Get statistics from service
      const stats = await FlightDataService.getFlightStatistics(filters);
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting flight statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve flight statistics' });
    }
  }
  
  /**
   * Delete flights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteFlights(req, res) {
    try {
      const { ids } = req.body;
      
      let deletedCount;
      if (ids && ids.length > 0) {
        // Delete by IDs
        deletedCount = await FlightDataService.deleteFlights(ids);
      } else {
        // Delete by query parameters
        const { startDate, endDate, airline, terminal } = req.query;
        deletedCount = await FlightDataService.deleteFlights({
          startDate,
          endDate,
          airline,
          terminal
        });
      }
      
      res.json({
        success: true,
        deletedCount
      });
    } catch (error) {
      console.error('Error deleting flights:', error);
      res.status(500).json({ error: 'Failed to delete flights' });
    }
  }
}

module.exports = new FlightDataController(); 