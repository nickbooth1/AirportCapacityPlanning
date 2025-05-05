const express = require('express');
const router = express.Router();
const FlightDataController = require('../../controllers/FlightDataController');

/**
 * @route GET /api/flights
 * @description Get flights with query parameters
 * @access Public
 */
router.get('/', FlightDataController.getFlights);

/**
 * @route GET /api/flights/stats
 * @description Get flight statistics
 * @access Public
 */
router.get('/stats', FlightDataController.getFlightStats);

/**
 * @route GET /api/flights/:id
 * @description Get a specific flight
 * @access Public
 */
router.get('/:id', FlightDataController.getFlightById);

/**
 * @route DELETE /api/flights
 * @description Delete flights with query parameters
 * @access Private
 */
router.delete('/', FlightDataController.deleteFlights);

/**
 * @route DELETE /api/flights/:id
 * @description Delete a specific flight
 * @access Private
 */
router.delete('/:id', (req, res) => {
  // Add the ID to the body and use the deleteFlights controller method
  req.body.ids = [req.params.id];
  FlightDataController.deleteFlights(req, res);
});

module.exports = router; 