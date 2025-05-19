const express = require('express');
const router = express.Router();

// Define fallback handlers for when controllers aren't available
const fallbackHandler = (controllerName, methodName) => (req, res) => {
  res.status(500).json({
    error: `${controllerName} not available`,
    message: `The ${methodName} endpoint is currently unavailable`
  });
};

// Import controllers safely
let agentController, insightsController, visualizationController, reasoningController;

// Initialize controller objects with fallbacks
const agentFallbacks = {
  processQuery: fallbackHandler('AgentController', 'processQuery'),
  getContext: fallbackHandler('AgentController', 'getContext'),
  getHistory: fallbackHandler('AgentController', 'getHistory'),
  processFeedback: fallbackHandler('AgentController', 'processFeedback'),
  approveAction: fallbackHandler('AgentController', 'approveAction'),
  rejectAction: fallbackHandler('AgentController', 'rejectAction'),
  getActionStatus: fallbackHandler('AgentController', 'getActionStatus')
};

const insightsFallbacks = {
  saveInsight: fallbackHandler('InsightsController', 'saveInsight'),
  getInsights: fallbackHandler('InsightsController', 'getInsights'),
  getInsight: fallbackHandler('InsightsController', 'getInsight'),
  updateInsight: fallbackHandler('InsightsController', 'updateInsight'),
  deleteInsight: fallbackHandler('InsightsController', 'deleteInsight'),
  addTag: fallbackHandler('InsightsController', 'addTag'),
  removeTag: fallbackHandler('InsightsController', 'removeTag')
};

const visualizationFallbacks = {
  generateVisualization: fallbackHandler('VisualizationController', 'generateVisualization'),
  getTemplates: fallbackHandler('VisualizationController', 'getTemplates'),
  exportVisualization: fallbackHandler('VisualizationController', 'exportVisualization')
};

const reasoningFallbacks = {
  getReasoningData: fallbackHandler('ReasoningController', 'getReasoningData'),
  getReasoningHistory: fallbackHandler('ReasoningController', 'getReasoningHistory'),
  initiateReasoning: fallbackHandler('ReasoningController', 'initiateReasoning'),
  executeReasoningStep: fallbackHandler('ReasoningController', 'executeReasoningStep'),
  getStepExplanation: fallbackHandler('ReasoningController', 'getStepExplanation'),
  getReasoningInsights: fallbackHandler('ReasoningController', 'getReasoningInsights'),
  saveReasoningFeedback: fallbackHandler('ReasoningController', 'saveReasoningFeedback')
};

// Try to import controllers safely
try {
  agentController = require('../../../controllers/agent/AgentController');
  // If it's a class definition, instantiate it
  if (typeof agentController === 'function') {
    agentController = new agentController();
  }
} catch (error) {
  console.error('Failed to load AgentController:', error.message);
  agentController = agentFallbacks;
}

try {
  insightsController = require('../../../controllers/agent/InsightsController');
  // If it's a class definition, instantiate it
  if (typeof insightsController === 'function') {
    insightsController = new insightsController();
  }
} catch (error) {
  console.error('Failed to load InsightsController:', error.message);
  insightsController = insightsFallbacks;
}

try {
  visualizationController = require('../../../controllers/agent/VisualizationController');
  // If it's a class definition, instantiate it
  if (typeof visualizationController === 'function') {
    visualizationController = new visualizationController();
  }
} catch (error) {
  console.error('Failed to load VisualizationController:', error.message);
  visualizationController = visualizationFallbacks;
}

try {
  reasoningController = require('../../../controllers/agent/ReasoningController');
  // If it's a class definition, instantiate it
  if (typeof reasoningController === 'function') {
    reasoningController = new reasoningController();
  }
} catch (error) {
  console.error('Failed to load ReasoningController:', error.message);
  reasoningController = reasoningFallbacks;
}

// Route definitions with proper function wrappers
// Agent query routes
router.post('/query', (req, res) => agentController.processQuery(req, res));
router.get('/context/:contextId', (req, res) => agentController.getContext(req, res));
router.get('/history', (req, res) => agentController.getHistory(req, res));
router.post('/feedback', (req, res) => agentController.processFeedback(req, res));

// Action approval routes
router.post('/actions/approve/:proposalId', (req, res) => agentController.approveAction(req, res));
router.post('/actions/reject/:proposalId', (req, res) => agentController.rejectAction(req, res));
router.get('/actions/status/:proposalId', (req, res) => agentController.getActionStatus(req, res));

// Insights routes
router.post('/insights/save', (req, res) => insightsController.saveInsight(req, res));
router.get('/insights', (req, res) => insightsController.getInsights(req, res));
router.get('/insights/:insightId', (req, res) => insightsController.getInsight(req, res));
router.put('/insights/:insightId', (req, res) => insightsController.updateInsight(req, res));
router.delete('/insights/:insightId', (req, res) => insightsController.deleteInsight(req, res));
router.post('/insights/:insightId/tags', (req, res) => insightsController.addTag(req, res));
router.delete('/insights/:insightId/tags/:tag', (req, res) => insightsController.removeTag(req, res));

// Visualization routes
router.post('/visualizations/generate', (req, res) => visualizationController.generateVisualization(req, res));
router.get('/visualizations/templates', (req, res) => visualizationController.getTemplates(req, res));
router.post('/visualizations/export', (req, res) => visualizationController.exportVisualization(req, res));

// Scenario routes - handle with a fallback for now
const scenarioRouter = express.Router();
scenarioRouter.all('*', (req, res) => {
  res.status(500).json({ error: 'Scenario routes not available' });
});
router.use('/scenarios', scenarioRouter);

// Reasoning routes
router.get('/reasoning/:id', (req, res) => reasoningController.getReasoningData(req, res));
router.get('/reasoning/history/:contextId', (req, res) => reasoningController.getReasoningHistory(req, res));
router.post('/reasoning/initiate', (req, res) => reasoningController.initiateReasoning(req, res));
router.post('/reasoning/:reasoningId/step/:stepId/execute', (req, res) => reasoningController.executeReasoningStep(req, res));
router.get('/reasoning/:reasoningId/step/:stepId/explain', (req, res) => reasoningController.getStepExplanation(req, res));
router.get('/reasoning/:reasoningId/insights', (req, res) => reasoningController.getReasoningInsights(req, res));
router.post('/reasoning/:reasoningId/feedback', (req, res) => reasoningController.saveReasoningFeedback(req, res));

module.exports = router;