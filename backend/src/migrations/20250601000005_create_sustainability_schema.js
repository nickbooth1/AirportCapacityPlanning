/**
 * Migration: Create Sustainability Schema
 * 
 * This migration creates tables for the Sustainability component
 * of the Autonomous Airport Platform, tracking environmental metrics,
 * resource consumption, optimization initiatives, and carbon accounting.
 */

exports.up = function(knex) {
  return knex.schema
    // Sustainability metrics table
    .createTable('sustainability_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('metric_type', 50).notNullable();
      table.string('location', 100);
      table.decimal('value', 15, 5).notNullable();
      table.string('unit', 20).notNullable();
      table.string('source', 100);
      table.decimal('comparison_to_baseline', 5, 4);
      table.string('trend', 20);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for metric queries
      table.index('metric_type', 'idx_sustainability_metrics_type');
      table.index('location', 'idx_sustainability_metrics_location');
    })
    
    // Resource consumption table
    .createTable('resource_consumption', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('resource_type', 50).notNullable();
      table.string('location', 100).notNullable();
      table.decimal('consumption_value', 15, 5).notNullable();
      table.string('unit', 20).notNullable();
      table.string('associated_activity', 100);
      table.decimal('carbon_equivalent', 15, 5);
      table.decimal('cost', 10, 2);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for consumption queries
      table.index('resource_type', 'idx_resource_consumption_type');
      table.index('location', 'idx_resource_consumption_location');
    })
    
    // Sustainability optimizations table
    .createTable('sustainability_optimizations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('optimization_type', 50).notNullable();
      table.string('target_area', 100).notNullable();
      table.string('target_resource', 50).notNullable();
      table.decimal('target_reduction', 5, 4).notNullable();
      table.string('status', 20).notNullable();
      table.jsonb('constraints');
      table.specificType('allowed_interventions', 'text[]');
      table.timestamp('start_time');
      table.timestamp('end_time');
      table.jsonb('estimated_impact');
      table.jsonb('actual_impact');
      table.string('created_by', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for optimization queries
      table.index('status', 'idx_sustainability_optimizations_status');
      table.index('optimization_type', 'idx_sustainability_optimizations_type');
      table.index('target_area', 'idx_sustainability_optimizations_area');
    })
    
    // Carbon accounting table
    .createTable('carbon_accounting', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('timestamp').notNullable();
      table.string('source_type', 50).notNullable();
      table.string('location', 100);
      table.decimal('emissions_value', 15, 5).notNullable();
      table.string('calculation_method', 100);
      table.decimal('offset_amount', 15, 5).defaultTo(0);
      table.decimal('net_emissions', 15, 5).notNullable();
      table.string('verification_status', 20);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes for emissions queries
      table.index('source_type', 'idx_carbon_accounting_source');
      table.index('location', 'idx_carbon_accounting_location');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('carbon_accounting')
    .dropTableIfExists('sustainability_optimizations')
    .dropTableIfExists('resource_consumption')
    .dropTableIfExists('sustainability_metrics');
};