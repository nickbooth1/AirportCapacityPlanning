/**
 * Airport Configuration Routes
 * 
 * API endpoints for managing airport configuration settings.
 */

const express = require('express');
const router = express.Router();
const airportConfigController = require('../controllers/airportConfigController');

// Get airport configuration
router.get('/', airportConfigController.getAirportConfig);

// Update airport configuration
router.put('/', airportConfigController.updateAirportConfig);

// Get airline terminal allocations
router.get('/allocations', airportConfigController.getAirlineTerminalAllocations);

// Add a new airline terminal allocation
router.post('/allocations', airportConfigController.addAirlineTerminalAllocation);

// Update an airline terminal allocation
router.put('/allocations/:id', airportConfigController.updateAirlineTerminalAllocation);

// Delete an airline terminal allocation
router.delete('/allocations/:id', airportConfigController.deleteAirlineTerminalAllocation);

module.exports = router; 