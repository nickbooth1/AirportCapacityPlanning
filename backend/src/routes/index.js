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

// Main feature routes
router.use('/stands', importRouteModule('./stands', '/api/stands'));
router.use('/capacity', importRouteModule('./capacity', '/api/capacity'));
router.use('/autonomous', importRouteModule('./autonomousOperations', '/api/autonomous'));
router.use('/voice', importRouteModule('./voiceInterface', '/api/voice'));

module.exports = router;