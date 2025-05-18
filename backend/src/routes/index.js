const express = require('express');
const router = express.Router();

// Import route files
const standsRoutes = require('./stands');
// const standAdjacenciesRoutes = require('./standAdjacencies'); // Route not available yet
const capacityRoutes = require('./capacity');
// const timeSlotRoutes = require('./timeSlots'); // This file doesn't exist
// const aircraftTypesRoutes = require('./aircraftTypes'); // Route not available yet
// const settingsRoutes = require('./settings'); // Route not available yet
const autonomousOperationsRoutes = require('./autonomousOperations');
const voiceInterfaceRoutes = require('./voiceInterface');

// Import route modules
const flightUploadRoutes = require('./api/flightUpload');
const flightDataRoutes = require('./api/flightData');
const flightScheduleRoutes = require('./api/flightSchedule');
const columnMappingRoutes = require('./api/columnMapping');
const apiRoutes = require('./api/index');

// Mount routes
router.use('/stands', standsRoutes);
// router.use('/stand-adjacencies', standAdjacenciesRoutes);
router.use('/capacity', capacityRoutes);
// router.use('/time-slots', timeSlotRoutes);
// router.use('/aircraft-types', aircraftTypesRoutes);
// router.use('/settings', settingsRoutes);
router.use('/autonomous', autonomousOperationsRoutes);
router.use('/voice', voiceInterfaceRoutes);

// Register routes
router.use('/flights/upload', flightUploadRoutes);
router.use('/flights', flightDataRoutes);
router.use('/flight-schedules', flightScheduleRoutes);
router.use('/column-mapping', columnMappingRoutes);
router.use('/', apiRoutes); // Mount our debug API routes

module.exports = router;