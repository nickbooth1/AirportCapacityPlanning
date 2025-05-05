/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('flight_uploads', function(table) {
      table.string('external_id').nullable(); // For client-side upload ID tracking
      table.boolean('is_chunked').defaultTo(false); // Whether this is a chunked upload
      table.string('chunks_path').nullable(); // Path to the directory containing chunks
      table.integer('chunk_size').nullable(); // Size of each chunk in bytes
      table.integer('total_chunks').nullable(); // Total number of chunks
      table.integer('uploaded_chunks').defaultTo(0); // Number of uploaded chunks
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('flight_uploads', function(table) {
      table.dropColumn('external_id');
      table.dropColumn('is_chunked');
      table.dropColumn('chunks_path');
      table.dropColumn('chunk_size');
      table.dropColumn('total_chunks');
      table.dropColumn('uploaded_chunks');
    });
}; 