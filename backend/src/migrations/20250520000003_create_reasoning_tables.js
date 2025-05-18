/**
 * Migration to create tables for reasoning processes and feedback
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('agent_reasoning_processes', table => {
      table.string('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('userId').notNullable().references('id').inTable('users');
      table.string('contextId').references('id').inTable('agent_conversation_contexts');
      table.text('originalQuery').notNullable();
      table.string('queryTitle');
      table.jsonb('steps').defaultTo('[]');
      table.jsonb('explanations').defaultTo('[]');
      table.text('approach');
      table.jsonb('insights').defaultTo('[]');
      table.jsonb('limitations').defaultTo('[]');
      table.float('confidence').defaultTo(0);
      table.jsonb('tags').defaultTo('[]');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    })
    .createTable('agent_reasoning_feedback', table => {
      table.string('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('reasoningId').notNullable().references('id').inTable('agent_reasoning_processes');
      table.string('userId').notNullable().references('id').inTable('users');
      table.integer('rating').notNullable().checkBetween([1, 5]);
      table.text('comment');
      table.jsonb('improvements').defaultTo('[]');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('agent_reasoning_feedback')
    .dropTableIfExists('agent_reasoning_processes');
};