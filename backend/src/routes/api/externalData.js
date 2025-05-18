/**
 * External Data API Routes
 */

const express = require('express');
const router = express.Router();
const externalDataController = require('../../controllers/ExternalDataController');
const auth = require('../../middleware/auth');

/**
 * @route   GET /api/external/weather/forecast
 * @desc    Get weather forecast for airport
 * @access  Private
 */
router.get('/weather/forecast', auth, (req, res) => {
  return externalDataController.getWeatherForecast(req, res);
});

/**
 * @route   GET /api/external/airline-schedules
 * @desc    Get airline schedule updates
 * @access  Private
 */
router.get('/airline-schedules', auth, (req, res) => {
  return externalDataController.getAirlineSchedules(req, res);
});

/**
 * @route   GET /api/external/market-forecasts
 * @desc    Get market growth forecasts
 * @access  Private
 */
router.get('/market-forecasts', auth, (req, res) => {
  return externalDataController.getMarketForecasts(req, res);
});

/**
 * @route   GET /api/external/events
 * @desc    Get events from calendar
 * @access  Private
 */
router.get('/events', auth, (req, res) => {
  return externalDataController.getEvents(req, res);
});

/**
 * @route   POST /api/external/refresh
 * @desc    Refresh external data
 * @access  Private
 */
router.post('/refresh', auth, (req, res) => {
  return externalDataController.refreshExternalData(req, res);
});

module.exports = router;