/**
 * Migration to create allocation_configurations table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('allocation_configurations', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().comment('Name of the allocation configuration');
      table.text('description').nullable().comment('Description of the allocation configuration');
      table.json('settings').notNullable().comment('JSON object containing allocation settings');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.unique(['name']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('allocation_configurations');
}; 