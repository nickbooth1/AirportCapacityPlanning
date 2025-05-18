/**
 * Migration: Create Human-AI Collaboration Schema
 * 
 * This migration creates tables for the Human-AI Collaboration component
 * of the Autonomous Airport Platform, supporting collaborative sessions,
 * artifacts, explanations, and feedback.
 */

exports.up = function(knex) {
  return knex.schema
    // Collaboration sessions table
    .createTable('collaboration_sessions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('session_type', 50).notNullable();
      table.text('description');
      table.string('status', 20).notNullable();
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('ended_at');
      table.string('initiated_by', 100);
      table.jsonb('participants');
      table.jsonb('metrics');
      table.jsonb('workspace_data');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for session queries
      table.index('status', 'idx_collaboration_sessions_status');
      table.index('session_type', 'idx_collaboration_sessions_type');
      table.index(['started_at', 'ended_at'], 'idx_collaboration_sessions_times');
    })
    
    // Collaboration artifacts table
    .createTable('collaboration_artifacts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('session_id').notNullable().references('id').inTable('collaboration_sessions').onDelete('CASCADE');
      table.string('artifact_type', 50).notNullable();
      table.string('name', 100).notNullable();
      table.text('description');
      table.jsonb('content').notNullable();
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.integer('version').notNullable().defaultTo(1);
      
      // Indexes for artifact queries
      table.index('session_id', 'idx_collaboration_artifacts_session');
      table.index('artifact_type', 'idx_collaboration_artifacts_type');
    })
    
    // AI explanations table
    .createTable('ai_explanations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('entity_id').notNullable();
      table.string('entity_type', 50).notNullable();
      table.string('explanation_format', 50).notNullable();
      table.text('content').notNullable();
      table.text('summary');
      table.string('audience_level', 20).defaultTo('general');
      table.decimal('confidence_score', 5, 4);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for explanation queries
      table.index(['entity_id', 'entity_type'], 'idx_ai_explanations_entity');
      table.index('explanation_format', 'idx_ai_explanations_format');
    })
    
    // Human feedback table
    .createTable('human_feedback', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('entity_id').notNullable();
      table.string('entity_type', 50).notNullable();
      table.string('feedback_type', 50).notNullable();
      table.integer('rating');
      table.text('comments');
      table.string('provided_by', 100).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for feedback queries
      table.index(['entity_id', 'entity_type'], 'idx_human_feedback_entity');
      table.index('feedback_type', 'idx_human_feedback_type');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('human_feedback')
    .dropTableIfExists('ai_explanations')
    .dropTableIfExists('collaboration_artifacts')
    .dropTableIfExists('collaboration_sessions');
};