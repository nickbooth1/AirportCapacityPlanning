/**
 * Seed initial stand adjacency rules
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // First get all stand IDs to ensure we use valid references
  const stands = await knex('stands').select('id').limit(10);
  
  // Only proceed if we have at least 2 stands
  if (stands.length < 2) {
    console.log('Not enough stands to create adjacency rules');
    return;
  }
  
  // Clear existing stand adjacencies
  await knex('stand_adjacencies').del();
  
  // Create a set of sample adjacency rules
  const adjacencyRules = [];
  
  // For each stand, create an adjacency rule with the next stand
  for (let i = 0; i < stands.length - 1; i++) {
    adjacencyRules.push({
      stand_id: stands[i].id,
      adjacent_stand_id: stands[i + 1].id,
      impact_direction: 'BOTH',
      restriction_type: 'MAX_AIRCRAFT_SIZE_REDUCED_TO',
      max_aircraft_size_code: 'D',
      notes: 'When large aircraft occupies the primary stand, adjacent stand is limited to Code D or smaller',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Create a reverse relationship
    adjacencyRules.push({
      stand_id: stands[i + 1].id,
      adjacent_stand_id: stands[i].id,
      impact_direction: 'BOTH',
      restriction_type: 'MAX_AIRCRAFT_SIZE_REDUCED_TO',
      max_aircraft_size_code: 'D',
      notes: 'When large aircraft occupies the primary stand, adjacent stand is limited to Code D or smaller',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Add some more complex rules if we have enough stands
  if (stands.length >= 3) {
    adjacencyRules.push({
      stand_id: stands[0].id,
      adjacent_stand_id: stands[2].id,
      impact_direction: 'TO_ADJACENT',
      restriction_type: 'AIRCRAFT_TYPE_PROHIBITED_ON_AFFECTED_STAND',
      max_aircraft_size_code: 'F',
      notes: 'Code F aircraft cannot use affected stand when primary has any aircraft',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Insert the adjacency rules
  return knex('stand_adjacencies').insert(adjacencyRules);
}; 