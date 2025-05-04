const express = require('express');
const router = express.Router();
const aircraftTypesController = require('../controllers/aircraftTypesController');

/**
 * @route GET /api/aircraft-types
 * @desc Get all aircraft types
 * @access Public
 */
router.get('/', aircraftTypesController.getAllAircraftTypes);

/**
 * @route GET /api/aircraft-types/:id
 * @desc Get aircraft type by ID
 * @access Public
 */
router.get('/:id', aircraftTypesController.getAircraftTypeById);

/**
 * @route POST /api/aircraft-types
 * @desc Create a new aircraft type
 * @access Private
 */
router.post('/', aircraftTypesController.createAircraftType);

/**
 * @route PUT /api/aircraft-types/:id
 * @desc Update an aircraft type
 * @access Private
 */
router.put('/:id', aircraftTypesController.updateAircraftType);

/**
 * @route DELETE /api/aircraft-types/:id
 * @desc Delete an aircraft type
 * @access Private
 */
router.delete('/:id', aircraftTypesController.deleteAircraftType);

module.exports = router; 