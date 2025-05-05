/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    // Add display_name column if it doesn't exist
    table.string('display_name').after('filename');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    // Remove the column if it exists
    table.dropColumn('display_name');
  });
}; 