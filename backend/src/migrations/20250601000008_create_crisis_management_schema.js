/**
 * Migration: Create Crisis Management Schema
 * 
 * This migration creates tables for the Crisis Management component
 * of the Autonomous Airport Platform, supporting crisis scenarios,
 * actions, communications, and resources.
 */

exports.up = function(knex) {
  return knex.schema
    // Crisis scenarios table
    .createTable('crisis_scenarios', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('scenario_type', 50).notNullable();
      table.text('description');
      table.string('severity', 20).notNullable();
      table.specificType('affected_systems', 'text[]');
      table.jsonb('duration_estimate');
      table.jsonb('passenger_impact');
      table.string('status', 20).notNullable();
      table.boolean('is_simulation').defaultTo(false);
      table.timestamp('started_at');
      table.timestamp('ended_at');
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for scenario queries
      table.index('status', 'idx_crisis_scenarios_status');
      table.index('scenario_type', 'idx_crisis_scenarios_type');
      table.index('is_simulation', 'idx_crisis_scenarios_simulation');
    })
    
    // Crisis actions table
    .createTable('crisis_actions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('scenario_id').notNullable().references('id').inTable('crisis_scenarios').onDelete('CASCADE');
      table.string('action_type', 50).notNullable();
      table.text('description');
      table.string('urgency', 20).notNullable();
      table.string('status', 20).notNullable();
      table.string('owner', 100);
      table.timestamp('assigned_at');
      table.timestamp('completed_at');
      table.jsonb('result');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for action queries
      table.index('scenario_id', 'idx_crisis_actions_scenario');
      table.index('status', 'idx_crisis_actions_status');
      table.index('action_type', 'idx_crisis_actions_type');
    })
    
    // Crisis communications table
    .createTable('crisis_communications', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('scenario_id').notNullable().references('id').inTable('crisis_scenarios').onDelete('CASCADE');
      table.string('communication_type', 50).notNullable();
      table.text('content').notNullable();
      table.specificType('channels', 'text[]');
      table.string('audience', 100);
      table.string('status', 20).notNullable();
      table.timestamp('sent_at');
      table.string('sent_by', 100);
      table.jsonb('effectiveness_metrics');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for communication queries
      table.index('scenario_id', 'idx_crisis_communications_scenario');
      table.index('status', 'idx_crisis_communications_status');
      table.index('communication_type', 'idx_crisis_communications_type');
    })
    
    // Crisis resources table
    .createTable('crisis_resources', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('resource_type', 50).notNullable();
      table.string('name', 100).notNullable();
      table.text('description');
      table.string('location', 100);
      table.string('status', 20).notNullable();
      table.jsonb('availability');
      table.jsonb('capacity');
      table.jsonb('contact_info');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for resource queries
      table.index('resource_type', 'idx_crisis_resources_type');
      table.index('status', 'idx_crisis_resources_status');
      table.index('location', 'idx_crisis_resources_location');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('crisis_resources')
    .dropTableIfExists('crisis_communications')
    .dropTableIfExists('crisis_actions')
    .dropTableIfExists('crisis_scenarios');
};