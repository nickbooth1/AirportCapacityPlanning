/**
 * Script to recreate the agent_insights table with camelCase column names
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');

async function runMigration() {
  try {
    logger.info('Dropping and recreating agent_insights table with camelCase columns...');
    
    // Drop existing table if it exists
    if (await knex.schema.hasTable('agent_insights')) {
      await knex.schema.dropTable('agent_insights');
      logger.info('Dropped existing agent_insights table');
    }
    
    // Create the agent_insights table with camelCase columns
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
      table.specificType('tags', 'text[]').defaultTo('{}');
      table.boolean('isArchived').notNullable().defaultTo(false);
      table.jsonb('metadata').defaultTo('{}');
    });
    
    logger.info('Migration successful! Created agent_insights table with camelCase columns.');
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