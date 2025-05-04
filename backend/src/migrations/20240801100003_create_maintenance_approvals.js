/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('maintenance_approvals', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('maintenance_request_id').notNullable().references('id').inTable('maintenance_requests').onDelete('CASCADE'); // Delete approval if request is deleted
    table.string('approver_name', 100).notNullable();
    table.string('approver_email', 255).notNullable();
    table.string('approver_department', 100).notNullable();
    table.boolean('is_approved').notNullable();
    table.timestamp('approval_datetime').notNullable().defaultTo(knex.fn.now());
    table.text('comments').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add index
    table.index('maintenance_request_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('maintenance_approvals');
}; 