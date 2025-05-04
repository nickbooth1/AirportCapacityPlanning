const express = require('express');
const router = express.Router();
const AirlineController = require('../controllers/AirlineController');

// GET routes
router.get('/', AirlineController.getAirlines);
router.get('/validate', AirlineController.validateAirline);
router.get('/iata/:code', AirlineController.getAirlineByIATA);
router.get('/icao/:code', AirlineController.getAirlineByICAO);
router.get('/:id', AirlineController.getAirlineById);

// POST routes
router.post('/', AirlineController.createAirline);
router.post('/import', AirlineController.importAirlines);

// PUT routes
router.put('/:id', AirlineController.updateAirline);

// DELETE/deactivate route
router.put('/:id/deactivate', AirlineController.deactivateAirline);

module.exports = router; 