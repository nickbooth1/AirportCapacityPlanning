const express = require('express');
const router = express.Router();
const GroundHandlingAgentController = require('../controllers/GroundHandlingAgentController');

/**
 * GHA API Routes
 */

// GET /api/ghas - Get all GHAs with pagination and filtering
router.get('/', GroundHandlingAgentController.getAllGHAs);

// GET /api/ghas/search - Search for GHAs by name
router.get('/search', GroundHandlingAgentController.searchGHAs);

// GET /api/ghas/airport/:code - Get GHAs operating at a specific airport
router.get('/airport/:code', GroundHandlingAgentController.getGHAsByAirport);

// GET /api/ghas/validate - Validate if a GHA operates at a specific airport
router.get('/validate', GroundHandlingAgentController.validateGHAAtAirport);

// GET /api/ghas/:id - Get a specific GHA by ID
router.get('/:id', GroundHandlingAgentController.getGHAById);

// POST /api/ghas - Create a new GHA
router.post('/', GroundHandlingAgentController.createGHA);

// POST /api/ghas/import - Import multiple GHAs
router.post('/import', GroundHandlingAgentController.importGHAs);

// PUT /api/ghas/:id - Update an existing GHA
router.put('/:id', GroundHandlingAgentController.updateGHA);

// DELETE /api/ghas/:id - Delete a GHA
router.delete('/:id', GroundHandlingAgentController.deleteGHA);

// POST /api/ghas/:gha_id/airports/:airport_id - Associate a GHA with an airport
router.post('/:gha_id/airports/:airport_id', GroundHandlingAgentController.addAirportRelation);

// DELETE /api/ghas/:gha_id/airports/:airport_id - Remove a GHA's association with an airport
router.delete('/:gha_id/airports/:airport_id', GroundHandlingAgentController.removeAirportRelation);

module.exports = router; 