/**
 * Migration to add validation fields to flight_uploads table for tracking validation status
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    // Add validation fields
    table.string('validation_status').defaultTo('pending')
      .comment('Status of validation (valid, invalid, pending)');
    table.integer('valid_count').defaultTo(0)
      .comment('Count of valid flights in this upload');
    table.integer('invalid_count').defaultTo(0)
      .comment('Count of invalid flights in this upload');
    table.timestamp('validated_at').nullable()
      .comment('When validation was completed');
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
    table.dropColumn('valid_count');
    table.dropColumn('invalid_count');
    table.dropColumn('validated_at');
  });
};
