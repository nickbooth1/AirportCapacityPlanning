const FlightValidationService = require('../services/FlightValidationService');
const FlightUploadService = require('../services/FlightUploadService');

class FlightValidationController {
  /**
   * Validate flights against rules
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateFlights(req, res) {
    try {
      const { id } = req.params;
      
      // Check if upload exists
      const uploadService = new FlightUploadService();
      const upload = await uploadService.getUploadById(id);
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      if (upload.upload_status !== 'completed') {
        return res.status(400).json({ 
          error: 'Upload is not ready for validation', 
          status: upload.upload_status 
        });
      }
      
      // Start validation
      const validationService = new FlightValidationService();
      
      // Start validation in the background
      validationService.validateFlightData(id).catch(error => {
        console.error(`Error validating flights for upload ${id}:`, error);
      });
      
      return res.json({ 
        message: 'Validation started',
        uploadId: id
      });
    } catch (error) {
      console.error('Error starting validation:', error);
      return res.status(500).json({ error: 'Failed to start validation' });
    }
  }
  
  /**
   * Get validation statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getValidationStats(req, res) {
    try {
      const { id } = req.params;
      
      const validationService = new FlightValidationService();
      const stats = await validationService.getValidationStats(id);
      
      if (!stats) {
        return res.status(404).json({ error: 'Upload not found or validation not completed' });
      }
      
      return res.json(stats);
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return res.status(500).json({ error: 'Failed to get validation statistics' });
    }
  }
  
  /**
   * Get arrival flights with validation status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getArrivalFlights(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100, validationStatus, sort = 'scheduled_datetime', direction = 'asc' } = req.query;
      
      const validationService = new FlightValidationService();
      
      const results = await validationService.getArrivalFlights(id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        validationStatus,
        sort,
        direction
      });
      
      if (!results) {
        return res.status(404).json({ error: 'Upload not found or validation not completed' });
      }
      
      return res.json(results);
    } catch (error) {
      console.error('Error getting arrival flights:', error);
      return res.status(500).json({ error: 'Failed to get arrival flights' });
    }
  }
  
  /**
   * Get departure flights with validation status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDepartureFlights(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100, validationStatus, sort = 'scheduled_datetime', direction = 'asc' } = req.query;
      
      const validationService = new FlightValidationService();
      
      const results = await validationService.getDepartureFlights(id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        validationStatus,
        sort,
        direction
      });
      
      if (!results) {
        return res.status(404).json({ error: 'Upload not found or validation not completed' });
      }
      
      return res.json(results);
    } catch (error) {
      console.error('Error getting departure flights:', error);
      return res.status(500).json({ error: 'Failed to get departure flights' });
    }
  }
  
  /**
   * Export validation report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportValidationReport(req, res) {
    try {
      const { id } = req.params;
      const { format = 'csv', flightNature, includeValid = true, includeInvalid = true } = req.query;
      
      // Convert string query params to boolean
      const includeValidBool = includeValid === 'true' || includeValid === true;
      const includeInvalidBool = includeInvalid === 'true' || includeInvalid === true;
      
      // Validate format
      const validFormats = ['csv', 'xlsx', 'json'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: `Invalid format. Supported formats: ${validFormats.join(', ')}` });
      }
      
      // Check if upload exists
      const uploadService = new FlightUploadService();
      const upload = await uploadService.getUploadById(id);
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      
      const validationService = new FlightValidationService();
      
      // Generate report data
      const reportData = await validationService.generateValidationReport(id, {
        flightNature,
        includeValid: includeValidBool,
        includeInvalid: includeInvalidBool
      });
      
      if (!reportData || reportData.flights.length === 0) {
        return res.status(404).json({ error: 'No data available for the report' });
      }
      
      // Format filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const flightTypeStr = flightNature ? `-${flightNature === 'A' ? 'arrivals' : 'departures'}` : '';
      const filename = `validation_report${flightTypeStr}_${timestamp}.${format}`;
      
      // Set content type based on format
      switch (format) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          const csvData = validationService.formatReportAsCSV(reportData);
          
          // If flightNature is specified, return the specific report
          if (flightNature === 'A' && csvData.arrivals) {
            return res.send(csvData.arrivals);
          } else if (flightNature === 'D' && csvData.departures) {
            return res.send(csvData.departures);
          } else {
            return res.send(csvData.all);
          }
          
        case 'xlsx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          const xlsxBuffer = await validationService.formatReportAsXLSX(reportData);
          return res.send(xlsxBuffer);
          
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          // If flightNature is specified, return the specific data
          if (flightNature === 'A') {
            return res.json({
              ...reportData,
              flights: reportData.arrivals
            });
          } else if (flightNature === 'D') {
            return res.json({
              ...reportData,
              flights: reportData.departures
            });
          } else {
            return res.json(reportData);
          }
          
        default:
          return res.status(400).json({ error: 'Unsupported format' });
      }
    } catch (error) {
      console.error('Error exporting validation report:', error);
      return res.status(500).json({ error: 'Failed to export validation report' });
    }
  }
}

module.exports = new FlightValidationController(); 