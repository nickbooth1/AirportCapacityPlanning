const express = require('express');
const router = express.Router();
const { safeRouter } = require('./route-fix');

// Convert router to use safe route registration
const safeExpressRouter = safeRouter(router);

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
safeExpressRouter.use('/stands', standsRoutes);
// safeExpressRouter.use('/stand-adjacencies', standAdjacenciesRoutes);
safeExpressRouter.use('/capacity', capacityRoutes);
// safeExpressRouter.use('/time-slots', timeSlotRoutes);
// safeExpressRouter.use('/aircraft-types', aircraftTypesRoutes);
// safeExpressRouter.use('/settings', settingsRoutes);
safeExpressRouter.use('/autonomous', autonomousOperationsRoutes);
safeExpressRouter.use('/voice', voiceInterfaceRoutes);

// Register routes
safeExpressRouter.use('/flights/upload', flightUploadRoutes);
safeExpressRouter.use('/flights', flightDataRoutes);
safeExpressRouter.use('/flight-schedules', flightScheduleRoutes);
safeExpressRouter.use('/column-mapping', columnMappingRoutes);
safeExpressRouter.use('/', apiRoutes); // Mount our debug API routes

module.exports = safeExpressRouter;