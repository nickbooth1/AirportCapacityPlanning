/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Drop existing tables to recreate them with our updated schema
    .dropTableIfExists('turnaround_rules')
    .dropTableIfExists('operational_settings')
    
    // Recreate operational_settings as a single-row table for global settings
    .createTable('operational_settings', (table) => {
      table.increments('id').primary().comment('Only one row should exist in this table');
      table.integer('default_gap_minutes').notNullable().defaultTo(15)
        .comment('Default buffer time required between aircraft occupying the same stand');
      table.time('operating_start_time').notNullable().defaultTo('06:00:00')
        .comment('Start of the core operational period for capacity calculation');
      table.time('operating_end_time').notNullable().defaultTo('23:59:59')
        .comment('End of the core operational period for capacity calculation');
      table.integer('slot_duration_minutes').notNullable().defaultTo(10)
        .comment('Duration of each time slot in minutes');
      table.integer('slot_block_size').notNullable().defaultTo(6)
        .comment('Number of slots per block for hourly reporting');
      table.timestamps(true, true);
    })
    
    // Recreate turnaround_rules table with the required structure
    .createTable('turnaround_rules', (table) => {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
      table.integer('aircraft_type_id').unsigned().notNullable()
        .references('id').inTable('aircraft_types').onDelete('CASCADE');
      table.integer('min_turnaround_minutes').notNullable()
        .comment('The standard minimum time required for an aircraft of this type to turnaround on a stand');
      table.timestamps(true, true);
      // Ensure one rule per aircraft type
      table.unique(['aircraft_type_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('turnaround_rules')
    .dropTableIfExists('operational_settings')
    // Recreate the original tables from the initial schema
    .createTable('operational_settings', (table) => {
      table.increments('id').primary();
      table.string('key').unique().notNullable();
      table.text('value');
      table.string('data_type');
      table.text('description');
      table.timestamps(true, true);
    })
    .createTable('turnaround_rules', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('aircraft_type_id').unsigned().notNullable()
        .references('id').inTable('aircraft_types').onDelete('CASCADE');
      table.string('stand_type');
      table.integer('minimum_turnaround_minutes');
      table.integer('optimal_turnaround_minutes');
      table.text('description');
      table.timestamps(true, true);
    });
}; 