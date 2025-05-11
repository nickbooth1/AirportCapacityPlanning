/**
 * Migration to add visualization columns to the capacity_results table
 */
exports.up = function(knex) {
  return knex.schema.table('capacity_results', function(table) {
    table.jsonb('visualization').nullable();
    table.jsonb('body_type_visualization').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('capacity_results', function(table) {
    table.dropColumn('visualization');
    table.dropColumn('body_type_visualization');
  });
}; 