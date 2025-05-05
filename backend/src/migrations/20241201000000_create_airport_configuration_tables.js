/**
 * Migration: Create Airport Configuration Tables
 * 
 * This migration creates tables for storing airport configuration information,
 * including base airport settings and airline-terminal allocations.
 */

exports.up = function(knex) {
  return knex.schema
    // Main airport configuration table
    .createTable('airport_configuration', function(table) {
      table.increments('id').primary();
      table.integer('base_airport_id').unsigned().nullable();
      table.foreign('base_airport_id').references('id').inTable('airports').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    
    // Airline terminal allocations table
    .createTable('airline_terminal_allocations', function(table) {
      table.increments('id').primary();
      table.integer('airline_id').unsigned().notNullable();
      table.integer('terminal_id').unsigned().notNullable();
      table.integer('gha_id').unsigned().nullable();
      
      // Foreign keys
      table.foreign('airline_id').references('id').inTable('airlines').onDelete('CASCADE');
      table.foreign('terminal_id').references('id').inTable('terminals').onDelete('CASCADE');
      table.foreign('gha_id').references('id').inTable('ground_handling_agents').onDelete('SET NULL');
      
      // Unique constraint to prevent duplicate allocations
      table.unique(['airline_id', 'terminal_id']);
      
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('airline_terminal_allocations')
    .dropTableIfExists('airport_configuration');
}; 