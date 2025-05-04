/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Aircraft Size Categories
    .createTable('aircraft_size_categories', (table) => {
      table.increments('id').primary();
      table.string('code').unique().notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.integer('wingspan_min_meters');
      table.integer('wingspan_max_meters');
      table.integer('length_min_meters');
      table.integer('length_max_meters');
      table.timestamps(true, true);
    })
    // Add a foreign key to aircraft_types
    .alterTable('aircraft_types', (table) => {
      // Rename size_category to size_category_code for clarity
      table.renameColumn('size_category', 'size_category_code');
    })
    // Add a foreign key to stands
    .alterTable('stands', (table) => {
      // Rename max_aircraft_size to max_aircraft_size_code for clarity
      table.renameColumn('max_aircraft_size', 'max_aircraft_size_code');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    // Undo the rename in stands
    .alterTable('stands', (table) => {
      table.renameColumn('max_aircraft_size_code', 'max_aircraft_size');
    })
    // Undo the rename in aircraft_types
    .alterTable('aircraft_types', (table) => {
      table.renameColumn('size_category_code', 'size_category');
    })
    // Drop the size categories table
    .dropTableIfExists('aircraft_size_categories');
}; 