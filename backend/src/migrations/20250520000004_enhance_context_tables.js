/**
 * Migration to enhance conversation context and add long-term memory
 */

exports.up = function(knex) {
  return knex.schema
    // Enhance the conversation_contexts table
    .alterTable('conversation_contexts', table => {
      table.text('summary');
      table.float('contextQuality');
      table.jsonb('topicTags').defaultTo('[]');
    })
    
    // Create the long-term memory table
    .createTable('agent_long_term_memories', table => {
      table.string('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('userId').notNullable().references('id').inTable('users');
      table.string('contextId').references('id').inTable('conversation_contexts');
      table.text('content').notNullable();
      table.string('category').defaultTo('OTHER');
      table.integer('importance').defaultTo(5);
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.timestamp('lastAccessedAt');
      table.integer('accessCount').defaultTo(0);
      table.jsonb('tags').defaultTo('[]');
      
      // Indexes for faster lookup
      table.index('userId');
      table.index('contextId');
      table.index('category');
      table.index('importance');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('agent_long_term_memories')
    .alterTable('conversation_contexts', table => {
      table.dropColumn('summary');
      table.dropColumn('contextQuality');
      table.dropColumn('topicTags');
    });
};