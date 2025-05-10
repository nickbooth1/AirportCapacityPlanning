/**
 * Migration to create stand_allocations table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('stand_allocations', (table) => {
      table.increments('id').primary();
      table.integer('stand_id').notNullable().references('id').inTable('stands');
      table.integer('flight_id').notNullable().references('id').inTable('flights');
      table.timestamp('allocated_start_time').notNullable();
      table.timestamp('allocated_end_time').notNullable();
      table.text('notes').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.unique(['stand_id', 'flight_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('stand_allocations');
}; 