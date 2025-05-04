/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Terminals table
    .createTable('terminals', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').notNullable().unique();
      table.text('description');
      table.timestamps(true, true);
    })
    
    // Piers table
    .createTable('piers', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').notNullable();
      table.integer('terminal_id').unsigned().references('id').inTable('terminals').onDelete('CASCADE');
      table.text('description');
      table.timestamps(true, true);
      
      // Composite unique constraint
      table.unique(['code', 'terminal_id']);
    })
    
    // Aircraft types table
    .createTable('aircraft_types', function(table) {
      table.increments('id').primary();
      table.string('iata_code').notNullable().unique();
      table.string('icao_code').notNullable().unique();
      table.string('name').notNullable();
      table.string('manufacturer');
      table.string('model');
      table.integer('wingspan_meters').unsigned();
      table.integer('length_meters').unsigned();
      table.string('size_category').notNullable(); // e.g., A, B, C, D, E, F
      table.timestamps(true, true);
    })
    
    // Stands table
    .createTable('stands', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').notNullable();
      table.integer('pier_id').unsigned().references('id').inTable('piers').onDelete('CASCADE');
      table.boolean('is_active').defaultTo(true);
      table.string('stand_type').notNullable(); // e.g., contact, remote
      table.boolean('has_jetbridge').defaultTo(false);
      table.integer('max_wingspan_meters').unsigned();
      table.integer('max_length_meters').unsigned();
      table.string('max_aircraft_size').notNullable(); // e.g., A, B, C, D, E, F
      table.text('description');
      table.float('latitude', 10, 6).nullable();
      table.float('longitude', 10, 6).nullable();
      table.timestamps(true, true);
      
      // Composite unique constraint
      table.unique(['code', 'pier_id']);
    })
    
    // Stand aircraft constraints table
    .createTable('stand_aircraft_constraints', function(table) {
      table.increments('id').primary();
      table.integer('stand_id').unsigned().references('id').inTable('stands').onDelete('CASCADE');
      table.integer('aircraft_type_id').unsigned().references('id').inTable('aircraft_types').onDelete('CASCADE');
      table.boolean('is_allowed').notNullable();
      table.text('constraint_reason');
      table.timestamps(true, true);
      
      // Composite unique constraint
      table.unique(['stand_id', 'aircraft_type_id']);
    })
    
    // Operational settings table
    .createTable('operational_settings', function(table) {
      table.increments('id').primary();
      table.string('key').notNullable().unique();
      table.text('value').notNullable();
      table.string('data_type').notNullable();
      table.text('description');
      table.timestamps(true, true);
    })
    
    // Turnaround rules table
    .createTable('turnaround_rules', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('aircraft_type_id').unsigned().references('id').inTable('aircraft_types').onDelete('CASCADE');
      table.string('stand_type').notNullable(); // e.g., contact, remote
      table.integer('minimum_turnaround_minutes').unsigned().notNullable();
      table.integer('optimal_turnaround_minutes').unsigned().notNullable();
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