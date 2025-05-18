/**
 * Migration to create tables for external data integration
 */

exports.up = function(knex) {
  return Promise.all([
    // Weather cache table
    knex.schema.createTable('weather_cache', table => {
      table.string('airport_code').notNullable();
      table.date('forecast_date').notNullable();
      table.jsonb('data').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['airport_code', 'forecast_date']);
    }),
    
    // Airline schedules cache table
    knex.schema.createTable('airline_schedules_cache', table => {
      table.string('airline_code').notNullable();
      table.date('schedule_date').notNullable();
      table.jsonb('data').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['airline_code', 'schedule_date']);
    }),
    
    // Market forecasts cache table
    knex.schema.createTable('market_forecasts_cache', table => {
      table.string('time_horizon').notNullable();
      table.string('region').defaultTo('global');
      table.string('segment').defaultTo('all');
      table.jsonb('data').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['time_horizon', 'region', 'segment']);
    }),
    
    // Events cache table
    knex.schema.createTable('events_cache', table => {
      table.string('airport_code').notNullable();
      table.date('event_date').notNullable();
      table.string('category').defaultTo('all');
      table.jsonb('data').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.primary(['airport_code', 'event_date', 'category']);
    }),
    
    // Airport coordinates table
    knex.schema.createTable('airport_coordinates', table => {
      table.string('airport_code').primary();
      table.float('latitude').notNullable();
      table.float('longitude').notNullable();
      table.string('city');
      table.string('country');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }),
    
    // External data refresh history table
    knex.schema.createTable('external_data_refresh_history', table => {
      table.increments('id').primary();
      table.timestamp('refresh_time').defaultTo(knex.fn.now());
      table.string('data_type').notNullable();
      table.boolean('success').defaultTo(true);
      table.text('error_message');
      table.integer('items_refreshed');
      table.string('initiated_by');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('external_data_refresh_history'),
    knex.schema.dropTableIfExists('airport_coordinates'),
    knex.schema.dropTableIfExists('events_cache'),
    knex.schema.dropTableIfExists('market_forecasts_cache'),
    knex.schema.dropTableIfExists('airline_schedules_cache'),
    knex.schema.dropTableIfExists('weather_cache')
  ]);
};