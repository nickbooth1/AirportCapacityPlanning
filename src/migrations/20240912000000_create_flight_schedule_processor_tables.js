/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Flight schedules table
    .createTable('flight_schedules', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.integer('upload_id').unsigned().notNullable().references('id').inTable('flight_uploads').onDelete('CASCADE');
      table.integer('created_by').unsigned().notNullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.enum('status', ['draft', 'processing', 'validated', 'allocated', 'finalized', 'failed']).defaultTo('draft');
      table.integer('valid_flights').unsigned().defaultTo(0);
      table.integer('invalid_flights').unsigned().defaultTo(0);
      table.integer('allocated_flights').unsigned().defaultTo(0);
      table.integer('unallocated_flights').unsigned().defaultTo(0);
      table.timestamp('validated_at').nullable();
      table.timestamp('allocated_at').nullable();
      table.timestamps(true, true);
    })
    
    // Stand allocations table
    .createTable('stand_allocations', function(table) {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('flight_schedules').onDelete('CASCADE');
      table.integer('flight_id').unsigned().notNullable().references('id').inTable('flights').onDelete('CASCADE');
      table.integer('stand_id').unsigned().notNullable().references('id').inTable('stands').onDelete('CASCADE');
      table.dateTime('start_time').notNullable();
      table.dateTime('end_time').notNullable();
      table.boolean('is_manual').defaultTo(false);
      table.timestamps(true, true);
      
      // Add index for efficient querying
      table.index(['schedule_id', 'flight_id']);
      table.index(['schedule_id', 'stand_id']);
    })
    
    // Unallocated flights table
    .createTable('unallocated_flights', function(table) {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('flight_schedules').onDelete('CASCADE');
      table.integer('flight_id').unsigned().notNullable().references('id').inTable('flights').onDelete('CASCADE');
      table.string('reason').notNullable();
      table.timestamps(true, true);
      
      // Add index for efficient querying
      table.index(['schedule_id', 'flight_id']);
    })
    
    // Stand utilization metrics table
    .createTable('stand_utilization_metrics', function(table) {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('flight_schedules').onDelete('CASCADE');
      table.integer('stand_id').unsigned().notNullable().references('id').inTable('stands').onDelete('CASCADE');
      table.enum('time_period', ['hourly', 'daily', 'weekly', 'monthly']).notNullable();
      table.dateTime('period_start').notNullable();
      table.dateTime('period_end').notNullable();
      table.decimal('utilization_percentage', 5, 2).notNullable();
      table.integer('minutes_utilized').unsigned().notNullable();
      table.timestamps(true, true);
      
      // Add index for efficient querying
      table.index(['schedule_id', 'stand_id', 'time_period']);
      table.index(['period_start', 'period_end']);
    })
    
    // Allocation issues table
    .createTable('allocation_issues', function(table) {
      table.increments('id').primary();
      table.integer('schedule_id').unsigned().notNullable().references('id').inTable('flight_schedules').onDelete('CASCADE');
      table.enum('issue_type', ['over_utilization', 'under_utilization', 'conflict', 'peak_hour_congestion']).notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.string('description').notNullable();
      table.json('affected_entities').notNullable();
      table.string('recommendation').nullable();
      table.boolean('is_resolved').defaultTo(false);
      table.timestamps(true, true);
      
      // Add index for efficient querying
      table.index(['schedule_id', 'issue_type', 'severity']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('allocation_issues')
    .dropTableIfExists('stand_utilization_metrics')
    .dropTableIfExists('unallocated_flights')
    .dropTableIfExists('stand_allocations')
    .dropTableIfExists('flight_schedules');
}; 