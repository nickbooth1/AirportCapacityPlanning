/**
 * Script to create the agent_queries table
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Creating agent_queries table...');
    
    // Check if table already exists
    const tableExists = await knex.schema.hasTable('agent_queries');
    
    if (tableExists) {
      logger.info('agent_queries table already exists. Skipping migration.');
      return;
    }
    
    // Create the agent_queries table
    await knex.schema.createTable('agent_queries', table => {
      table.uuid('id').primary().notNullable();
      table.uuid('contextId').notNullable();
      table.text('text').notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.boolean('processing').notNullable().defaultTo(true);
      table.jsonb('entities').notNullable().defaultTo(JSON.stringify({}));
      
      // Add index for quick lookup
      table.index(['contextId']);
    });
    
    logger.info('Migration successful! Created agent_queries table.');
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