const express = require('express');
const router = express.Router();

// Import controllers and routes
const maintenanceRequestService = require('../../services/maintenanceRequestService');

// Import route modules safely
function importRouteModule(path, fallbackPath = null) {
  try {
    return require(path);
  } catch (error) {
    console.error(`Failed to import route module ${path}: ${error.message}`);
    if (fallbackPath) {
      const fallbackRouter = express.Router();
      fallbackRouter.all('*', (req, res) => {
        res.status(500).json({ 
          error: 'Route module not available',
          message: `Failed to load the requested route: ${fallbackPath}`
        });
      });
      return fallbackRouter;
    }
    return null;
  }
}

// Import agent routes
const agentRoutes = importRouteModule('./agent', '/api/agent');
const insightsRoutes = importRouteModule('./proactiveInsights', '/api/insights');
const collaborationRoutes = importRouteModule('./collaboration', '/api/collaboration');
const feedbackRoutes = importRouteModule('./feedback', '/api/feedback');
const externalDataRoutes = importRouteModule('./externalData', '/api/external');
const scenarioRoutes = importRouteModule('./scenarioRoutes', '/api/scenarios');
const userPreferencesRoutes = importRouteModule('./userPreferences', '/api/preferences');
const reasoningRoutes = importRouteModule('./reasoning', '/api/reasoning');

// Debug route to help troubleshoot maintenance request filtering
router.get('/debug/maintenance-requests', async (req, res) => {
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

// Register routes
if (agentRoutes) {
  router.use('/agent', agentRoutes);
} else {
  // Create agent route fallback
  router.all('/agent/*', (req, res) => {
    res.status(500).json({ error: 'Agent routes not properly initialized' });
  });
}

if (insightsRoutes) {
  router.use('/insights', insightsRoutes);
} else {
  // Create insights route fallback
  router.all('/insights/*', (req, res) => {
    res.status(500).json({ error: 'Insights routes not properly initialized' });
  });
}

if (externalDataRoutes) {
  router.use('/external', externalDataRoutes);
} else {
  // Create external route fallback
  router.all('/external/*', (req, res) => {
    res.status(500).json({ error: 'External data routes not properly initialized' });
  });
}

if (collaborationRoutes) {
  router.use('/collaboration', collaborationRoutes);
} else {
  // Create collaboration route fallback
  router.all('/collaboration/*', (req, res) => {
    res.status(500).json({ error: 'Collaboration routes not properly initialized' });
  });
}

if (feedbackRoutes) {
  router.use('/feedback', feedbackRoutes);
} else {
  // Create agent feedback route fallback
  router.all('/feedback/*', (req, res) => {
    res.status(500).json({ error: 'Feedback routes not properly initialized' });
  });
}

if (scenarioRoutes) {
  router.use('/scenarios', scenarioRoutes);
} else {
  // Create scenarios route fallback
  router.all('/scenarios/*', (req, res) => {
    res.status(500).json({ error: 'Scenario routes not properly initialized' });
  });
}

if (userPreferencesRoutes) {
  router.use('/preferences', userPreferencesRoutes);
} else {
  // Create user preferences fallback
  router.all('/preferences/*', (req, res) => {
    res.status(500).json({ error: 'User preferences routes not properly initialized' });
  });
}

if (reasoningRoutes) {
  router.use('/reasoning', reasoningRoutes);
} else {
  // Create reasoning route fallback
  router.all('/reasoning/*', (req, res) => {
    res.status(500).json({ error: 'Reasoning routes not properly initialized' });
  });
}

// Export the router
module.exports = router;