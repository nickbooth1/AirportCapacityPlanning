/**
 * Script to recreate the conversation_contexts table with camelCase column names
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Dropping and recreating conversation_contexts table with camelCase columns...');
    
    // Drop existing table if it exists
    if (await knex.schema.hasTable('conversation_contexts')) {
      await knex.schema.dropTable('conversation_contexts');
      logger.info('Dropped existing conversation_contexts table');
    }
    
    // Create the conversation_contexts table with camelCase columns
    await knex.schema.createTable('conversation_contexts', table => {
      table.uuid('id').primary().notNullable();
      table.string('userId').notNullable().index();
      table.timestamp('startTime').notNullable().defaultTo(knex.fn.now());
      table.timestamp('lastUpdateTime').notNullable().defaultTo(knex.fn.now());
      table.timestamp('endTime').nullable();
      table.jsonb('messages').defaultTo('[]');
      table.jsonb('entities').defaultTo('{}');
      table.jsonb('intents').defaultTo('[]');
      table.text('summary').nullable();
      table.float('contextQuality').defaultTo(1.0);
      table.specificType('topicTags', 'text[]').defaultTo('{}');
    });
    
    logger.info('Migration successful! Created conversation_contexts table with camelCase columns.');
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