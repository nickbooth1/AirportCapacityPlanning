/**
 * Migration to create agent conversation contexts table
 */

exports.up = function(knex) {
  return knex.schema.createTable('agent_conversation_contexts', table => {
    table.string('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('userId').notNullable().references('id').inTable('users');
    table.string('sessionId').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.jsonb('context').notNullable().defaultTo('{}');
    table.integer('retentionPeriod').notNullable().defaultTo(30);
    table.timestamp('expiresAt');
    table.index(['userId', 'sessionId']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('agent_conversation_contexts');
};