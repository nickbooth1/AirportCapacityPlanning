const express = require('express');
const router = express.Router();
const AirportController = require('../../controllers/AirportController');

/**
 * @route   GET /api/airports
 * @desc    Get all airports with pagination and filtering
 * @access  Public
 */
router.get('/', AirportController.getAllAirports);

/**
 * @route   GET /api/airports/search
 * @desc    Search airports by query
 * @access  Public
 */
router.get('/search', AirportController.searchAirports);

/**
 * @route   GET /api/airports/iata/:code
 * @desc    Get airport by IATA code
 * @access  Public
 */
router.get('/iata/:code', AirportController.getAirportByIATA);

/**
 * @route   GET /api/airports/icao/:code
 * @desc    Get airport by ICAO code
 * @access  Public
 */
router.get('/icao/:code', AirportController.getAirportByICAO);

/**
 * @route   GET /api/airports/radius
 * @desc    Get airports within a radius from coordinates
 * @access  Public
 */
router.get('/radius', AirportController.getAirportsInRadius);

/**
 * @route   GET /api/airports/nearest
 * @desc    Get nearest airport to coordinates
 * @access  Public
 */
router.get('/nearest', AirportController.getNearestAirport);

/**
 * @route   GET /api/airports/:id
 * @desc    Get airport by ID
 * @access  Public
 */
router.get('/:id', AirportController.getAirportById);

/**
 * @route   POST /api/airports
 * @desc    Create a new airport
 * @access  Admin
 */
router.post('/', AirportController.createAirport);

/**
 * @route   PUT /api/airports/:id
 * @desc    Update an existing airport
 * @access  Admin
 */
router.put('/:id', AirportController.updateAirport);

/**
 * @route   DELETE /api/airports/:id
 * @desc    Deactivate an airport (soft delete)
 * @access  Admin
 */
router.delete('/:id', AirportController.deactivateAirport);

module.exports = router; 