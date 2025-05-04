/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('recurring_maintenance_schedules', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('stand_id').notNullable().references('id').inTable('stands').onDelete('CASCADE');
    table.string('title', 100).notNullable();
    table.text('description').notNullable();
    table.string('requestor_name', 100).notNullable();
    table.string('requestor_email', 255).notNullable();
    table.string('requestor_department', 100).notNullable();
    table.string('recurrence_pattern', 50).notNullable(); // daily, weekly, monthly, yearly
    table.integer('day_of_week').nullable(); // 0-6
    table.integer('day_of_month').nullable(); // 1-31
    table.integer('month_of_year').nullable(); // 1-12
    table.time('start_time').notNullable(); // HH:MM:SS
    table.integer('duration_hours').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('status_id').notNullable().references('id').inTable('maintenance_status_types').onDelete('SET NULL');
    table.string('priority', 20).notNullable().defaultTo('Medium');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add indexes
    table.index('stand_id');
    table.index('recurrence_pattern');
    table.index('start_date');
    table.index('end_date');
    table.index('is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('recurring_maintenance_schedules');
}; 