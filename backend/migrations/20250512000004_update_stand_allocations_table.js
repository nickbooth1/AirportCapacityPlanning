/**
 * Migration to update stand_allocations table with additional fields
 */
exports.up = function(knex) {
  return knex.schema.hasTable('stand_allocations').then(function(exists) {
    if (exists) {
      return knex.schema.table('stand_allocations', (table) => {
        // Check if schedule_id column exists before adding
        return knex.schema.hasColumn('stand_allocations', 'schedule_id').then(function(hasColumn) {
          if (!hasColumn) {
            // Add missing columns to match how the table is used in FlightProcessorService
            table.integer('schedule_id').unsigned().references('id').inTable('flight_schedules');
          }
          
          // Check if start_time column exists before adding
          return knex.schema.hasColumn('stand_allocations', 'start_time').then(function(hasStartTime) {
            if (!hasStartTime) {
              // Add new time columns
              table.timestamp('start_time');
            }
            
            // Check if end_time column exists before adding
            return knex.schema.hasColumn('stand_allocations', 'end_time').then(function(hasEndTime) {
              if (!hasEndTime) {
                table.timestamp('end_time');
              }
              
              // Check if is_manual column exists before adding
              return knex.schema.hasColumn('stand_allocations', 'is_manual').then(function(hasIsManual) {
                if (!hasIsManual) {
                  // Add manual flag
                  table.boolean('is_manual').defaultTo(false);
                }
                
                // Create combined index
                // Indexes are idempotent in PostgreSQL so we don't need to check if they exist
                table.index(['schedule_id', 'stand_id', 'flight_id'], 'stand_allocations_schedule_stand_flight_idx');
              });
            });
          });
        });
      });
    }
  });
};

/**
 * Migration to revert changes to stand_allocations table
 */
exports.down = function(knex) {
  return knex.schema.hasTable('stand_allocations').then(function(exists) {
    if (exists) {
      return knex.schema.table('stand_allocations', (table) => {
        // Drop index if it exists
        return knex.schema
          .raw('DROP INDEX IF EXISTS stand_allocations_schedule_stand_flight_idx')
          .then(function() {
            // Drop columns if they exist
            return knex.schema.hasColumn('stand_allocations', 'is_manual').then(function(hasIsManual) {
              if (hasIsManual) {
                table.dropColumn('is_manual');
              }
              
              return knex.schema.hasColumn('stand_allocations', 'end_time').then(function(hasEndTime) {
                if (hasEndTime) {
                  table.dropColumn('end_time');
                }
                
                return knex.schema.hasColumn('stand_allocations', 'start_time').then(function(hasStartTime) {
                  if (hasStartTime) {
                    table.dropColumn('start_time');
                  }
                  
                  return knex.schema.hasColumn('stand_allocations', 'schedule_id').then(function(hasScheduleId) {
                    if (hasScheduleId) {
                      table.dropColumn('schedule_id');
                    }
                  });
                });
              });
            });
          });
      });
    }
  });
}; 