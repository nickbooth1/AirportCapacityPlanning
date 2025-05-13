const express = require('express');
const router = express.Router();

// Import route files
const standsRoutes = require('./stands');
// const standAdjacenciesRoutes = require('./standAdjacencies'); // Route not available yet
const capacityRoutes = require('./capacity');
// const timeSlotRoutes = require('./timeSlots'); // This file doesn't exist
// const aircraftTypesRoutes = require('./aircraftTypes'); // Route not available yet
// const settingsRoutes = require('./settings'); // Route not available yet

// Import route modules
const flightUploadRoutes = require('./api/flightUpload');
const flightDataRoutes = require('./api/flightData');
const flightScheduleRoutes = require('./api/flightSchedule');
const columnMappingRoutes = require('./api/columnMapping');

// Mount routes
router.use('/stands', standsRoutes);
// router.use('/stand-adjacencies', standAdjacenciesRoutes);
router.use('/capacity', capacityRoutes);
// router.use('/time-slots', timeSlotRoutes);
// router.use('/aircraft-types', aircraftTypesRoutes);
// router.use('/settings', settingsRoutes);

// Register routes
router.use('/flights/upload', flightUploadRoutes);
router.use('/flights', flightDataRoutes);
router.use('/flight-schedules', flightScheduleRoutes);
router.use('/column-mapping', columnMappingRoutes);

module.exports = router; 