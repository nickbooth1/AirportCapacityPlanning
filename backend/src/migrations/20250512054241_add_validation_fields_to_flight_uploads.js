/**
 * Migration to add validation fields to the flight_uploads table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    table.string('validation_status').nullable().comment('Status of validation process (pending, completed, failed)');
    table.string('processing_status').nullable().comment('Status of processing (pending, processing, completed, failed)');
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
    table.dropColumn('validation_status');
    table.dropColumn('processing_status');
  });
};
