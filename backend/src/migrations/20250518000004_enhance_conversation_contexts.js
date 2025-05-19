/**
 * Migration to create a new conversation contexts table
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('agent_conversation_summary', table => {
      table.string('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('contextId').references('id').inTable('agent_conversation_contexts');
      table.text('summary');
      table.float('contextQuality');
      table.jsonb('topicTags').defaultTo('[]');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('agent_conversation_summary');
};