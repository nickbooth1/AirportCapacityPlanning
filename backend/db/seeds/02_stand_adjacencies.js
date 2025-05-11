/**
 * Seed file to create test stand adjacency data
 */
exports.seed = async function(knex) {
  console.log('Seeding stand adjacency data...');
  
  // First get some stand IDs to work with
  const stands = await knex('stands').select('id', 'code').limit(5);
  
  if (stands.length < 2) {
    console.log('Not enough stands found to create adjacency rules. Skipping.');
    return;
  }
  
  // Delete existing entries
  await knex('stand_adjacencies').del();
  
  // Create adjacency data
  const adjacencyData = [
    {
      stand_id: stands[0].id,
      adjacent_stand_id: stands[1].id,
      impact_direction: 'BOTH',
      restriction_type: 'no_use',
      is_active: true,
      notes: 'When stand ' + stands[0].code + ' is in use, ' + stands[1].code + ' cannot be used at all'
    },
    {
      stand_id: stands[2].id,
      adjacent_stand_id: stands[3].id,
      impact_direction: 'BOTH',
      restriction_type: 'size_limited',
      max_aircraft_size_code: 'C',
      is_active: true,
      notes: 'When stand ' + stands[2].code + ' is in use, ' + stands[3].code + ' is limited to aircraft of size C or smaller'
    }
  ];
  
  // Insert data
  await knex('stand_adjacencies').insert(adjacencyData);
  
  console.log('Stand adjacency data seeded successfully!');
}; 