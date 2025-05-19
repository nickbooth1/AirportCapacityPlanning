const express = require('express');
const router = express.Router();

// Import controllers and routes
const maintenanceRequestService = require('../../services/maintenanceRequestService');

// Import agent routes
let agentRoutes;
try {
  agentRoutes = require('./agent');
} catch (error) {
  console.error('Failed to load agent routes:', error.message);
  agentRoutes = null;
}

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

// Agent routes
if (agentRoutes) {
  router.use('/agent', agentRoutes);
} else {
  // Create agent route fallback
  router.all('/agent/*', (req, res) => {
    res.status(500).json({ error: 'Agent routes not properly initialized' });
  });
}

// Create insights route fallback
router.all('/insights/*', (req, res) => {
  res.status(500).json({ error: 'Insights routes not properly initialized' });
});

// Create external route fallback
router.all('/external/*', (req, res) => {
  res.status(500).json({ error: 'External data routes not properly initialized' });
});

// Create collaboration route fallback
router.all('/collaboration/*', (req, res) => {
  res.status(500).json({ error: 'Collaboration routes not properly initialized' });
});

// Create agent feedback route fallback
router.all('/agent/feedback/*', (req, res) => {
  res.status(500).json({ error: 'Feedback routes not properly initialized' });
});

// Create user preferences fallback
router.all('/preferences/*', (req, res) => {
  res.status(500).json({ error: 'User preferences routes not properly initialized' });
});

// Export the router
module.exports = router;