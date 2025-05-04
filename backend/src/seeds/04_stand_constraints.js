/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing constraints
  await knex('stand_aircraft_constraints').del();
  
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
  
  // Insert stand constraints
  if (a380 && b777 && a320) {
    await knex('stand_aircraft_constraints').insert([
      {
        stand_id: 1,
        aircraft_type_id: a380.id,
        is_allowed: true,
        constraint_reason: 'Stand designed for A380'
      },
      {
        stand_id: 2,
        aircraft_type_id: b777.id,
        is_allowed: true,
        constraint_reason: 'Stand designed for 777'
      },
      {
        stand_id: 3,
        aircraft_type_id: a320.id,
        is_allowed: true,
        constraint_reason: 'Stand designed for A320'
      }
    ]);
  }
  
  // Get more aircraft types for additional constraints
  const b787 = await knex('aircraft_types')
    .where({ icao_code: 'B789' })
    .first();
    
  const a350 = await knex('aircraft_types')
    .where({ icao_code: 'A359' })
    .first();
    
  const b737 = await knex('aircraft_types')
    .where({ icao_code: 'B738' })
    .first();
    
  // Add more constraints if aircraft types exist
  if (b787 && a350 && b737) {
    await knex('stand_aircraft_constraints').insert([
      {
        stand_id: 1,
        aircraft_type_id: b787.id,
        is_allowed: true,
        constraint_reason: 'Stand suitable for B787'
      },
      {
        stand_id: 1,
        aircraft_type_id: a350.id,
        is_allowed: true,
        constraint_reason: 'Stand suitable for A350'
      },
      {
        stand_id: 2,
        aircraft_type_id: b787.id,
        is_allowed: true,
        constraint_reason: 'Stand suitable for B787'
      },
      {
        stand_id: 2,
        aircraft_type_id: a350.id,
        is_allowed: true,
        constraint_reason: 'Stand suitable for A350'
      },
      {
        stand_id: 3,
        aircraft_type_id: b737.id,
        is_allowed: true,
        constraint_reason: 'Stand suitable for B737'
      }
    ]);
  }
}; 