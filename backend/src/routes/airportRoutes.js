const express = require('express');
const router = express.Router();
const AirportController = require('../controllers/AirportController');

// GET routes
router.get('/', AirportController.getAllAirports);
router.get('/iata/:code', AirportController.getAirportByIATA);
router.get('/icao/:code', AirportController.getAirportByICAO);
router.get('/radius', AirportController.getAirportsInRadius);
router.get('/nearest', AirportController.getNearestAirport);
router.get('/validate', AirportController.validateAirport);
router.get('/search', AirportController.searchAirports);
router.get('/:id', AirportController.getAirportById);

// POST routes
router.post('/', AirportController.createAirport);
router.post('/import', AirportController.importAirports);

// PUT routes
router.put('/:id', AirportController.updateAirport);

// DELETE routes (soft delete)
router.delete('/:id', AirportController.deactivateAirport);

module.exports = router; 