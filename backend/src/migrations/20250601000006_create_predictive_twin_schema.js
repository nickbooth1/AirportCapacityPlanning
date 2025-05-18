/**
 * Migration: Create Predictive Airport Twin Schema
 * 
 * This migration creates tables for the Predictive Airport Twin component
 * of the Autonomous Airport Platform, including simulation scenarios,
 * states, interventions, and prediction models.
 */

exports.up = function(knex) {
  return knex.schema
    // Simulation scenarios table
    .createTable('simulation_scenarios', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.text('description');
      table.timestamp('base_timestamp').notNullable();
      table.integer('duration_minutes').notNullable();
      table.jsonb('parameters').notNullable();
      table.string('status', 20).notNullable();
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.boolean('is_template').defaultTo(false);
      
      // Indexes for scenario queries
      table.index('status', 'idx_simulation_scenarios_status');
      table.index('is_template', 'idx_simulation_scenarios_template');
    })
    
    // Simulation states table
    .createTable('simulation_states', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('scenario_id').notNullable().references('id').inTable('simulation_scenarios').onDelete('CASCADE');
      table.timestamp('timestamp').notNullable();
      table.timestamp('simulation_time').notNullable();
      table.jsonb('state_data').notNullable();
      table.jsonb('metrics');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for state queries
      table.index('scenario_id', 'idx_simulation_states_scenario');
    })
    
    // Simulation interventions table
    .createTable('simulation_interventions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('scenario_id').notNullable().references('id').inTable('simulation_scenarios').onDelete('CASCADE');
      table.string('intervention_type', 50).notNullable();
      table.text('description');
      table.jsonb('parameters').notNullable();
      table.timestamp('simulation_time').notNullable();
      table.jsonb('impact_assessment');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for intervention queries
      table.index('scenario_id', 'idx_simulation_interventions_scenario');
      table.index('intervention_type', 'idx_simulation_interventions_type');
    })
    
    // Prediction models table
    .createTable('prediction_models', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.string('model_type', 50).notNullable();
      table.string('version', 20).notNullable();
      table.text('description');
      table.jsonb('parameters');
      table.specificType('training_data_range', 'tstzrange');
      table.jsonb('accuracy_metrics');
      table.timestamp('last_updated');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for model queries
      table.index('model_type', 'idx_prediction_models_type');
      table.index('is_active', 'idx_prediction_models_active');
    })
    
    // Prediction accuracy table
    .createTable('prediction_accuracy', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('model_id').notNullable().references('id').inTable('prediction_models').onDelete('CASCADE');
      table.timestamp('prediction_timestamp').notNullable();
      table.string('prediction_target', 100).notNullable();
      table.jsonb('predicted_value').notNullable();
      table.jsonb('actual_value');
      table.jsonb('error_metrics');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for accuracy queries
      table.index('model_id', 'idx_prediction_accuracy_model');
      table.index('prediction_target', 'idx_prediction_accuracy_target');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('prediction_accuracy')
    .dropTableIfExists('prediction_models')
    .dropTableIfExists('simulation_interventions')
    .dropTableIfExists('simulation_states')
    .dropTableIfExists('simulation_scenarios');
};