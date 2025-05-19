/**
 * Migration: Create Conversation Context and Long Term Memory Tables
 * 
 * This migration creates the database tables for:
 * 1. conversation_contexts - Stores conversation history and context
 * 2. agent_long_term_memories - Stores long-term memory items from conversations
 */

exports.up = function(knex) {
  return knex.schema
    // Create conversation_contexts table
    .createTable('conversation_contexts', table => {
      table.uuid('id').primary().notNullable();
      table.string('user_id').notNullable().index();
      table.timestamp('start_time').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_update_time').notNullable().defaultTo(knex.fn.now());
      table.timestamp('end_time').nullable();
      table.jsonb('messages').defaultTo('[]');
      table.jsonb('entities').defaultTo('{}');
      table.jsonb('intents').defaultTo('[]');
      table.text('summary').nullable();
      table.float('context_quality').defaultTo(1.0);
      table.specificType('topic_tags', 'text[]').defaultTo('{}');
    })
    
    // Create agent_long_term_memories table
    .createTable('agent_long_term_memories', table => {
      table.uuid('id').primary().notNullable();
      table.string('user_id').notNullable().index();
      table.uuid('context_id').nullable().references('id').inTable('conversation_contexts').onDelete('SET NULL');
      table.text('content').notNullable();
      table.string('category', 20).notNullable().defaultTo('OTHER');
      table.integer('importance').notNullable().defaultTo(5);
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_accessed_at').nullable();
      table.integer('access_count').notNullable().defaultTo(0);
      table.specificType('tags', 'text[]').defaultTo('{}');
      
      // Create indexes for common query patterns
      table.index(['user_id', 'category']);
      table.index(['user_id', 'importance']);
      table.index(['user_id', 'timestamp']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('agent_long_term_memories')
    .dropTableIfExists('conversation_contexts');
};