const express = require('express');
const router = express.Router();
const turnaroundRulesController = require('../controllers/turnaroundRulesController');

/**
 * @route GET /api/turnaround-rules
 * @desc Get all turnaround rules
 * @access Public
 */
router.get('/', turnaroundRulesController.getAllTurnaroundRules);

/**
 * @route GET /api/turnaround-rules/:id
 * @desc Get turnaround rule by ID
 * @access Public
 */
router.get('/:id', turnaroundRulesController.getTurnaroundRuleById);

/**
 * @route POST /api/turnaround-rules
 * @desc Create a new turnaround rule
 * @access Private
 */
router.post('/', turnaroundRulesController.createTurnaroundRule);

/**
 * @route PUT /api/turnaround-rules/:id
 * @desc Update a turnaround rule
 * @access Private
 */
router.put('/:id', turnaroundRulesController.updateTurnaroundRule);

/**
 * @route DELETE /api/turnaround-rules/:id
 * @desc Delete a turnaround rule
 * @access Private
 */
router.delete('/:id', turnaroundRulesController.deleteTurnaroundRule);

module.exports = router; 