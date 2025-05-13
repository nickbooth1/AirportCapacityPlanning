/**
 * Migration to add import_status column to the flights table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flights', function(table) {
    // Add import status column if it doesn't exist
    table.string('import_status').defaultTo('pending').comment('Status of import (approved, rejected, pending)');
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
    table.dropColumn('import_status');
  });
};
