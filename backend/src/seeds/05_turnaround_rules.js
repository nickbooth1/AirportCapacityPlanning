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
      aircraft_type_id: a380.id,
      min_turnaround_minutes: 90,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (b777) {
    rules.push({
      aircraft_type_id: b777.id,
      min_turnaround_minutes: 60,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (a320) {
    rules.push({
      aircraft_type_id: a320.id,
      min_turnaround_minutes: 30,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (b737) {
    rules.push({
      aircraft_type_id: b737.id,
      min_turnaround_minutes: 30,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (a350) {
    rules.push({
      aircraft_type_id: a350.id,
      min_turnaround_minutes: 60,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (b787) {
    rules.push({
      aircraft_type_id: b787.id,
      min_turnaround_minutes: 60,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (e190) {
    rules.push({
      aircraft_type_id: e190.id,
      min_turnaround_minutes: 25,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  if (rules.length > 0) {
    await knex('turnaround_rules').insert(rules);
  }
}; 