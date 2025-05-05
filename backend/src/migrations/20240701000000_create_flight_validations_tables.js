/**
 * Migration to create tables for flight validations
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Flight Validations table
    .createTable('flight_validations', (table) => {
      table.increments('id').primary();
      table.integer('upload_id').unsigned().notNullable().references('id').inTable('flight_uploads').onDelete('CASCADE');
      table.enum('validation_status', ['pending', 'in_progress', 'completed', 'failed']).defaultTo('pending');
      table.integer('valid_count').defaultTo(0);
      table.integer('invalid_count').defaultTo(0);
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
    })
    
    // Flight Validation Errors table
    .createTable('flight_validation_errors', (table) => {
      table.increments('id').primary();
      table.integer('flight_id').unsigned().notNullable().references('id').inTable('flights').onDelete('CASCADE');
      table.enum('error_type', [
        'airline_unknown', 
        'airport_unknown', 
        'aircraft_unknown', 
        'terminal_invalid',
        'capacity_invalid',
        'format_invalid',
        'required_field_missing',
        'date_invalid'
      ]);
      table.enum('error_severity', ['error', 'warning', 'info']).defaultTo('error');
      table.text('error_message');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('flight_validation_errors')
    .dropTableIfExists('flight_validations');
}; 