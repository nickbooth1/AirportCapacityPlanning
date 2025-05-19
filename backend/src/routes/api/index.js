const express = require('express');
const router = express.Router();
const { safeRouter } = require('../route-fix');

// Convert router to use safe route registration
const safeExpressRouter = safeRouter(router);

// Import controllers
const maintenanceRequestService = require('../../services/maintenanceRequestService');

// Try to import route modules, using safe error handling
let agentRoutes, proactiveInsightsRoutes, externalDataRoutes, 
    collaborationRoutes, feedbackRoutes, userPreferencesRoutes;

try {
  agentRoutes = require('./agent');
} catch (error) {
  console.error('Failed to load agent routes:', error.message);
  agentRoutes = express.Router();
}

try {
  proactiveInsightsRoutes = require('./proactiveInsights');
} catch (error) {
  console.error('Failed to load proactiveInsights routes:', error.message);
  proactiveInsightsRoutes = express.Router();
}

try {
  externalDataRoutes = require('./externalData');
} catch (error) {
  console.error('Failed to load externalData routes:', error.message);
  externalDataRoutes = express.Router();
}

try {
  collaborationRoutes = require('./collaboration');
} catch (error) {
  console.error('Failed to load collaboration routes:', error.message);
  collaborationRoutes = express.Router();
}

try {
  feedbackRoutes = require('./feedback');
} catch (error) {
  console.error('Failed to load feedback routes:', error.message);
  feedbackRoutes = express.Router();
}

try {
  userPreferencesRoutes = require('./userPreferences');
} catch (error) {
  console.error('Failed to load userPreferences routes:', error.message);
  userPreferencesRoutes = express.Router();
}

// Register routes
safeExpressRouter.use('/agent', agentRoutes);

// Register Phase 3 routes
safeExpressRouter.use('/insights', proactiveInsightsRoutes);
safeExpressRouter.use('/external', externalDataRoutes);
safeExpressRouter.use('/collaboration', collaborationRoutes);
safeExpressRouter.use('/agent/feedback', feedbackRoutes);

// Register Phase 4 routes
safeExpressRouter.use('/preferences', userPreferencesRoutes);

// Debug route to help troubleshoot maintenance request filtering
safeExpressRouter.get('/debug/maintenance-requests', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const requests = await maintenanceRequestService.getAllRequests({
      startDate,
      endDate
    });

    return res.json({
      count: requests.length,
      requests: requests.map(r => ({
        id: r.id,
        title: r.title,
        stand: r.stand ? { 
          id: r.stand.id, 
          name: r.stand.name,
          code: r.stand.code 
        } : null,
        start_datetime: r.start_datetime,
        end_datetime: r.end_datetime,
        status_id: r.status_id,
        status: r.status ? r.status.name : null
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export the router
module.exports = safeExpressRouter;