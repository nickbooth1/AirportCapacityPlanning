/**
 * Create allocation_scenarios table
 */
exports.up = function(knex) {
  return knex.schema.createTable('allocation_scenarios', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('upload_id').unsigned().references('id').inTable('flight_uploads');
    table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules');
    table.string('status').defaultTo('created');
    table.text('error_message');
    table.timestamp('completion_time');
    table.timestamps(true, true);
  });
};

/**
 * Drop allocation_scenarios table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('allocation_scenarios');
}; 