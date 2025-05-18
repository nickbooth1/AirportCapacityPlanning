/**
 * Script to manually run the allocation_scenarios migration
 */

const knex = require('./src/utils/db');

async function runMigration() {
  try {
    console.log('Running migration to create allocation_scenarios table...');
    
    // Check if table already exists
    const exists = await knex.schema.hasTable('allocation_scenarios');
    
    if (exists) {
      console.log('Table allocation_scenarios already exists. Skipping migration.');
      return;
    }
    
    // Create the allocation_scenarios table
    await knex.schema.createTable('allocation_scenarios', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.integer('upload_id').unsigned().references('id').inTable('flight_uploads');
      table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules');
      table.string('status').defaultTo('created');
      table.text('error_message');
      table.timestamp('completion_time');
      table.timestamps(true, true);
    });
    
    console.log('Migration successful! Created allocation_scenarios table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close database connection
    await knex.destroy();
  }
}

// Run the migration
runMigration(); 