/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Skip the migration if the columns already exist
  return knex.schema.hasColumn('capacity_results', 'visualization')
    .then(function(exists) {
      // Only proceed if the table exists and has the visualization column
      if (exists) {
        console.log('Capacity results table exists with visualization column, no changes needed');
        return Promise.resolve();
      }
      
      // Otherwise try to add the columns
      return knex.schema.hasTable('capacity_results')
        .then(function(tableExists) {
          if (tableExists) {
            console.log('Adding visualization column to capacity_results table');
            return knex.schema.alterTable('capacity_results', function(table) {
              // Add visualization column if it doesn't exist
              table.json('visualization').nullable();
            });
          } else {
            console.log('Capacity results table does not exist, skipping migration');
            return Promise.resolve();
          }
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.hasColumn('capacity_results', 'visualization')
    .then(function(exists) {
      if (exists) {
        return knex.schema.alterTable('capacity_results', function(table) {
          table.dropColumn('visualization');
        });
      }
      return Promise.resolve();
    });
}; 