/**
 * Migration to create unallocated_flights table for tracking flights that couldn't be allocated
 */
exports.up = function(knex) {
  return knex.schema.createTable('unallocated_flights', (table) => {
    table.increments('id').primary();
    table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules').onDelete('CASCADE');
    table.integer('flight_id').unsigned().references('id').inTable('flights').onDelete('CASCADE');
    table.string('reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Migration to drop the unallocated_flights table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('unallocated_flights');
}; 