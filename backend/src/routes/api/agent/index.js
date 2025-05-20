const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../../middleware/validationMiddleware');
const { errorHandler } = require('../../../middleware/errorHandler');

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

// Route definitions with validation middleware
// Agent query routes
router.post('/query', 
  validationMiddleware.validateAgentQuery,
  (req, res, next) => {
    try {
      agentController.processQuery(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Get a context by ID
router.get('/context/:contextId', 
  validationMiddleware.validateContextId,
  (req, res, next) => {
    try {
      agentController.getContext(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new context
router.post('/context', 
  (req, res, next) => {
    try {
      agentController.createContext(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/history', 
  validationMiddleware.validatePagination,
  (req, res, next) => {
    try {
      agentController.getHistory(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/feedback', 
  validationMiddleware.validateFeedback,
  validationMiddleware.validateResponseId,
  (req, res, next) => {
    try {
      agentController.processFeedback(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Action approval routes
router.post('/actions/approve/:proposalId', 
  validationMiddleware.validateProposalId,
  (req, res, next) => {
    try {
      agentController.approveAction(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/actions/reject/:proposalId', 
  validationMiddleware.validateProposalId,
  (req, res, next) => {
    try {
      agentController.rejectAction(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/actions/status/:proposalId', 
  validationMiddleware.validateProposalId,
  (req, res, next) => {
    try {
      agentController.getActionStatus(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Insights routes
router.post('/insights/save', (req, res, next) => {
  try {
    insightsController.saveInsight(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.get('/insights', 
  validationMiddleware.validatePagination,
  (req, res, next) => {
    try {
      insightsController.getInsights(req, res, next);
    } catch (error) {
      next(error);
    }
  });
router.get('/insights/:insightId', (req, res, next) => {
  try {
    insightsController.getInsight(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.put('/insights/:insightId', (req, res, next) => {
  try {
    insightsController.updateInsight(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.delete('/insights/:insightId', (req, res, next) => {
  try {
    insightsController.deleteInsight(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.post('/insights/:insightId/tags', (req, res, next) => {
  try {
    insightsController.addTag(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.delete('/insights/:insightId/tags/:tag', (req, res, next) => {
  try {
    insightsController.removeTag(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Visualization routes
router.post('/visualizations/generate', (req, res, next) => {
  try {
    visualizationController.generateVisualization(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.get('/visualizations/templates', (req, res, next) => {
  try {
    visualizationController.getTemplates(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.post('/visualizations/export', (req, res, next) => {
  try {
    visualizationController.exportVisualization(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Scenario routes - handle with a fallback for now
const scenarioRouter = express.Router();
scenarioRouter.all('*', (req, res) => {
  res.status(500).json({ error: 'Scenario routes not available' });
});
router.use('/scenarios', scenarioRouter);

// Reasoning routes
router.get('/reasoning/:id', (req, res, next) => {
  try {
    reasoningController.getReasoningData(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.get('/reasoning/history/:contextId', (req, res, next) => {
  try {
    reasoningController.getReasoningHistory(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.post('/reasoning/initiate', (req, res, next) => {
  try {
    reasoningController.initiateReasoning(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.post('/reasoning/:reasoningId/step/:stepId/execute', (req, res, next) => {
  try {
    reasoningController.executeReasoningStep(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.get('/reasoning/:reasoningId/step/:stepId/explain', (req, res, next) => {
  try {
    reasoningController.getStepExplanation(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.get('/reasoning/:reasoningId/insights', (req, res, next) => {
  try {
    reasoningController.getReasoningInsights(req, res, next);
  } catch (error) {
    next(error);
  }
});
router.post('/reasoning/:reasoningId/feedback', (req, res, next) => {
  try {
    reasoningController.saveReasoningFeedback(req, res, next);
  } catch (error) {
    next(error);
  }
});

module.exports = router;