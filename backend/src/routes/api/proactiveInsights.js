/**
 * Proactive Insights API Routes
 */

const express = require('express');
const router = express.Router();
const proactiveInsightsController = require('../../controllers/ProactiveInsightsController');
const auth = require('../../middleware/auth');

/**
 * @route   GET /api/insights
 * @desc    Get proactive insights
 * @access  Private
 */
router.get('/', auth, (req, res) => {
  return proactiveInsightsController.getInsights(req, res);
});

/**
 * @route   GET /api/insights/:insightId
 * @desc    Get a specific insight by ID
 * @access  Private
 */
router.get('/:insightId', auth, (req, res) => {
  return proactiveInsightsController.getInsightById(req, res);
});

/**
 * @route   PUT /api/insights/:insightId
 * @desc    Update the status of an insight
 * @access  Private
 */
router.put('/:insightId', auth, (req, res) => {
  return proactiveInsightsController.updateInsightStatus(req, res);
});

/**
 * @route   POST /api/insights/:insightId/actions/:actionId/execute
 * @desc    Execute a recommended action for an insight
 * @access  Private
 */
router.post('/:insightId/actions/:actionId/execute', auth, (req, res) => {
  return proactiveInsightsController.executeRecommendedAction(req, res);
});

module.exports = router;