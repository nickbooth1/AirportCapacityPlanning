/**
 * Migration to add validation_status column to the flights table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flights', function(table) {
    // Add validation status column if it doesn't exist
    table.string('validation_status').defaultTo('pending').comment('Status of validation (valid, invalid, pending)');
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
    table.dropColumn('validation_status');
  });
};
