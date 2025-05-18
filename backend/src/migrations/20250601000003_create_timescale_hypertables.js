/**
 * Migration: Create TimescaleDB Hypertables
 * 
 * This migration converts appropriate tables to TimescaleDB hypertables
 * for optimized time-series data management.
 */

exports.up = async function(knex) {
  // Convert system_states to a hypertable
  await knex.raw(`
    SELECT create_hypertable('system_states', 'timestamp');
  `);
  
  // Convert orchestration_events to a hypertable
  await knex.raw(`
    SELECT create_hypertable('orchestration_events', 'timestamp');
  `);
  
  return Promise.resolve();
};

exports.down = async function(knex) {
  // Note: There's no direct way to "unconvert" a hypertable
  // The tables would need to be recreated from scratch
  // This is handled by dropping the tables in the previous migration's down function
  return Promise.resolve();
};