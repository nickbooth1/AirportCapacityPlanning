/**
 * Migration to create a users table
 */

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('username').notNullable().unique();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('role').defaultTo('user');
    table.string('firstName');
    table.string('lastName');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};