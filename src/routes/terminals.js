const express = require('express');
const router = express.Router();
const terminalsController = require('../controllers/terminalsController');

/**
 * @route GET /api/terminals
 * @desc Get all terminals
 * @access Public
 */
router.get('/', terminalsController.getAllTerminals);

/**
 * @route GET /api/terminals/:id
 * @desc Get terminal by ID
 * @access Public
 */
router.get('/:id', terminalsController.getTerminalById);

/**
 * @route POST /api/terminals
 * @desc Create a new terminal
 * @access Private
 */
router.post('/', terminalsController.createTerminal);

/**
 * @route PUT /api/terminals/:id
 * @desc Update a terminal
 * @access Private
 */
router.put('/:id', terminalsController.updateTerminal);

/**
 * @route DELETE /api/terminals/:id
 * @desc Delete a terminal
 * @access Private
 */
router.delete('/:id', terminalsController.deleteTerminal);

/**
 * @route GET /api/terminals/:id/piers
 * @desc Get all piers for a terminal
 * @access Public
 */
router.get('/:id/piers', terminalsController.getTerminalPiers);

module.exports = router; 