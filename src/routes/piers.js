const express = require('express');
const router = express.Router();
const piersController = require('../controllers/piersController');

/**
 * @route GET /api/piers
 * @desc Get all piers
 * @access Public
 */
router.get('/', piersController.getAllPiers);

/**
 * @route GET /api/piers/:id
 * @desc Get pier by ID
 * @access Public
 */
router.get('/:id', piersController.getPierById);

/**
 * @route POST /api/piers
 * @desc Create a new pier
 * @access Private
 */
router.post('/', piersController.createPier);

/**
 * @route PUT /api/piers/:id
 * @desc Update a pier
 * @access Private
 */
router.put('/:id', piersController.updatePier);

/**
 * @route DELETE /api/piers/:id
 * @desc Delete a pier
 * @access Private
 */
router.delete('/:id', piersController.deletePier);

/**
 * @route GET /api/piers/:id/stands
 * @desc Get all stands for a pier
 * @access Public
 */
router.get('/:id/stands', piersController.getPierStands);

module.exports = router; 