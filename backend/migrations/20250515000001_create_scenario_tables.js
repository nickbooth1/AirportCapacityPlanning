/**
 * Migration to create scenario management tables for AirportAI Phase 2
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Scenarios Table
    .createTable('scenarios', table => {
      table.uuid('id').primary();
      table.string('userId').notNullable();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.uuid('baselineId').references('id').inTable('scenarios').nullable();
      table.string('type').defaultTo('manual');
      table.string('status').defaultTo('created');
      table.jsonb('parameters').defaultTo('{}');
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('modifiedAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('lastCalculatedAt').nullable();
      table.jsonb('metadata').defaultTo('{}');
      table.jsonb('tags').defaultTo('[]');
      table.boolean('isTemplate').defaultTo(false);
      table.boolean('isPublic').defaultTo(false);
      table.index('userId');
      table.index('baselineId');
      table.index('type');
      table.index('status');
      table.index('isTemplate');
    })
    
    // Scenario Versions Table - For tracking history of modifications
    .createTable('scenario_versions', table => {
      table.uuid('id').primary();
      table.uuid('scenarioId').references('id').inTable('scenarios').onDelete('CASCADE');
      table.integer('versionNumber').notNullable();
      table.jsonb('parameters').defaultTo('{}');
      table.text('description').notNullable();
      table.string('modifiedBy').notNullable();
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.jsonb('metadata').defaultTo('{}');
      table.index('scenarioId');
      table.index('versionNumber');
    })
    
    // Scenario Calculations Table - For tracking calculation results
    .createTable('scenario_calculations', table => {
      table.uuid('id').primary();
      table.uuid('scenarioId').references('id').inTable('scenarios').onDelete('CASCADE');
      table.string('status').defaultTo('pending');
      table.timestamp('startedAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completedAt').nullable();
      table.string('calculationType').notNullable().defaultTo('standard');
      table.jsonb('options').defaultTo('{}');
      table.jsonb('results').defaultTo('{}');
      table.text('errorMessage').nullable();
      table.index('scenarioId');
      table.index('status');
      table.index('calculationType');
    })
    
    // Scenario Comparisons Table - For tracking comparison results
    .createTable('scenario_comparisons', table => {
      table.uuid('id').primary();
      table.jsonb('scenarioIds').notNullable();  // Array of scenario IDs being compared
      table.string('userId').notNullable();
      table.string('title').nullable();
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.jsonb('metrics').defaultTo('[]');
      table.jsonb('timeRange').defaultTo('{}');
      table.jsonb('results').defaultTo('{}');
      table.string('status').defaultTo('pending');
      table.timestamp('completedAt').nullable();
      table.text('errorMessage').nullable();
      table.index('userId');
      table.index('status');
    })
    
    // Scenario Templates Table - For predefined scenario templates
    .createTable('scenario_templates', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description').notNullable();
      table.string('category').notNullable();
      table.jsonb('defaultParameters').defaultTo('{}');
      table.jsonb('parameterSchema').defaultTo('{}');  // JSON Schema for parameters
      table.jsonb('requiredParameters').defaultTo('[]');
      table.jsonb('visualizationOptions').defaultTo('[]');
      table.boolean('isSystem').defaultTo(false);  // System-provided vs user-created
      table.string('createdBy').notNullable();
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
      table.timestamp('modifiedAt').notNullable().defaultTo(knex.fn.now());
      table.index('category');
      table.index('isSystem');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('scenario_templates')
    .dropTableIfExists('scenario_comparisons')
    .dropTableIfExists('scenario_calculations')
    .dropTableIfExists('scenario_versions')
    .dropTableIfExists('scenarios');
};