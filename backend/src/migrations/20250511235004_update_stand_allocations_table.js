/**
 * Migration to update stand_allocations table with additional fields
 */
exports.up = function(knex) {
  return knex.schema.table('stand_allocations', (table) => {
    // Add missing columns to match how the table is used in FlightProcessorService
    table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules');
    
    // Add new time columns
    table.timestamp('start_time');
    table.timestamp('end_time');
    
    // Add manual flag
    table.boolean('is_manual').defaultTo(false);
    
    // Create combined index
    table.index(['schedule_id', 'stand_id', 'flight_id']);
  });
};

/**
 * Migration to revert changes to stand_allocations table
 */
exports.down = function(knex) {
  return knex.schema.table('stand_allocations', (table) => {
    table.dropIndex(['schedule_id', 'stand_id', 'flight_id']);
    table.dropColumn('is_manual');
    table.dropColumn('end_time');
    table.dropColumn('start_time');
    table.dropColumn('schedule_id');
  });
}; 