/**
 * Script to run the conversation context migration only
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Creating conversation_contexts table...');
    
    // Check if table already exists
    const contextTableExists = await knex.schema.hasTable('conversation_contexts');
    
    if (contextTableExists) {
      logger.info('conversation_contexts table already exists. Skipping migration.');
      return;
    }
    
    // Create the conversation_contexts table
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
    
    logger.info('Migration successful! Created conversation_contexts table.');
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