/**
 * Migration: Create Orchestration Schema
 * 
 * This migration creates the core tables for the Autonomous Orchestration Engine
 * including operating modes, decisions, actions, and system state tracking.
 */

exports.up = function(knex) {
  return knex.schema
    // Operating modes table
    .createTable('operating_modes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 100).notNullable();
      table.text('description');
      table.jsonb('priority_weights').notNullable();
      table.jsonb('decision_thresholds').notNullable();
      table.jsonb('activation_criteria');
      table.jsonb('constraints');
      table.boolean('is_active').defaultTo(false);
      table.integer('version').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.string('created_by', 100);
      table.string('updated_by', 100);
      
      // Index for active mode queries
      table.index('is_active', 'idx_operating_modes_active');
    })
    
    // Decisions table
    .createTable('decisions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('type', 50).notNullable();
      table.text('description');
      table.timestamp('initiated_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.string('status', 20).notNullable();
      table.string('priority', 20).notNullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.decimal('risk', 5, 4).notNullable();
      table.jsonb('impact_assessment').notNullable();
      table.jsonb('domain_details');
      table.uuid('operating_mode_id').references('id').inTable('operating_modes');
      table.uuid('correlation_id');
      table.string('requested_by', 100);
      table.specificType('tags', 'text[]');
      table.specificType('notes', 'text[]');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for common queries
      table.index('status', 'idx_decisions_status');
      table.index('type', 'idx_decisions_type');
      table.index('correlation_id', 'idx_decisions_correlation_id');
      table.index('initiated_at', 'idx_decisions_initiated_at');
    })
    
    // Actions table
    .createTable('actions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('decision_id').notNullable().references('id').inTable('decisions').onDelete('CASCADE');
      table.string('type', 50).notNullable();
      table.string('domain', 50).notNullable();
      table.text('description');
      table.jsonb('parameters').notNullable();
      table.string('status', 20).notNullable();
      table.integer('execution_order').notNullable();
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.jsonb('result');
      table.jsonb('retry_policy');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for common queries
      table.index('decision_id', 'idx_actions_decision_id');
      table.index('status', 'idx_actions_status');
      table.index('domain', 'idx_actions_domain');
    })
    
    // Decision dependencies table
    .createTable('decision_dependencies', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('dependent_decision_id').notNullable().references('id').inTable('decisions').onDelete('CASCADE');
      table.uuid('dependency_decision_id').notNullable().references('id').inTable('decisions').onDelete('CASCADE');
      table.string('dependency_type', 50).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Unique constraint
      table.unique(['dependent_decision_id', 'dependency_decision_id']);
      
      // Indexes for dependency traversal
      table.index('dependent_decision_id', 'idx_decision_dependencies_dependent');
      table.index('dependency_decision_id', 'idx_decision_dependencies_dependency');
    })
    
    // Action dependencies table
    .createTable('action_dependencies', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('dependent_action_id').notNullable().references('id').inTable('actions').onDelete('CASCADE');
      table.uuid('dependency_action_id').notNullable().references('id').inTable('actions').onDelete('CASCADE');
      table.string('dependency_type', 50).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Unique constraint
      table.unique(['dependent_action_id', 'dependency_action_id']);
      
      // Indexes for dependency traversal
      table.index('dependent_action_id', 'idx_action_dependencies_dependent');
      table.index('dependency_action_id', 'idx_action_dependencies_dependency');
    })
    
    // Approvals table
    .createTable('approvals', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('decision_id').notNullable().references('id').inTable('decisions').onDelete('CASCADE');
      table.string('status', 20).notNullable();
      table.string('approved_by', 100);
      table.timestamp('approved_at');
      table.text('notes');
      table.timestamp('expires_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Index for decision lookup
      table.index('decision_id', 'idx_approvals_decision_id');
    })
    
    // System states table
    .createTable('system_states', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.uuid('operating_mode_id').references('id').inTable('operating_modes');
      table.jsonb('autonomy_levels').notNullable();
      table.jsonb('key_metrics').notNullable();
      table.jsonb('active_processes');
      table.jsonb('situational_assessment').notNullable();
      table.jsonb('resource_status');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Orchestration events table
    .createTable('orchestration_events', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('event_type', 50).notNullable();
      table.string('source', 100).notNullable();
      table.uuid('related_entity_id');
      table.string('related_entity_type', 50);
      table.uuid('correlation_id');
      table.jsonb('payload').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for event querying
      table.index('event_type', 'idx_orchestration_events_type');
      table.index(['related_entity_id', 'related_entity_type'], 'idx_orchestration_events_entity');
      table.index('correlation_id', 'idx_orchestration_events_correlation');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('orchestration_events')
    .dropTableIfExists('system_states')
    .dropTableIfExists('approvals')
    .dropTableIfExists('action_dependencies')
    .dropTableIfExists('decision_dependencies')
    .dropTableIfExists('actions')
    .dropTableIfExists('decisions')
    .dropTableIfExists('operating_modes');
};