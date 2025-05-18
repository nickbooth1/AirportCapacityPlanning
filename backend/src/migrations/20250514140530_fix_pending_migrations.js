/**
 * Migration to fix pending migrations by marking them as completed
 * since the tables already exist in the database
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Get current timestamp for all entries
    const now = new Date();
    
    // List of pending migrations to be marked as completed
    const pendingMigrations = [
      '20231201000006_create_capacity_results.js',
      '20240501000001_create_flights_table.js',
      '20240510000000_add_visualization_columns.js',
      '20250512054415_add_validation_status_to_flights.js',
      '20250512055854_add_import_status_to_flights.js',
      '20250512055911_add_name_columns_to_flights.js',
      '20250512055941_add_validation_fields_to_flight_uploads.js',
      '20250512060544_add_import_status_to_flights.js',
      '20250512060800_update_upload_status_constraint.js'
    ];
    
    // Add entries to knex_migrations table
    const migrationEntries = pendingMigrations.map(name => ({
      name,
      batch: 42, // Use a high batch number to avoid conflicts
      migration_time: now
    }));
    
    await trx('knex_migrations').insert(migrationEntries);
    
    console.log(`Marked ${pendingMigrations.length} pending migrations as completed`);
  });
};

/**
 * Undo the fix by removing the entries from knex_migrations
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    const pendingMigrations = [
      '20231201000006_create_capacity_results.js',
      '20240501000001_create_flights_table.js',
      '20240510000000_add_visualization_columns.js',
      '20250512054415_add_validation_status_to_flights.js',
      '20250512055854_add_import_status_to_flights.js',
      '20250512055911_add_name_columns_to_flights.js',
      '20250512055941_add_validation_fields_to_flight_uploads.js',
      '20250512060544_add_import_status_to_flights.js',
      '20250512060800_update_upload_status_constraint.js'
    ];
    
    await trx('knex_migrations')
      .whereIn('name', pendingMigrations)
      .delete();
      
    console.log(`Removed ${pendingMigrations.length} migration entries`);
  });
};
