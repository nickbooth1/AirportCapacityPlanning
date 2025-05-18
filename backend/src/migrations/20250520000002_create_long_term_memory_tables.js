/**
 * Migration to create tables for long-term memory storage
 */

exports.up = function(knex) {
  return Promise.all([
    // Conversation contexts table
    knex.schema.createTable('conversation_contexts', table => {
      table.uuid('id').primary();
      table.string('user_id').notNullable();
      table.string('session_id').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.jsonb('context').notNullable();
      table.integer('retention_period').notNullable();
      table.timestamp('expires_at').notNullable();
      table.index(['user_id', 'session_id']);
    }),
    
    // User preferences table
    knex.schema.createTable('user_preferences', table => {
      table.string('user_id').primary();
      table.jsonb('preferences').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }),
    
    // Decision history table
    knex.schema.createTable('decision_history', table => {
      table.uuid('id').primary();
      table.string('user_id').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.string('decision_type').notNullable();
      table.string('description').notNullable();
      table.jsonb('context');
      table.jsonb('parameters');
      table.jsonb('expected_outcome');
      table.jsonb('actual_outcome');
      table.text('outcome_notes');
      table.timestamp('outcome_timestamp');
      table.integer('retention_period').notNullable();
      table.timestamp('expires_at').notNullable();
      table.index(['user_id', 'decision_type']);
    }),
    
    // Patterns table
    knex.schema.createTable('patterns', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.string('pattern_type').notNullable();
      table.timestamp('identified_at').defaultTo(knex.fn.now());
      table.float('confidence').notNullable();
      table.jsonb('supporting_evidence');
      table.jsonb('relevant_entities');
      table.integer('retention_period').notNullable();
      table.timestamp('expires_at').notNullable();
      table.index(['pattern_type']);
    }),
    
    // Query links table
    knex.schema.createTable('query_links', table => {
      table.uuid('id').primary();
      table.string('session_id').notNullable();
      table.string('query_id').notNullable();
      table.string('related_query_id').notNullable();
      table.string('relationship').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.index(['session_id', 'query_id']);
    }),
    
    // Session contexts table (short to medium term)
    knex.schema.createTable('session_contexts', table => {
      table.string('session_id').primary();
      table.jsonb('context').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
    }),
    
    // Stored query plans table
    knex.schema.createTable('query_plans', table => {
      table.string('session_id').notNullable();
      table.string('query_id').notNullable();
      table.jsonb('plan').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['session_id', 'query_id']);
    }),
    
    // Step results table
    knex.schema.createTable('step_results', table => {
      table.string('session_id').notNullable();
      table.string('query_id').notNullable();
      table.string('step_id').notNullable();
      table.jsonb('result').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['session_id', 'query_id', 'step_id']);
    }),
    
    // Final results table
    knex.schema.createTable('final_results', table => {
      table.string('session_id').notNullable();
      table.string('query_id').notNullable();
      table.jsonb('result').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['session_id', 'query_id']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('final_results'),
    knex.schema.dropTableIfExists('step_results'),
    knex.schema.dropTableIfExists('query_plans'),
    knex.schema.dropTableIfExists('session_contexts'),
    knex.schema.dropTableIfExists('query_links'),
    knex.schema.dropTableIfExists('patterns'),
    knex.schema.dropTableIfExists('decision_history'),
    knex.schema.dropTableIfExists('user_preferences'),
    knex.schema.dropTableIfExists('conversation_contexts')
  ]);
};