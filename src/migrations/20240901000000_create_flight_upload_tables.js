/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Flight uploads table
    .createTable('flight_uploads', function(table) {
      table.increments('id').primary();
      table.string('filename').notNullable();
      table.string('file_path').notNullable();
      table.bigInteger('file_size').unsigned().notNullable();
      table.enum('upload_status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
      table.integer('uploaded_by').unsigned().notNullable();
      table.timestamps(true, true);
    })
    
    // Flights table
    .createTable('flights', function(table) {
      table.increments('id').primary();
      table.integer('upload_id').unsigned().references('id').inTable('flight_uploads').onDelete('CASCADE');
      table.string('airline_iata').notNullable();
      table.string('flight_number').notNullable();
      table.dateTime('scheduled_datetime').notNullable();
      table.dateTime('estimated_datetime').nullable();
      table.enum('flight_nature', ['D', 'A']).notNullable().comment('D for departure, A for arrival');
      table.string('origin_destination_iata').notNullable();
      table.string('aircraft_type_iata').notNullable();
      table.string('flight_type_iata').notNullable();
      table.string('terminal').nullable();
      table.string('country').nullable();
      table.integer('seat_capacity').unsigned().nullable();
      table.string('link_id').nullable().comment('Unique identifier from source');
      table.string('eu_status').nullable();
      table.string('cta_status').nullable();
      table.string('sector').nullable();
      table.string('gate').nullable();
      table.integer('expected_passengers').unsigned().nullable();
      table.enum('validation_status', ['valid', 'invalid']).defaultTo('valid');
      table.json('validation_errors').nullable();
      table.enum('import_status', ['pending', 'imported', 'excluded']).defaultTo('pending');
      table.timestamps(true, true);
      
      // Indexes
      table.index('airline_iata');
      table.index('flight_nature');
      table.index(['scheduled_datetime', 'flight_nature']);
      table.index('validation_status');
      table.index('import_status');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('flights')
    .dropTableIfExists('flight_uploads');
}; 