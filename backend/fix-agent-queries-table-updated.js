/**
 * Script to recreate the agent_queries table to match the model
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Recreating agent_queries table to match the model...');
    
    // Drop the existing table if it exists
    if (await knex.schema.hasTable('agent_queries')) {
      await knex.schema.dropTable('agent_queries');
      logger.info('Dropped existing agent_queries table.');
    }
    
    // Create the agent_queries table with correct schema
    await knex.schema.createTable('agent_queries', table => {
      table.uuid('id').primary().notNullable();
      table.text('text').notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.uuid('contextId').notNullable();
      table.string('parsedIntent').nullable();
      table.float('confidence').nullable();
      table.jsonb('entities').notNullable().defaultTo(JSON.stringify({}));
      table.jsonb('processing').notNullable().defaultTo(JSON.stringify({
        startTime: new Date().toISOString(),
        status: 'pending',
        error: null
      }));
      
      // Add index for quick lookup
      table.index(['contextId']);
    });
    
    logger.info('Migration successful! Recreated agent_queries table with correct schema.');
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