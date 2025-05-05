/**
 * Migration: Create Ground Handling Agents Table
 * 
 * This migration creates the table for storing ground handling agent information
 * and their relationships with airports.
 */

exports.up = function(knex) {
  return knex.schema
    // Main GHA table
    .createTable('ground_handling_agents', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable().index();
      table.string('code', 10).nullable().index().comment('Internal reference code if applicable');
      table.string('abbreviation', 10).nullable().comment('Common abbreviation used in the industry');
      table.string('headquarters').nullable();
      table.string('country', 2).nullable().comment('Country of registration (ISO 2-letter code)');
      table.string('country_name').nullable();
      table.integer('founded').nullable().comment('Year the company was established');
      table.string('website').nullable();
      table.string('parent_company').nullable();
      table.json('subsidiaries').nullable();
      table.json('service_types').nullable().comment('Array of service types provided');
      table.json('operates_at').nullable().comment('Array of airport codes where the GHA operates');
      table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
      table.string('data_source').nullable().comment('Origin of the data record');
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    
    // Junction table for GHA-Airport many-to-many relationship
    .createTable('gha_airport', function(table) {
      table.increments('id').primary();
      table.integer('gha_id').unsigned().notNullable();
      table.integer('airport_id').unsigned().notNullable();
      table.json('services_provided').nullable().comment('Specific services provided at this airport');
      table.string('contract_type').nullable();
      table.boolean('is_primary_handler').nullable();
      table.timestamps(true, true);
      
      // Foreign keys
      table.foreign('gha_id').references('id').inTable('ground_handling_agents').onDelete('CASCADE');
      table.foreign('airport_id').references('id').inTable('airports').onDelete('CASCADE');
      
      // Unique constraint to prevent duplicate relationships
      table.unique(['gha_id', 'airport_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('gha_airport')
    .dropTableIfExists('ground_handling_agents');
}; 