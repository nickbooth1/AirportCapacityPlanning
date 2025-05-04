/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Terminals
    .createTable('terminals', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable();
      table.text('description');
      table.timestamps(true, true);
    })
    
    // Piers
    .createTable('piers', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').notNullable();
      table.integer('terminal_id').unsigned().notNullable()
        .references('id').inTable('terminals').onDelete('CASCADE');
      table.text('description');
      table.timestamps(true, true);
      table.unique(['code', 'terminal_id']);
    })
    
    // Aircraft Types
    .createTable('aircraft_types', (table) => {
      table.increments('id').primary();
      table.string('iata_code').unique().notNullable();
      table.string('icao_code').unique().notNullable();
      table.string('name').notNullable();
      table.string('manufacturer');
      table.string('model');
      table.integer('wingspan_meters');
      table.integer('length_meters');
      table.string('size_category');
      table.timestamps(true, true);
    })
    
    // Stands
    .createTable('stands', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').notNullable();
      table.integer('pier_id').unsigned().notNullable()
        .references('id').inTable('piers').onDelete('CASCADE');
      table.boolean('is_active').defaultTo(true);
      table.string('stand_type');
      table.boolean('has_jetbridge');
      table.integer('max_wingspan_meters');
      table.integer('max_length_meters');
      table.string('max_aircraft_size');
      table.text('description');
      table.float('latitude');
      table.float('longitude');
      table.timestamps(true, true);
      table.unique(['code', 'pier_id']);
    })
    
    // Stand Aircraft Constraints
    .createTable('stand_aircraft_constraints', (table) => {
      table.increments('id').primary();
      table.integer('stand_id').unsigned().notNullable()
        .references('id').inTable('stands').onDelete('CASCADE');
      table.integer('aircraft_type_id').unsigned().notNullable()
        .references('id').inTable('aircraft_types').onDelete('CASCADE');
      table.boolean('is_allowed').notNullable().defaultTo(true);
      table.text('constraint_reason');
      table.timestamps(true, true);
      table.unique(['stand_id', 'aircraft_type_id']);
    })
    
    // Operational Settings
    .createTable('operational_settings', (table) => {
      table.increments('id').primary();
      table.string('key').unique().notNullable();
      table.text('value');
      table.string('data_type');
      table.text('description');
      table.timestamps(true, true);
    })
    
    // Turnaround Rules
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

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('turnaround_rules')
    .dropTableIfExists('operational_settings')
    .dropTableIfExists('stand_aircraft_constraints')
    .dropTableIfExists('stands')
    .dropTableIfExists('aircraft_types')
    .dropTableIfExists('piers')
    .dropTableIfExists('terminals');
}; 