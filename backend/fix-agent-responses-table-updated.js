/**
 * Script to recreate the agent_responses table to match the model
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Recreating agent_responses table to match the model...');
    
    // Drop the existing table if it exists
    if (await knex.schema.hasTable('agent_responses')) {
      await knex.schema.dropTable('agent_responses');
      logger.info('Dropped existing agent_responses table.');
    }
    
    // Create the agent_responses table with correct schema
    await knex.schema.createTable('agent_responses', table => {
      table.uuid('id').primary().notNullable();
      table.uuid('queryId').notNullable();
      table.uuid('contextId').notNullable();
      table.text('text').notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.jsonb('visualizations').notNullable().defaultTo(JSON.stringify([]));
      table.jsonb('rawData').notNullable().defaultTo(JSON.stringify({}));
      table.integer('feedbackRating').nullable();
      table.text('feedbackComment').nullable();
      
      // Add indexes for quick lookup
      table.index(['contextId']);
      table.index(['queryId']);
    });
    
    logger.info('Migration successful! Recreated agent_responses table with correct schema.');
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