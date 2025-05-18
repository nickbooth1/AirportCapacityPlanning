const express = require('express');
const router = express.Router();

// Import controllers
const maintenanceRequestService = require('../../services/maintenanceRequestService');

// Import route modules
const agentRoutes = require('./agent');
const proactiveInsightsRoutes = require('./proactiveInsights');
const externalDataRoutes = require('./externalData');
const collaborationRoutes = require('./collaboration');
const feedbackRoutes = require('./feedback');
const userPreferencesRoutes = require('./userPreferences');

// Register routes
router.use('/agent', agentRoutes);

// Register Phase 3 routes
router.use('/insights', proactiveInsightsRoutes);
router.use('/external', externalDataRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/agent/feedback', feedbackRoutes);

// Register Phase 4 routes
router.use('/preferences', userPreferencesRoutes);

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

// Export the router
module.exports = router; 