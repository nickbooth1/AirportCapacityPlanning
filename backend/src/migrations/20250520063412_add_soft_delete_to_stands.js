/**
 * Migration to add soft delete support to stands table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('stands', table => {
    // Add deleted_at timestamp column (null indicates not deleted)
    table.timestamp('deleted_at').nullable();
    
    // Add column to track who deleted the stand
    table.string('deleted_by').nullable();
    
    // Add column for deletion reason
    table.text('deletion_reason').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('stands', table => {
    table.dropColumn('deleted_at');
    table.dropColumn('deleted_by');
    table.dropColumn('deletion_reason');
  });
};