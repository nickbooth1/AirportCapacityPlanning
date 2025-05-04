/**
 * Migration to create stand_adjacencies table
 */
exports.up = function(knex) {
  return knex.schema.createTable('stand_adjacencies', function(table) {
    table.increments('id').primary();
    table.integer('stand_id').unsigned().notNullable();
    table.integer('adjacent_stand_id').unsigned().notNullable();
    table.enum('impact_direction', ['left', 'right', 'behind', 'front', 'other']).notNullable();
    table.enum('restriction_type', ['no_use', 'size_limited', 'aircraft_type_limited', 'operational_limit', 'other']).notNullable();
    table.string('max_aircraft_size_code').nullable();
    table.text('restriction_details').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Foreign keys
    table.foreign('stand_id').references('stands.id').onDelete('CASCADE');
    table.foreign('adjacent_stand_id').references('stands.id').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate adjacency records
    table.unique(['stand_id', 'adjacent_stand_id', 'impact_direction']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('stand_adjacencies');
}; 