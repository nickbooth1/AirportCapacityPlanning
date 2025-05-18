const express = require('express');
const router = express.Router();
const agentController = require('../../../controllers/agent/AgentController');
const insightsController = require('../../../controllers/agent/InsightsController');
const visualizationController = require('../../../controllers/agent/VisualizationController');
const reasoningController = require('../../../controllers/agent/ReasoningController');

// Agent query routes
router.post('/query', agentController.processQuery);
router.get('/context/:contextId', agentController.getContext);
router.get('/history', agentController.getHistory);
router.post('/feedback', agentController.processFeedback);

// Action approval routes
router.post('/actions/approve/:proposalId', agentController.approveAction);
router.post('/actions/reject/:proposalId', agentController.rejectAction);
router.get('/actions/status/:proposalId', agentController.getActionStatus);

// Insights routes
router.post('/insights/save', insightsController.saveInsight);
router.get('/insights', insightsController.getInsights);
router.get('/insights/:insightId', insightsController.getInsight);
router.put('/insights/:insightId', insightsController.updateInsight);
router.delete('/insights/:insightId', insightsController.deleteInsight);
router.post('/insights/:insightId/tags', insightsController.addTag);
router.delete('/insights/:insightId/tags/:tag', insightsController.removeTag);

// Visualization routes
router.post('/visualizations/generate', visualizationController.generateVisualization);
router.get('/visualizations/templates', visualizationController.getTemplates);
router.post('/visualizations/export', visualizationController.exportVisualization);

// Scenario routes
router.use('/scenarios', require('./scenarios'));

// Reasoning routes
router.get('/reasoning/:id', reasoningController.getReasoningData);
router.get('/reasoning/history/:contextId', reasoningController.getReasoningHistory);
router.post('/reasoning/initiate', reasoningController.initiateReasoning);
router.post('/reasoning/:reasoningId/step/:stepId/execute', reasoningController.executeReasoningStep);
router.get('/reasoning/:reasoningId/step/:stepId/explain', reasoningController.getStepExplanation);
router.get('/reasoning/:reasoningId/insights', reasoningController.getReasoningInsights);
router.post('/reasoning/:reasoningId/feedback', reasoningController.saveReasoningFeedback);

module.exports = router;