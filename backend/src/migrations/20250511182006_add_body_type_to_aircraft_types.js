/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('aircraft_types', function(table) {
    table.string('body_type', 10).nullable().comment('Body type: narrow or wide');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('aircraft_types', function(table) {
    table.dropColumn('body_type');
  });
};
