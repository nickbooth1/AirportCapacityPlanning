/**
 * Create airports table
 */
exports.up = function(knex) {
  return knex.schema.createTable('airports', table => {
    // Primary Key
    table.increments('id').primary();
    
    // Core airport data
    table.string('name').notNullable();
    table.string('iata_code', 3).unique().index();
    table.string('icao_code', 4).notNullable().unique().index();
    table.string('city');
    table.string('country', 2).notNullable().index();
    table.string('country_name');
    
    // Geolocation data
    table.decimal('latitude', 10, 7).notNullable();
    table.decimal('longitude', 10, 7).notNullable();
    table.integer('elevation_ft');
    table.string('timezone');
    table.string('dst', 1);
    
    // Classification
    table.enum('type', [
      'large_airport', 
      'medium_airport', 
      'small_airport', 
      'heliport', 
      'seaplane_base', 
      'closed'
    ]).notNullable().defaultTo('small_airport').index();
    
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active').index();
    
    // Additional information
    table.string('website');
    table.string('wikipedia_link');
    table.integer('runway_count');
    table.integer('longest_runway_ft');
    table.boolean('has_international_service');
    table.bigInteger('passenger_volume_annual');
    table.string('municipality');
    table.boolean('scheduled_service');
    
    // Metadata
    table.string('data_source');
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    
    // Create indexes
    table.index(['latitude', 'longitude']);
    table.index('name');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('airports');
}; 