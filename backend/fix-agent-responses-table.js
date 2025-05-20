/**
 * Script to create the agent_responses table
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Creating agent_responses table...');
    
    // Check if table already exists
    const tableExists = await knex.schema.hasTable('agent_responses');
    
    if (tableExists) {
      logger.info('agent_responses table already exists. Skipping migration.');
      return;
    }
    
    // Create the agent_responses table
    await knex.schema.createTable('agent_responses', table => {
      table.uuid('id').primary().notNullable();
      table.uuid('queryId').notNullable();
      table.uuid('contextId').notNullable();
      table.text('content').notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('status').notNullable().defaultTo('completed');
      table.integer('rating').nullable();
      table.text('feedback').nullable();
      table.text('sources').nullable();
      table.jsonb('metadata').notNullable().defaultTo(JSON.stringify({}));
      
      // Add indexes for quick lookup
      table.index(['contextId']);
      table.index(['queryId']);
    });
    
    logger.info('Migration successful! Created agent_responses table.');
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