/**
 * Migration to create flight_uploads table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('flight_uploads', (table) => {
      table.increments('id').primary();
      table.string('filename').notNullable();
      table.string('file_path').notNullable();
      table.integer('file_size').unsigned().notNullable();
      table.enum('upload_status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
      table.integer('total_records').unsigned().defaultTo(0);
      table.integer('imported_records').unsigned().defaultTo(0);
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.integer('uploaded_by').unsigned().nullable();
      table.string('error_message').nullable();
      // Add fields for chunked uploads
      table.string('external_id').nullable().unique();
      table.boolean('is_chunked').defaultTo(false);
      table.string('chunks_path').nullable();
      table.integer('chunk_size').unsigned().nullable();
      table.integer('total_chunks').unsigned().nullable();
      table.integer('uploaded_chunks').unsigned().defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('flights', (table) => {
      table.increments('id').primary();
      table.integer('upload_id').unsigned().notNullable().references('id').inTable('flight_uploads').onDelete('CASCADE');
      table.string('airline_iata').notNullable();
      table.string('flight_number').notNullable();
      table.timestamp('scheduled_datetime').notNullable();
      table.enum('flight_nature', ['A', 'D']).notNullable();
      table.string('origin_destination_iata').notNullable();
      table.string('aircraft_type_iata').notNullable();
      table.string('terminal').nullable();
      table.integer('seat_capacity').unsigned().nullable();
      table.timestamp('estimated_datetime').nullable();
      table.enum('validation_status', ['valid', 'invalid']).nullable();
      table.json('validation_errors').nullable();
      table.boolean('is_approved').defaultTo(false);
      table.timestamps(true, true);
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