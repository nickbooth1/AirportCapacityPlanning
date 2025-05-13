/**
 * Migration to add terminal column to stands table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.table('stands', function(table) {
    table.string('terminal').nullable();
  });
};

/**
 * Rollback migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.table('stands', function(table) {
    table.dropColumn('terminal');
  });
};
