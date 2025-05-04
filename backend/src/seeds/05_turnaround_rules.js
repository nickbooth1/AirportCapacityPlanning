/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing turnaround rules
  await knex('turnaround_rules').del();
  
  // Get aircraft types
  const a380 = await knex('aircraft_types')
    .where({ icao_code: 'A388' })
    .first();
    
  const b777 = await knex('aircraft_types')
    .where({ icao_code: 'B77W' })
    .first();
    
  const a320 = await knex('aircraft_types')
    .where({ icao_code: 'A320' })
    .first();
    
  const b737 = await knex('aircraft_types')
    .where({ icao_code: 'B738' })
    .first();
    
  const a350 = await knex('aircraft_types')
    .where({ icao_code: 'A359' })
    .first();
    
  const b787 = await knex('aircraft_types')
    .where({ icao_code: 'B789' })
    .first();
    
  const e190 = await knex('aircraft_types')
    .where({ icao_code: 'E190' })
    .first();
  
  // Insert turnaround rules
  const rules = [];
  
  if (a380) {
    rules.push({
      name: 'A380 Rule',
      aircraft_type_id: a380.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 90,
      optimal_turnaround_minutes: 120,
      description: 'Turnaround rules for A380'
    });
  }
  
  if (b777) {
    rules.push({
      name: '777 Rule',
      aircraft_type_id: b777.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 60,
      optimal_turnaround_minutes: 90,
      description: 'Turnaround rules for 777'
    });
  }
  
  if (a320) {
    rules.push({
      name: 'A320 Rule',
      aircraft_type_id: a320.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 30,
      optimal_turnaround_minutes: 45,
      description: 'Turnaround rules for A320'
    });
  }
  
  if (b737) {
    rules.push({
      name: 'B737 Rule',
      aircraft_type_id: b737.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 30,
      optimal_turnaround_minutes: 45,
      description: 'Turnaround rules for B737'
    });
  }
  
  if (a350) {
    rules.push({
      name: 'A350 Rule',
      aircraft_type_id: a350.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 60,
      optimal_turnaround_minutes: 75,
      description: 'Turnaround rules for A350'
    });
  }
  
  if (b787) {
    rules.push({
      name: 'B787 Rule',
      aircraft_type_id: b787.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 60,
      optimal_turnaround_minutes: 75,
      description: 'Turnaround rules for B787'
    });
  }
  
  if (e190) {
    rules.push({
      name: 'E190 Rule',
      aircraft_type_id: e190.id,
      stand_type: 'contact',
      minimum_turnaround_minutes: 25,
      optimal_turnaround_minutes: 40,
      description: 'Turnaround rules for E190'
    });
  }
  
  if (rules.length > 0) {
    await knex('turnaround_rules').insert(rules);
  }
}; 