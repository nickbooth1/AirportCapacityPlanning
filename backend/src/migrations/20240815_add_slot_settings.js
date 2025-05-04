/**
 * Migration to add slot-related fields to operational_settings table
 */
exports.up = function(knex) {
  return knex.schema.table('operational_settings', (table) => {
    table.integer('slot_duration_minutes').notNullable().defaultTo(10);
    table.integer('slot_block_size').notNullable().defaultTo(6);
  });
};

exports.down = function(knex) {
  return knex.schema.table('operational_settings', (table) => {
    table.dropColumn('slot_duration_minutes');
    table.dropColumn('slot_block_size');
  });
}; 