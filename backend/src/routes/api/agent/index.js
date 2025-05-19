const express = require('express');
const router = express.Router();
const { safeRouter, controllerMethod } = require('../../route-fix');
const safeExpressRouter = safeRouter(router);

// Import controllers safely
let agentController, insightsController, visualizationController, reasoningController;

try {
  agentController = require('../../../controllers/agent/AgentController');
} catch (error) {
  console.error('Failed to load AgentController:', error.message);
  agentController = {
    processQuery: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    getContext: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    getHistory: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    processFeedback: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    approveAction: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    rejectAction: (req, res) => res.status(500).json({ error: 'Agent controller not available' }),
    getActionStatus: (req, res) => res.status(500).json({ error: 'Agent controller not available' })
  };
}

try {
  insightsController = require('../../../controllers/agent/InsightsController');
} catch (error) {
  console.error('Failed to load InsightsController:', error.message);
  insightsController = {
    saveInsight: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    getInsights: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    getInsight: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    updateInsight: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    deleteInsight: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    addTag: (req, res) => res.status(500).json({ error: 'Insights controller not available' }),
    removeTag: (req, res) => res.status(500).json({ error: 'Insights controller not available' })
  };
}

try {
  visualizationController = require('../../../controllers/agent/VisualizationController');
} catch (error) {
  console.error('Failed to load VisualizationController:', error.message);
  visualizationController = {
    generateVisualization: (req, res) => res.status(500).json({ error: 'Visualization controller not available' }),
    getTemplates: (req, res) => res.status(500).json({ error: 'Visualization controller not available' }),
    exportVisualization: (req, res) => res.status(500).json({ error: 'Visualization controller not available' })
  };
}

try {
  reasoningController = require('../../../controllers/agent/ReasoningController');
} catch (error) {
  console.error('Failed to load ReasoningController:', error.message);
  reasoningController = {
    getReasoningData: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    getReasoningHistory: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    initiateReasoning: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    executeReasoningStep: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    getStepExplanation: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    getReasoningInsights: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' }),
    saveReasoningFeedback: (req, res) => res.status(500).json({ error: 'Reasoning controller not available' })
  };
}

// Agent query routes - ensure we're using functions, not objects
safeExpressRouter.post('/query', (req, res) => agentController.processQuery(req, res));
safeExpressRouter.get('/context/:contextId', (req, res) => agentController.getContext(req, res));
safeExpressRouter.get('/history', (req, res) => agentController.getHistory(req, res));
safeExpressRouter.post('/feedback', (req, res) => agentController.processFeedback(req, res));

// Action approval routes
safeExpressRouter.post('/actions/approve/:proposalId', (req, res) => agentController.approveAction(req, res));
safeExpressRouter.post('/actions/reject/:proposalId', (req, res) => agentController.rejectAction(req, res));
safeExpressRouter.get('/actions/status/:proposalId', (req, res) => agentController.getActionStatus(req, res));

// Insights routes
safeExpressRouter.post('/insights/save', (req, res) => insightsController.saveInsight(req, res));
safeExpressRouter.get('/insights', (req, res) => insightsController.getInsights(req, res));
safeExpressRouter.get('/insights/:insightId', (req, res) => insightsController.getInsight(req, res));
safeExpressRouter.put('/insights/:insightId', (req, res) => insightsController.updateInsight(req, res));
safeExpressRouter.delete('/insights/:insightId', (req, res) => insightsController.deleteInsight(req, res));
safeExpressRouter.post('/insights/:insightId/tags', (req, res) => insightsController.addTag(req, res));
safeExpressRouter.delete('/insights/:insightId/tags/:tag', (req, res) => insightsController.removeTag(req, res));

// Visualization routes
safeExpressRouter.post('/visualizations/generate', (req, res) => visualizationController.generateVisualization(req, res));
safeExpressRouter.get('/visualizations/templates', (req, res) => visualizationController.getTemplates(req, res));
safeExpressRouter.post('/visualizations/export', (req, res) => visualizationController.exportVisualization(req, res));

// Scenario routes - handle safely
try {
  const scenarioRoutes = require('./scenarios');
  safeExpressRouter.use('/scenarios', scenarioRoutes);
} catch (error) {
  console.error('Failed to load scenario routes:', error.message);
  // Create a placeholder router that returns 500 errors
  const placeholderRouter = express.Router();
  placeholderRouter.all('*', (req, res) => {
    res.status(500).json({ error: 'Scenario routes not available' });
  });
  safeExpressRouter.use('/scenarios', placeholderRouter);
}

// Reasoning routes
safeExpressRouter.get('/reasoning/:id', (req, res) => reasoningController.getReasoningData(req, res));
safeExpressRouter.get('/reasoning/history/:contextId', (req, res) => reasoningController.getReasoningHistory(req, res));
safeExpressRouter.post('/reasoning/initiate', (req, res) => reasoningController.initiateReasoning(req, res));
safeExpressRouter.post('/reasoning/:reasoningId/step/:stepId/execute', (req, res) => reasoningController.executeReasoningStep(req, res));
safeExpressRouter.get('/reasoning/:reasoningId/step/:stepId/explain', (req, res) => reasoningController.getStepExplanation(req, res));
safeExpressRouter.get('/reasoning/:reasoningId/insights', (req, res) => reasoningController.getReasoningInsights(req, res));
safeExpressRouter.post('/reasoning/:reasoningId/feedback', (req, res) => reasoningController.saveReasoningFeedback(req, res));

module.exports = safeExpressRouter;