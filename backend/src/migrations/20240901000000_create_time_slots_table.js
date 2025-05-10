/**
 * Migration to create time_slots table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('time_slots', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().comment('User-friendly name for the time slot');
      table.time('start_time').notNullable().comment('Start time of the slot (HH:MM:SS)');
      table.time('end_time').notNullable().comment('End time of the slot (HH:MM:SS)');
      table.text('description').nullable().comment('Optional description of the time slot');
      table.boolean('is_active').defaultTo(true).comment('Whether the time slot is active');
      table.timestamps(true, true);
      
      // Add a unique constraint on the name to prevent duplicates
      table.unique(['name']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('time_slots');
}; 