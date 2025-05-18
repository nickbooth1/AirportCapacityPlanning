/**
 * Migration: Create Additional TimescaleDB Hypertables
 * 
 * This migration converts additional tables to TimescaleDB hypertables
 * for optimized time-series data management.
 */

exports.up = async function(knex) {
  // Convert journey_touchpoints to a hypertable
  await knex.raw(`
    SELECT create_hypertable('journey_touchpoints', 'timestamp');
  `);
  
  // Convert experience_metrics to a hypertable
  await knex.raw(`
    SELECT create_hypertable('experience_metrics', 'timestamp');
  `);
  
  // Convert sustainability_metrics to a hypertable
  await knex.raw(`
    SELECT create_hypertable('sustainability_metrics', 'timestamp');
  `);
  
  // Convert resource_consumption to a hypertable
  await knex.raw(`
    SELECT create_hypertable('resource_consumption', 'timestamp');
  `);
  
  // Convert carbon_accounting to a hypertable
  await knex.raw(`
    SELECT create_hypertable('carbon_accounting', 'timestamp');
  `);
  
  // Convert simulation_states to a hypertable
  await knex.raw(`
    SELECT create_hypertable('simulation_states', 'simulation_time');
  `);
  
  // Convert prediction_accuracy to a hypertable
  await knex.raw(`
    SELECT create_hypertable('prediction_accuracy', 'prediction_timestamp');
  `);
  
  // Convert learning_metrics to a hypertable
  await knex.raw(`
    SELECT create_hypertable('learning_metrics', 'timestamp');
  `);
  
  // Convert fairness_metrics to a hypertable
  await knex.raw(`
    SELECT create_hypertable('fairness_metrics', 'timestamp');
  `);
  
  return Promise.resolve();
};

exports.down = async function(knex) {
  // Note: There's no direct way to "unconvert" a hypertable
  // The tables would need to be recreated from scratch
  // This is handled by dropping the tables in the previous migrations' down functions
  return Promise.resolve();
};