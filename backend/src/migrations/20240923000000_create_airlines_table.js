/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('airlines', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('iata_code', 2).unique();
      table.string('icao_code', 3).unique();
      table.string('callsign');
      table.string('country');
      table.boolean('active').defaultTo(true);
      table.string('headquarters');
      table.integer('founded');
      table.integer('fleet_size');
      table.integer('destinations');
      table.string('alliance');
      table.json('subsidiaries');
      table.string('parent');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('airlines');
}; 