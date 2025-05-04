/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('maintenance_status_types').del();
  // Inserts seed entries
  await knex('maintenance_status_types').insert([
    {id: 1, name: 'Requested', description: 'Maintenance has been requested but not yet reviewed'},
    {id: 2, name: 'Approved', description: 'Maintenance request has been approved'},
    {id: 3, name: 'Rejected', description: 'Maintenance request has been rejected'},
    {id: 4, name: 'In Progress', description: 'Maintenance work is currently in progress'},
    {id: 5, name: 'Completed', description: 'Maintenance work has been completed'},
    {id: 6, name: 'Cancelled', description: 'Maintenance request has been cancelled'}
  ]);
}; 