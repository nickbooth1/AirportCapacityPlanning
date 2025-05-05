/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('flights', function (table) {
      table.increments('id').primary();
      table.integer('upload_id').unsigned().references('id').inTable('flight_uploads');
      table.string('flight_number').notNullable();
      table.string('flight_nature', 1).notNullable().comment('A = Arrival, D = Departure');
      table.string('airline_iata', 3);
      table.string('airline_name');
      table.string('aircraft_type', 4);
      table.string('aircraft_registration', 10);
      table.string('origin_destination_iata', 3);
      table.string('origin_destination_name');
      table.datetime('scheduled_datetime').notNullable();
      table.datetime('estimated_datetime');
      table.datetime('actual_datetime');
      table.string('terminal', 5);
      table.string('gate', 5);
      table.string('stand', 5);
      table.string('scheduled_service_type');
      table.integer('passenger_count');
      table.string('validation_status').defaultTo('pending');
      table.json('validation_details');
      table.json('validation_errors');
      table.datetime('validated_at');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('flights');
}; 