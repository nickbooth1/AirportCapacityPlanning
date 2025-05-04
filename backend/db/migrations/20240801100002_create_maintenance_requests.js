/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('maintenance_requests', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('stand_id').notNullable().references('id').inTable('stands').onDelete('CASCADE'); // Add onDelete for FK
    table.string('title', 100).notNullable();
    table.text('description').notNullable();
    table.string('requestor_name', 100).notNullable();
    table.string('requestor_email', 255).notNullable();
    table.string('requestor_department', 100).notNullable();
    table.timestamp('start_datetime').notNullable();
    table.timestamp('end_datetime').notNullable();
    table.integer('status_id').notNullable().references('id').inTable('maintenance_status_types').onDelete('SET NULL'); // Keep request if status type deleted?
    table.string('priority', 20).notNullable().defaultTo('Medium');
    table.text('impact_description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add indexes
    table.index('stand_id');
    table.index('status_id');
    table.index('start_datetime');
    table.index('end_datetime');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('maintenance_requests');
}; 