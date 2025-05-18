/**
 * Migration: Create Learning Transfer Schema
 * 
 * This migration creates tables for the Learning Transfer component
 * of the Autonomous Airport Platform, supporting knowledge items,
 * applications, sources, and metrics.
 */

exports.up = function(knex) {
  return knex.schema
    // Knowledge items table
    .createTable('knowledge_items', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('item_type', 50).notNullable();
      table.string('title', 200).notNullable();
      table.text('description');
      table.jsonb('content').notNullable();
      table.string('source_domain', 50);
      table.jsonb('source_context');
      table.specificType('applicable_domains', 'text[]');
      table.decimal('confidence_score', 5, 4);
      table.string('validation_status', 20).defaultTo('unvalidated');
      table.specificType('tags', 'text[]');
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.integer('version').notNullable().defaultTo(1);
      
      // Indexes for knowledge item queries
      table.index('item_type', 'idx_knowledge_items_type');
      table.index('validation_status', 'idx_knowledge_items_validation');
      table.index('source_domain', 'idx_knowledge_items_source');
    })
    
    // Knowledge applications table
    .createTable('knowledge_applications', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('knowledge_item_id').references('id').inTable('knowledge_items');
      table.string('target_domain', 50).notNullable();
      table.jsonb('target_context').notNullable();
      table.timestamp('application_timestamp').defaultTo(knex.fn.now());
      table.integer('success_rating');
      table.jsonb('adaptation_details');
      table.jsonb('metrics');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for application queries
      table.index('knowledge_item_id', 'idx_knowledge_applications_item');
      table.index('target_domain', 'idx_knowledge_applications_domain');
      table.index('application_timestamp', 'idx_knowledge_applications_timestamp');
    })
    
    // Knowledge sources table
    .createTable('knowledge_sources', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('source_type', 50).notNullable();
      table.string('name', 100).notNullable();
      table.text('description');
      table.decimal('reliability_score', 5, 4);
      table.jsonb('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for source queries
      table.index('source_type', 'idx_knowledge_sources_type');
    })
    
    // Learning metrics table
    .createTable('learning_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('metric_type', 50).notNullable();
      table.string('domain', 50);
      table.decimal('value', 10, 4).notNullable();
      table.jsonb('context');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for metrics queries
      table.index('metric_type', 'idx_learning_metrics_type');
      table.index('domain', 'idx_learning_metrics_domain');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('learning_metrics')
    .dropTableIfExists('knowledge_sources')
    .dropTableIfExists('knowledge_applications')
    .dropTableIfExists('knowledge_items');
};