/**
 * Migration to add name columns to the flights table for better display
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flights', function(table) {
    // Add name columns if they don't exist
    table.string('airline_name').nullable().comment('Full name of the airline');
    table.string('origin_destination_name').nullable().comment('Full name of the origin/destination airport');
  });
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.table('flights', function(table) {
    table.dropColumn('airline_name');
    table.dropColumn('origin_destination_name');
  });
};
