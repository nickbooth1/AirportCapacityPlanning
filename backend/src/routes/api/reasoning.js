/**
 * Reasoning API routes
 */

const express = require('express');
const router = express.Router();
const ReasoningController = require('../../controllers/agent/ReasoningController');
const auth = require('../../middleware/auth');

// All routes require authentication
router.use(auth);

// Get reasoning data for a specific reasoning process
router.get('/:id', ReasoningController.getReasoningData);

// Get reasoning history for a specific context
router.get('/history/:contextId', ReasoningController.getReasoningHistory);

// Initiate a new reasoning process
router.post('/initiate', ReasoningController.initiateReasoning);

// Execute a specific reasoning step
router.post('/:reasoningId/step/:stepId/execute', ReasoningController.executeReasoningStep);

// Get explanation for a specific step
router.get('/:reasoningId/step/:stepId/explain', ReasoningController.getStepExplanation);

// Get insights for a reasoning process
router.get('/:reasoningId/insights', ReasoningController.getReasoningInsights);

// Save feedback for a reasoning process
router.post('/:reasoningId/feedback', ReasoningController.saveReasoningFeedback);

module.exports = router;