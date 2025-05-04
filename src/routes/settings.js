const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

/**
 * @route GET /api/settings
 * @desc Get all operational settings
 * @access Public
 */
router.get('/', settingsController.getAllSettings);

/**
 * @route GET /api/settings/:key
 * @desc Get setting by key
 * @access Public
 */
router.get('/:key', settingsController.getSettingByKey);

/**
 * @route POST /api/settings
 * @desc Create a new setting
 * @access Private
 */
router.post('/', settingsController.createSetting);

/**
 * @route PUT /api/settings/:key
 * @desc Update a setting
 * @access Private
 */
router.put('/:key', settingsController.updateSetting);

/**
 * @route DELETE /api/settings/:key
 * @desc Delete a setting
 * @access Private
 */
router.delete('/:key', settingsController.deleteSetting);

module.exports = router; 