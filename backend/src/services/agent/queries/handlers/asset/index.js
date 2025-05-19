/**
 * Asset Query Handlers Index
 * 
 * This module exports all asset-related query handlers.
 */

const StandDetailQueryHandler = require('./StandDetailQueryHandler');
const StandLocationQueryHandler = require('./StandLocationQueryHandler');
const StandCapabilityQueryHandler = require('./StandCapabilityQueryHandler');

module.exports = {
  StandDetailQueryHandler,
  StandLocationQueryHandler,
  StandCapabilityQueryHandler,
  
  // Export all handlers as a flat array for easy registration
  handlers: [
    StandDetailQueryHandler,
    StandLocationQueryHandler,
    StandCapabilityQueryHandler
  ]
};