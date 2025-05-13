/**
 * Migration to create the column_mapping_profiles table
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.up = function(knex) {
  return knex.schema.createTable('column_mapping_profiles', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('user_id').nullable();
    table.json('mappings').notNullable();
    table.json('transformations').nullable();
    table.timestamp('last_used').nullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Undo the migration
 * 
 * @param {import('knex')} knex - The Knex instance
 * @returns {Promise} - Knex migration promise
 */
exports.down = function(knex) {
  return knex.schema.dropTable('column_mapping_profiles');
}; 