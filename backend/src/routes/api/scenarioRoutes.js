const express = require('express');
const router = express.Router();
const ScenarioController = require('../../controllers/ScenarioController');
const { authenticateUser } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @route   GET /api/flight-schedules/scenarios
 * @desc    List all scenarios
 * @access  Private
 */
router.get('/', ScenarioController.listScenarios);

/**
 * @route   POST /api/flight-schedules/scenarios
 * @desc    Create a new scenario
 * @access  Private
 */
router.post('/', ScenarioController.createScenario);

/**
 * @route   GET /api/flight-schedules/scenarios/:id
 * @desc    Get a scenario by ID
 * @access  Private
 */
router.get('/:id', ScenarioController.getScenario);

/**
 * @route   POST /api/flight-schedules/scenarios/:id/allocate
 * @desc    Run allocation for a scenario
 * @access  Private
 */
router.post('/:id/allocate', ScenarioController.runAllocation);

/**
 * @route   GET /api/flight-schedules/scenarios/:id/status
 * @desc    Get status of a scenario
 * @access  Private
 */
router.get('/:id/status', ScenarioController.getScenarioStatus);

module.exports = router; 