/**
 * Migration to create stand_utilization_metrics table for tracking stand usage metrics
 */
exports.up = function(knex) {
  return knex.schema.createTable('stand_utilization_metrics', (table) => {
    table.increments('id').primary();
    table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules').onDelete('CASCADE');
    table.integer('stand_id').unsigned().references('id').inTable('stands').onDelete('CASCADE');
    table.string('time_period').notNullable(); // daily, hourly, etc.
    table.timestamp('period_start').notNullable();
    table.timestamp('period_end').notNullable();
    table.decimal('utilization_percentage', 5, 2).notNullable();
    table.integer('minutes_utilized').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Migration to drop the stand_utilization_metrics table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('stand_utilization_metrics');
}; 