/**
 * Exports all model classes adapted from the CLI tool
 * These are simplified versions of the CLI tool models adapted for web use
 */

const OperationalSettings = require('./operationalSettings');
const AircraftType = require('./aircraftType');
const Stand = require('./stand');
const StandAdjacencyRule = require('./standAdjacencyRule');
const TimeSlot = require('./timeSlot');
const CapacityResult = require('./capacityResult');

module.exports = {
  OperationalSettings,
  AircraftType,
  Stand,
  StandAdjacencyRule,
  TimeSlot,
  CapacityResult
}; 