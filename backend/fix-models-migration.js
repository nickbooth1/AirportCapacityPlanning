/**
 * Script to recreate the tables with proper JSON/JSONB fields
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Dropping and recreating tables with proper JSON fields...');
    
    // Drop existing tables if they exist
    if (await knex.schema.hasTable('conversation_contexts')) {
      await knex.schema.dropTable('conversation_contexts');
      logger.info('Dropped existing conversation_contexts table');
    }
    
    if (await knex.schema.hasTable('agent_insights')) {
      await knex.schema.dropTable('agent_insights');
      logger.info('Dropped existing agent_insights table');
    }
    
    // Create the conversation_contexts table with proper JSONB fields
    await knex.schema.createTable('conversation_contexts', table => {
      table.uuid('id').primary().notNullable();
      table.string('userId').notNullable().index();
      table.timestamp('startTime').notNullable().defaultTo(knex.fn.now());
      table.timestamp('lastUpdateTime').notNullable().defaultTo(knex.fn.now());
      table.timestamp('endTime').nullable();
      table.jsonb('messages').notNullable().defaultTo(JSON.stringify([]));
      table.jsonb('entities').notNullable().defaultTo(JSON.stringify({}));
      table.jsonb('intents').notNullable().defaultTo(JSON.stringify([]));
      table.text('summary').nullable();
      table.float('contextQuality').defaultTo(1.0);
      table.text('topicTags').notNullable().defaultTo('[]');
    });
    
    logger.info('Created conversation_contexts table with proper JSON fields.');
    
    // Create the agent_insights table with proper JSONB fields
    await knex.schema.createTable('agent_insights', table => {
      table.uuid('id').primary().notNullable();
      table.string('userId').notNullable().index();
      table.uuid('contextId').nullable();
      table.text('content').notNullable();
      table.string('title').notNullable();
      table.string('category', 30).notNullable();
      table.integer('importance').notNullable().defaultTo(5);
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
      table.text('tags').notNullable().defaultTo('[]');
      table.boolean('isArchived').notNullable().defaultTo(false);
      table.jsonb('metadata').notNullable().defaultTo(JSON.stringify({}));
    });
    
    logger.info('Created agent_insights table with proper JSON fields.');
    
    logger.info('Migration successful!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await knex.destroy();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });