/**
 * Migration to create stand_adjacencies table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .hasTable('stand_adjacencies')
    .then(exists => {
      if (!exists) {
        return knex.schema.createTable('stand_adjacencies', (table) => {
          table.increments('id').primary();
          table.integer('stand_id').notNullable().references('id').inTable('stands');
          table.integer('adjacent_stand_id').notNullable().references('id').inTable('stands');
          table.string('impact_direction').comment('Direction of impact (e.g., BOTH, LEFT, RIGHT, FRONT, BEHIND)');
          table.string('restriction_type').comment('Type of restriction (e.g., no_use, size_limited, aircraft_type_limited)');
          table.string('max_aircraft_size_code').comment('Maximum aircraft size code when restricted');
          table.text('notes').nullable();
          table.boolean('is_active').defaultTo(true);
          table.timestamps(true, true);
          
          // Create an index for better performance
          table.index(['stand_id', 'adjacent_stand_id']);
        });
      }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('stand_adjacencies');
}; 