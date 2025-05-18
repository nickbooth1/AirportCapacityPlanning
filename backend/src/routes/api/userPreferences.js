/**
 * User Preferences API Routes
 * 
 * API endpoints for managing user preferences
 * 
 * Part of AirportAI Agent Phase 4 implementation.
 */

const express = require('express');
const router = express.Router();
const UserPreferenceController = require('../../controllers/agent/UserPreferenceController');
const auth = require('../../middleware/auth');

/**
 * @route   GET /api/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/', auth, (req, res) => {
  return UserPreferenceController.getUserPreferences(req, res);
});

/**
 * @route   PUT /api/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/', auth, (req, res) => {
  return UserPreferenceController.updatePreferences(req, res);
});

/**
 * @route   POST /api/preferences/reset
 * @desc    Reset user preferences
 * @access  Private
 */
router.post('/reset', auth, (req, res) => {
  return UserPreferenceController.resetPreferences(req, res);
});

/**
 * @route   GET /api/preferences/dashboards
 * @desc    Get user dashboards
 * @access  Private
 */
router.get('/dashboards', auth, (req, res) => {
  return UserPreferenceController.getUserDashboards(req, res);
});

/**
 * @route   POST /api/preferences/dashboards
 * @desc    Create a dashboard
 * @access  Private
 */
router.post('/dashboards', auth, (req, res) => {
  return UserPreferenceController.createDashboard(req, res);
});

/**
 * @route   PUT /api/preferences/dashboards/:dashboardId
 * @desc    Update a dashboard
 * @access  Private
 */
router.put('/dashboards/:dashboardId', auth, (req, res) => {
  return UserPreferenceController.updateDashboard(req, res);
});

/**
 * @route   DELETE /api/preferences/dashboards/:dashboardId
 * @desc    Delete a dashboard
 * @access  Private
 */
router.delete('/dashboards/:dashboardId', auth, (req, res) => {
  return UserPreferenceController.deleteDashboard(req, res);
});

/**
 * @route   GET /api/preferences/saved-queries
 * @desc    Get saved queries
 * @access  Private
 */
router.get('/saved-queries', auth, (req, res) => {
  return UserPreferenceController.getSavedQueries(req, res);
});

/**
 * @route   POST /api/preferences/saved-queries
 * @desc    Save a query
 * @access  Private
 */
router.post('/saved-queries', auth, (req, res) => {
  return UserPreferenceController.saveQuery(req, res);
});

/**
 * @route   DELETE /api/preferences/saved-queries/:queryId
 * @desc    Delete a saved query
 * @access  Private
 */
router.delete('/saved-queries/:queryId', auth, (req, res) => {
  return UserPreferenceController.deleteSavedQuery(req, res);
});

/**
 * @route   POST /api/preferences/sync
 * @desc    Sync preferences from device
 * @access  Private
 */
router.post('/sync', auth, (req, res) => {
  return UserPreferenceController.syncPreferences(req, res);
});

module.exports = router;