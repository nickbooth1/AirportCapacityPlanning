/**
 * Migration to create allocation_issues table for tracking problems with allocations
 */
exports.up = function(knex) {
  return knex.schema.createTable('allocation_issues', (table) => {
    table.increments('id').primary();
    table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules').onDelete('CASCADE');
    table.string('issue_type').notNullable();
    table.string('severity').notNullable(); // high, medium, low
    table.text('description').notNullable();
    table.json('affected_entities').notNullable();
    table.text('recommendation');
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Migration to drop the allocation_issues table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('allocation_issues');
}; 