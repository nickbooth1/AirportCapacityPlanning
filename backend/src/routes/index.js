const express = require('express');
const router = express.Router();

// Import route files
const standsRoutes = require('./stands');
// const standAdjacenciesRoutes = require('./standAdjacencies'); // Route not available yet
const capacityRoutes = require('./capacity');
// const timeSlotRoutes = require('./timeSlots'); // This file doesn't exist
// const aircraftTypesRoutes = require('./aircraftTypes'); // Route not available yet
// const settingsRoutes = require('./settings'); // Route not available yet

// Mount routes
router.use('/stands', standsRoutes);
// router.use('/stand-adjacencies', standAdjacenciesRoutes);
router.use('/capacity', capacityRoutes);
// router.use('/time-slots', timeSlotRoutes);
// router.use('/aircraft-types', aircraftTypesRoutes);
// router.use('/settings', settingsRoutes);

module.exports = router; 