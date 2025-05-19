/**
 * Reference Data Query Handlers Index
 * 
 * This module exports all reference data-related query handlers.
 */

const ReferenceDataQueryHandler = require('./ReferenceDataQueryHandler');
const AirportInfoQueryHandler = require('./AirportInfoQueryHandler');
const AirlineInfoQueryHandler = require('./AirlineInfoQueryHandler');
const GHAInfoQueryHandler = require('./GHAInfoQueryHandler');
const AircraftTypeInfoQueryHandler = require('./AircraftTypeInfoQueryHandler');

module.exports = {
  ReferenceDataQueryHandler, // Base class
  AirportInfoQueryHandler,
  AirlineInfoQueryHandler,
  GHAInfoQueryHandler,
  AircraftTypeInfoQueryHandler,
  
  // Export all handlers as a flat array for easy registration
  handlers: [
    AirportInfoQueryHandler,
    AirlineInfoQueryHandler,
    GHAInfoQueryHandler,
    AircraftTypeInfoQueryHandler
  ]
};