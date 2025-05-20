/**
 * Migration: Create Entity Change Logs Table
 * 
 * This migration creates a table for tracking changes to entities in the system.
 * It's used for audit purposes to record who changed what and when.
 */
exports.up = function(knex) {
  return knex.schema.createTable('entity_change_logs', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 50).notNullable().index();
    table.string('entity_id', 36).notNullable().index();
    table.string('action', 20).notNullable();
    table.jsonb('previous_state');
    table.jsonb('new_state');
    table.jsonb('changed_fields');
    table.string('user_id', 36).index();
    table.string('user_name', 100);
    table.string('ip_address', 45);
    table.string('user_agent', 255);
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.text('notes');
    
    // Composite index for efficient queries by entity_type and entity_id
    table.index(['entity_type', 'entity_id']);
    // Index for time-based queries
    table.index('timestamp');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('entity_change_logs');
};