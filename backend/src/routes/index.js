const express = require('express');
const router = express.Router();

// Import route modules safely
function importRouteModule(path, fallbackPath = '/') {
  try {
    return require(path);
  } catch (error) {
    console.error(`Failed to import route module ${path}: ${error.message}`);
    const fallbackRouter = express.Router();
    fallbackRouter.all('*', (req, res) => {
      res.status(500).json({ 
        error: 'Route module not available',
        message: `Failed to load the requested route: ${fallbackPath}`
      });
    });
    return fallbackRouter;
  }
}

// Import API routes
const apiIndex = importRouteModule('./api/index', '/api');
router.use('/', apiIndex);

// API-specific routes - mount these directly on their respective paths
router.use('/flights/upload', importRouteModule('./api/flightUpload', '/api/flights/upload'));
router.use('/flights', importRouteModule('./api/flightData', '/api/flights'));
router.use('/flight-schedules', importRouteModule('./api/flightSchedule', '/api/flight-schedules'));
router.use('/column-mapping', importRouteModule('./api/columnMapping', '/api/column-mapping'));

// Agent and collaboration routes
router.use('/insights', importRouteModule('./api/proactiveInsights', '/api/insights'));
router.use('/collaboration', importRouteModule('./api/collaboration', '/api/collaboration'));
router.use('/feedback', importRouteModule('./api/feedback', '/api/feedback'));
router.use('/external', importRouteModule('./api/externalData', '/api/external'));
router.use('/scenarios', importRouteModule('./api/scenarioRoutes', '/api/scenarios'));

// Main feature routes
router.use('/stands', importRouteModule('./stands', '/api/stands'));
router.use('/capacity', importRouteModule('./capacity', '/api/capacity'));
router.use('/autonomous', importRouteModule('./autonomousOperations', '/api/autonomous'));
router.use('/voice', importRouteModule('./voiceInterface', '/api/voice'));
router.use('/gha', importRouteModule('./ghaRoutes', '/api/gha'));
router.use('/airport-config', importRouteModule('./airportConfig', '/api/airport-config'));
router.use('/airlines', importRouteModule('./airlineRoutes', '/api/airlines'));
router.use('/airports', importRouteModule('./airportRoutes', '/api/airports'));
router.use('/maintenance', importRouteModule('./maintenanceRoutes', '/api/maintenance'));

// Airport infrastructure routes
router.use('/aircraft-types', importRouteModule('./aircraft-types', '/api/aircraft-types'));
router.use('/aircraft-size-categories', importRouteModule('./aircraft-size-categories', '/api/aircraft-size-categories'));
router.use('/stand-adjacencies', importRouteModule('./standAdjacencies', '/api/stand-adjacencies'));
router.use('/stand-constraints', importRouteModule('./stand-constraints', '/api/stand-constraints'));
router.use('/piers', importRouteModule('./piers', '/api/piers'));
router.use('/terminals', importRouteModule('./terminals', '/api/terminals'));
router.use('/config', importRouteModule('./config', '/api/config'));

module.exports = router;