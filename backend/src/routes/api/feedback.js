/**
 * Feedback and Learning API Routes
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/FeedbackController');
const auth = require('../../middleware/auth');

/**
 * @route   POST /api/agent/feedback
 * @desc    Submit feedback on agent performance
 * @access  Private
 */
router.post('/', auth, (req, res) => {
  return feedbackController.submitFeedback(req, res);
});

/**
 * @route   POST /api/agent/feedback/implicit
 * @desc    Record implicit feedback from user interaction
 * @access  Private
 */
router.post('/implicit', auth, (req, res) => {
  return feedbackController.recordImplicitFeedback(req, res);
});

/**
 * @route   GET /api/agent/performance-metrics
 * @desc    Get performance metrics for the agent
 * @access  Private
 */
router.get('/performance-metrics', auth, (req, res) => {
  return feedbackController.getPerformanceMetrics(req, res);
});

/**
 * @route   POST /api/agent/experiments
 * @desc    Create an A/B testing experiment
 * @access  Private
 */
router.post('/experiments', auth, (req, res) => {
  return feedbackController.createExperiment(req, res);
});

/**
 * @route   GET /api/agent/experiments/:experimentId/variant
 * @desc    Get variant for an active experiment
 * @access  Private
 */
router.get('/experiments/:experimentId/variant', auth, (req, res) => {
  return feedbackController.getExperimentVariant(req, res);
});

/**
 * @route   POST /api/agent/experiments/:experimentId/variants/:variantId/interaction
 * @desc    Record experiment interaction
 * @access  Private
 */
router.post('/experiments/:experimentId/variants/:variantId/interaction', auth, (req, res) => {
  return feedbackController.recordExperimentInteraction(req, res);
});

module.exports = router;