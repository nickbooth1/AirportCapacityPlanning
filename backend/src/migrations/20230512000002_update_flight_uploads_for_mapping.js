/**
 * Migration to add mapping-related columns to the flight_uploads table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('flight_uploads', function(table) {
    table.string('mapped_file_path').nullable().comment('Path to the mapped file after column mapping');
    table.integer('mapping_profile_id').nullable().references('id').inTable('column_mapping_profiles').onDelete('SET NULL');
    table.boolean('has_been_mapped').defaultTo(false).comment('Flag indicating if this upload has been mapped');
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
    table.dropColumn('mapped_file_path');
    table.dropColumn('mapping_profile_id');
    table.dropColumn('has_been_mapped');
  });
}; 