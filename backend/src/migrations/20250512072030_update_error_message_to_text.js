/**
 * Migration to change error_message column from varchar to text in flight_uploads table
 * to handle longer error messages
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.alterTable('flight_uploads', function(table) {
    // Change the column type from string (varchar) to text
    table.text('error_message').alter();
  });
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.alterTable('flight_uploads', function(table) {
    // Change back to string with default limit (255)
    table.string('error_message').alter();
  });
}; 