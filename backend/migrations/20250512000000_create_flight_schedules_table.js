/**
 * Migration to create flight_schedules table for storing processed flight schedules
 */
exports.up = function(knex) {
  return knex.schema.createTable('flight_schedules', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('upload_id').unsigned().references('id').inTable('flight_uploads').onDelete('CASCADE');
    table.integer('created_by').unsigned();
    table.date('start_date');
    table.date('end_date');
    table.enum('status', ['draft', 'validated', 'allocated', 'finalized', 'failed']).defaultTo('draft');
    table.timestamp('validated_at');
    table.timestamp('allocated_at');
    table.integer('valid_flights').defaultTo(0);
    table.integer('invalid_flights').defaultTo(0);
    table.integer('allocated_flights').defaultTo(0);
    table.integer('unallocated_flights').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Migration to drop the flight_schedules table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('flight_schedules');
}; 