/**
 * ExternalDataController.js
 * 
 * Controller for managing external data integration for weather, airline schedules,
 * market forecasts, and events.
 * 
 * Part of AirportAI Agent Phase 3 implementation.
 */

const logger = require('../utils/logger');
const ExternalDataConnectorService = require('../services/integration/ExternalDataConnectorService');

/**
 * Controller for managing external data integration
 */
class ExternalDataController {
  constructor() {
    // Initialize services
    this.externalDataService = new ExternalDataConnectorService({
      weatherApiConfig: {
        apiKey: process.env.WEATHER_API_KEY
      },
      airlineApiConfig: {
        apiKey: process.env.AIRLINE_API_KEY
      },
      marketApiConfig: {
        apiKey: process.env.MARKET_API_KEY
      },
      eventsApiConfig: {
        apiKey: process.env.EVENTS_API_KEY
      }
    });
    
    logger.info('ExternalDataController initialized');
  }
  
  /**
   * Get weather forecast for airport
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWeatherForecast(req, res) {
    try {
      logger.debug('Getting weather forecast');
      
      const options = {
        airportCode: req.query.airportCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        units: req.query.units || 'metric'
      };
      
      // Validate required parameters
      if (!options.airportCode || !options.startDate) {
        return res.status(400).json({ error: 'airportCode and startDate are required' });
      }
      
      // Get forecast
      const forecast = await this.externalDataService.getWeatherForecast(options);
      
      return res.json(forecast);
    } catch (error) {
      logger.error(`Error getting weather forecast: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve weather forecast' });
    }
  }
  
  /**
   * Get airline schedule updates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAirlineSchedules(req, res) {
    try {
      logger.debug('Getting airline schedules');
      
      const options = {
        airline: req.query.airline,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      // Validate required parameters
      if (!options.startDate) {
        return res.status(400).json({ error: 'startDate is required' });
      }
      
      // Get schedules
      const schedules = await this.externalDataService.getAirlineSchedules(options);
      
      return res.json(schedules);
    } catch (error) {
      logger.error(`Error getting airline schedules: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve airline schedules' });
    }
  }
  
  /**
   * Get market growth forecasts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMarketForecasts(req, res) {
    try {
      logger.debug('Getting market forecasts');
      
      const options = {
        timeHorizon: req.query.timeHorizon || 'medium_term',
        region: req.query.region,
        segment: req.query.segment
      };
      
      // Get forecasts
      const forecasts = await this.externalDataService.getMarketForecasts(options);
      
      return res.json(forecasts);
    } catch (error) {
      logger.error(`Error getting market forecasts: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve market forecasts' });
    }
  }
  
  /**
   * Get events from calendar
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEvents(req, res) {
    try {
      logger.debug('Getting events');
      
      const options = {
        airportCode: req.query.airportCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        category: req.query.category
      };
      
      // Validate required parameters
      if (!options.airportCode || !options.startDate) {
        return res.status(400).json({ error: 'airportCode and startDate are required' });
      }
      
      // Get events
      const events = await this.externalDataService.getEvents(options);
      
      return res.json(events);
    } catch (error) {
      logger.error(`Error getting events: ${error.message}`);
      return res.status(500).json({ error: 'Failed to retrieve events' });
    }
  }
  
  /**
   * Refresh external data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshExternalData(req, res) {
    try {
      logger.debug('Refreshing external data');
      
      const options = {
        skipWeather: req.body.skipWeather === true,
        skipAirlineSchedules: req.body.skipAirlineSchedules === true,
        skipMarketForecasts: req.body.skipMarketForecasts === true,
        skipEvents: req.body.skipEvents === true
      };
      
      // Refresh data
      const result = await this.externalDataService.performPeriodicRefresh(options);
      
      return res.json(result);
    } catch (error) {
      logger.error(`Error refreshing external data: ${error.message}`);
      return res.status(500).json({ error: 'Failed to refresh external data' });
    }
  }
}

module.exports = new ExternalDataController();