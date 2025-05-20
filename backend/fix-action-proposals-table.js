/**
 * Script to create the action_proposals table
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Creating action_proposals table...');
    
    // Check if table already exists
    const tableExists = await knex.schema.hasTable('action_proposals');
    
    if (tableExists) {
      logger.info('action_proposals table already exists. Skipping migration.');
      return;
    }
    
    // Create the action_proposals table
    await knex.schema.createTable('action_proposals', table => {
      table.uuid('id').primary().notNullable();
      table.uuid('contextId').notNullable();
      table.string('userId').notNullable();
      table.string('actionType').notNullable();
      table.text('description').notNullable();
      table.jsonb('parameters').notNullable().defaultTo(JSON.stringify({}));
      table.text('impact').nullable();
      table.string('status').notNullable().defaultTo('pending');
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expiresAt').notNullable().defaultTo(knex.raw('NOW() + interval \'1 day\'')); 
      table.timestamp('approvedAt').nullable();
      table.timestamp('rejectedAt').nullable();
      table.timestamp('executedAt').nullable();
      table.text('reason').nullable();
      table.jsonb('result').nullable();
      
      // Add indexes for quick lookup
      table.index(['contextId']);
      table.index(['userId']);
      table.index(['status']);
    });
    
    logger.info('Migration successful! Created action_proposals table.');
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