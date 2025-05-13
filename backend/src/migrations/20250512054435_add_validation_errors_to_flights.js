/**
 * Migration to add validation_errors JSON column to the flights table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.hasColumn('flights', 'validation_errors').then(exists => {
    if (!exists) {
      return knex.schema.table('flights', function(table) {
        table.json('validation_errors').nullable().comment('JSON containing validation error details');
      });
    }
  });
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.hasColumn('flights', 'validation_errors').then(exists => {
    if (exists) {
      return knex.schema.table('flights', function(table) {
        table.dropColumn('validation_errors');
      });
    }
  });
};
