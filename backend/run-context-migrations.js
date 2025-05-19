/**
 * Script to run the conversation context and long-term memory migrations
 */

const knex = require('./src/utils/db');
const logger = require('./src/utils/logger');
const path = require('path');
const fs = require('fs');

async function runMigrations() {
  try {
    logger.info('Running migrations for conversation contexts and long-term memory...');
    
    // Check if tables already exist
    const contextTableExists = await knex.schema.hasTable('conversation_contexts');
    const memoryTableExists = await knex.schema.hasTable('agent_long_term_memories');
    
    if (contextTableExists && memoryTableExists) {
      logger.info('Tables already exist. Skipping migrations.');
      return;
    }
    
    // Load and run the migration file
    const migrationFile = path.join(__dirname, 'migrations', '20250520000002_create_long_term_memory_tables.js');
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const migration = require(migrationFile);
    
    if (typeof migration.up !== 'function') {
      throw new Error('Invalid migration file: missing up function');
    }
    
    // Run the migration
    await migration.up(knex);
    
    logger.info('Migration successful! Created conversation context and long-term memory tables.');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await knex.destroy();
  }
}

// Run the migrations
runMigrations()
  .then(() => {
    console.log('Migrations completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });