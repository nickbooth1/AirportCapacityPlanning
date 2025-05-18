/**
 * Migration: Create Passenger Experience Schema
 * 
 * This migration creates tables for the Passenger Experience component
 * of the Autonomous Airport Platform, tracking passenger journeys,
 * touchpoints, interventions, and experience metrics.
 */

exports.up = function(knex) {
  return knex.schema
    // Passenger journeys table
    .createTable('passenger_journeys', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('passenger_id');
      table.string('journey_status', 50).notNullable();
      table.string('passenger_type', 50);
      table.timestamp('start_time');
      table.timestamp('end_time');
      table.string('current_location', 100);
      table.string('current_stage', 50);
      table.jsonb('personalization_profile');
      table.jsonb('associated_flights');
      table.jsonb('satisfaction_metrics');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for journey queries
      table.index('journey_status', 'idx_passenger_journeys_status');
      table.index('is_active', 'idx_passenger_journeys_active');
      table.index(['start_time', 'end_time'], 'idx_passenger_journeys_times');
    })
    
    // Journey touchpoints table
    .createTable('journey_touchpoints', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('journey_id').notNullable().references('id').inTable('passenger_journeys').onDelete('CASCADE');
      table.string('touchpoint_type', 50).notNullable();
      table.string('location', 100);
      table.timestamp('timestamp').notNullable();
      table.integer('duration_seconds');
      table.string('outcome', 50);
      table.decimal('satisfaction_score', 3, 2);
      table.jsonb('metrics');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Index for journey lookup
      table.index('journey_id', 'idx_journey_touchpoints_journey_id');
    })
    
    // Journey interventions table
    .createTable('journey_interventions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('intervention_type', 50).notNullable();
      table.text('description');
      table.specificType('affected_journeys', 'uuid[]');
      table.jsonb('execution_method').notNullable();
      table.string('priority', 20).notNullable();
      table.string('status', 20).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('scheduled_for');
      table.timestamp('executed_at');
      table.string('created_by', 100);
      table.jsonb('expected_impact');
      table.jsonb('actual_impact');
      table.text('notes');
      
      // Indexes for intervention queries
      table.index('status', 'idx_journey_interventions_status');
      table.index('intervention_type', 'idx_journey_interventions_type');
      table.index('scheduled_for', 'idx_journey_interventions_scheduled');
    })
    
    // Experience metrics table
    .createTable('experience_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('metric_type', 50).notNullable();
      table.string('location', 100);
      table.string('passenger_type', 50);
      table.decimal('value', 10, 4).notNullable();
      table.integer('sample_size');
      table.string('aggregation_period', 20);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for metric queries
      table.index('metric_type', 'idx_experience_metrics_type');
      table.index('location', 'idx_experience_metrics_location');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('experience_metrics')
    .dropTableIfExists('journey_interventions')
    .dropTableIfExists('journey_touchpoints')
    .dropTableIfExists('passenger_journeys');
};