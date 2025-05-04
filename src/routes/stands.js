const express = require('express');
const router = express.Router();
const standsController = require('../controllers/standsController');

/**
 * @route GET /api/stands
 * @desc Get all stands
 * @access Public
 */
router.get('/', standsController.getAllStands);

/**
 * @route GET /api/stands/:id
 * @desc Get stand by ID
 * @access Public
 */
router.get('/:id', standsController.getStandById);

/**
 * @route POST /api/stands
 * @desc Create a new stand
 * @access Private
 */
router.post('/', standsController.createStand);

/**
 * @route PUT /api/stands/:id
 * @desc Update a stand
 * @access Private
 */
router.put('/:id', standsController.updateStand);

/**
 * @route DELETE /api/stands/:id
 * @desc Delete a stand
 * @access Private
 */
router.delete('/:id', standsController.deleteStand);

/**
 * @route GET /api/stands/:id/constraints
 * @desc Get all aircraft constraints for a stand
 * @access Public
 */
router.get('/:id/constraints', standsController.getStandConstraints);

/**
 * @route POST /api/stands/:id/constraints
 * @desc Add a constraint for a stand
 * @access Private
 */
router.post('/:id/constraints', standsController.addStandConstraint);

/**
 * @route DELETE /api/stands/:id/constraints/:constraintId
 * @desc Remove a constraint from a stand
 * @access Private
 */
router.delete('/:id/constraints/:constraintId', standsController.removeStandConstraint);

module.exports = router; 