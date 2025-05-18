/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Conversation Context Table
    .createTable('conversation_contexts', table => {
      table.uuid('id').primary();
      table.string('userId').notNullable();
      table.timestamp('startTime').notNullable();
      table.timestamp('lastUpdateTime').notNullable();
      table.jsonb('messages').defaultTo('[]');
      table.jsonb('entities').defaultTo('{}');
      table.jsonb('intents').defaultTo('[]');
      table.index('userId');
    })
    
    // Agent Queries Table
    .createTable('agent_queries', table => {
      table.uuid('id').primary();
      table.text('text').notNullable();
      table.timestamp('timestamp').notNullable();
      table.uuid('contextId').references('id').inTable('conversation_contexts').onDelete('CASCADE');
      table.string('parsedIntent').nullable();
      table.float('confidence').nullable();
      table.jsonb('entities').defaultTo('{}');
      table.jsonb('processing').defaultTo('{}');
      table.index('contextId');
    })
    
    // Agent Responses Table
    .createTable('agent_responses', table => {
      table.uuid('id').primary();
      table.uuid('queryId').references('id').inTable('agent_queries').onDelete('CASCADE');
      table.uuid('contextId').references('id').inTable('conversation_contexts').onDelete('CASCADE');
      table.text('text').notNullable();
      table.timestamp('timestamp').notNullable();
      table.jsonb('visualizations').defaultTo('[]');
      table.jsonb('rawData').defaultTo('{}');
      table.integer('feedbackRating').nullable();
      table.text('feedbackComment').nullable();
      table.index('queryId');
      table.index('contextId');
    })
    
    // Action Proposals Table
    .createTable('action_proposals', table => {
      table.uuid('id').primary();
      table.uuid('contextId').references('id').inTable('conversation_contexts').onDelete('CASCADE');
      table.string('userId').notNullable();
      table.string('actionType').notNullable();
      table.text('description').notNullable();
      table.jsonb('parameters').defaultTo('{}');
      table.text('impact').nullable();
      table.string('status').defaultTo('pending');
      table.timestamp('createdAt').notNullable();
      table.timestamp('expiresAt').notNullable();
      table.timestamp('approvedAt').nullable();
      table.timestamp('rejectedAt').nullable();
      table.timestamp('executedAt').nullable();
      table.text('reason').nullable();
      table.jsonb('result').nullable();
      table.index('contextId');
      table.index('userId');
      table.index('status');
    })
    
    // Agent Insights Table
    .createTable('agent_insights', table => {
      table.uuid('id').primary();
      table.uuid('responseId').references('id').inTable('agent_responses').onDelete('CASCADE');
      table.string('userId').notNullable();
      table.string('title').notNullable();
      table.string('category').defaultTo('other');
      table.timestamp('createdAt').notNullable();
      table.text('notes').nullable();
      table.jsonb('tags').defaultTo('[]');
      table.index('responseId');
      table.index('userId');
      table.index('category');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('agent_insights')
    .dropTableIfExists('action_proposals')
    .dropTableIfExists('agent_responses')
    .dropTableIfExists('agent_queries')
    .dropTableIfExists('conversation_contexts');
}; 