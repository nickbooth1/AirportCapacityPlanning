/**
 * Migration to create the capacity_results table
 */

exports.up = function(knex) {
  return knex.schema.createTable('capacity_results', (table) => {
    table.increments('id').primary();
    table.timestamp('calculation_timestamp').notNullable().defaultTo(knex.fn.now());
    table.date('operating_day');
    table.jsonb('settings').notNullable();
    table.jsonb('best_case_capacity').notNullable();
    table.jsonb('worst_case_capacity').notNullable();
    table.jsonb('time_slots').notNullable();
    table.jsonb('metadata').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('capacity_results');
}; 