/**
 * Migration to add validation count columns to flight_uploads table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    // Add validation count columns if they don't exist
    table.integer('valid_flights').defaultTo(0).comment('Count of valid flights in this upload');
    table.integer('invalid_flights').defaultTo(0).comment('Count of invalid flights in this upload');
    table.integer('total_flights').defaultTo(0).comment('Total count of flights in this upload');
  });
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    table.dropColumn('valid_flights');
    table.dropColumn('invalid_flights');
    table.dropColumn('total_flights');
  });
};
