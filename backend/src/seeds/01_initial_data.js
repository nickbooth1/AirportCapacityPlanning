/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('turnaround_rules').del();
  await knex('operational_settings').del();
  await knex('stand_aircraft_constraints').del();
  await knex('stands').del();
  // Aircraft types will be seeded by 03_aircraft_types.js
  // await knex('aircraft_types').del();
  await knex('piers').del();
  await knex('terminals').del();
  
  // Terminals
  await knex('terminals').insert([
    { 
      id: 1,
      name: 'Terminal 1', 
      code: 'T1', 
      description: 'Main international terminal'
    },
    { 
      id: 2,
      name: 'Terminal 2', 
      code: 'T2', 
      description: 'Domestic flights terminal'
    }
  ]);
  
  // Piers
  await knex('piers').insert([
    { 
      id: 1,
      name: 'Pier A', 
      code: 'A', 
      terminal_id: 1, 
      description: 'International wide-body pier'
    },
    { 
      id: 2,
      name: 'Pier B', 
      code: 'B', 
      terminal_id: 1, 
      description: 'International narrow-body pier'
    },
    { 
      id: 3,
      name: 'Pier C', 
      code: 'C', 
      terminal_id: 2, 
      description: 'Domestic operations pier'
    }
  ]);
  
  // Aircraft types - Commented out as they are now seeded by 03_aircraft_types.js
  /*
  await knex('aircraft_types').insert([
    {
      id: 1,
      iata_code: '388',
      icao_code: 'A388',
      name: 'Airbus A380-800',
      manufacturer: 'Airbus',
      model: 'A380-800',
      wingspan_meters: 80,
      length_meters: 73,
      size_category_code: 'F'
    },
    {
      id: 2,
      iata_code: '77W',
      icao_code: 'B77W',
      name: 'Boeing 777-300ER',
      manufacturer: 'Boeing',
      model: '777-300ER',
      wingspan_meters: 65,
      length_meters: 74,
      size_category_code: 'E'
    },
    {
      id: 3,
      iata_code: '320',
      icao_code: 'A320',
      name: 'Airbus A320',
      manufacturer: 'Airbus',
      model: 'A320',
      wingspan_meters: 36,
      length_meters: 37,
      size_category_code: 'C'
    }
  ]);
  */

  // Stands
  await knex('stands').insert([
    {
      id: 1,
      name: 'Stand A1',
      code: 'A1',
      pier_id: 1,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 80,
      max_length_meters: 75,
      max_aircraft_size_code: 'F',
      description: 'A380 capable stand',
      latitude: 51.4700,
      longitude: -0.4543
    },
    {
      id: 2,
      name: 'Stand B1',
      code: 'B1',
      pier_id: 2,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 65,
      max_length_meters: 75,
      max_aircraft_size_code: 'E',
      description: 'Wide-body stand',
      latitude: 51.4710,
      longitude: -0.4553
    },
    {
      id: 3,
      name: 'Stand C1',
      code: 'C1',
      pier_id: 3,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 36,
      max_length_meters: 40,
      max_aircraft_size_code: 'C',
      description: 'Narrow-body stand',
      latitude: 51.4720,
      longitude: -0.4563
    }
  ]);
  
  // Stand aircraft constraints - Commented out as they are now seeded by 04_stand_constraints.js
  /*
  await knex('stand_aircraft_constraints').insert([
    {
      id: 1,
      stand_id: 1,
      aircraft_type_id: 1,
      is_allowed: true,
      constraint_reason: 'Stand designed for A380'
    },
    {
      id: 2,
      stand_id: 2,
      aircraft_type_id: 2,
      is_allowed: true,
      constraint_reason: 'Stand designed for 777'
    },
    {
      id: 3,
      stand_id: 3,
      aircraft_type_id: 3,
      is_allowed: true,
      constraint_reason: 'Stand designed for A320'
    }
  ]);
  */
  
  // Operational settings
  await knex('operational_settings').insert([
    {
      id: 1,
      key: 'min_connection_time',
      value: '45',
      data_type: 'integer',
      description: 'Minimum connection time in minutes'
    },
    {
      id: 2,
      key: 'working_hours_start',
      value: '06:00',
      data_type: 'string',
      description: 'Airport operational hours start time'
    },
    {
      id: 3,
      key: 'working_hours_end',
      value: '23:00',
      data_type: 'string',
      description: 'Airport operational hours end time'
    }
  ]);
  
  // Turnaround rules - Commented out as they now depend on aircraft_types
  /*
  await knex('turnaround_rules').insert([
    {
      id: 1,
      name: 'A380 Rule',
      aircraft_type_id: 1,
      stand_type: 'contact',
      minimum_turnaround_minutes: 90,
      optimal_turnaround_minutes: 120,
      description: 'Turnaround rules for A380'
    },
    {
      id: 2,
      name: '777 Rule',
      aircraft_type_id: 2,
      stand_type: 'contact',
      minimum_turnaround_minutes: 60,
      optimal_turnaround_minutes: 90,
      description: 'Turnaround rules for 777'
    },
    {
      id: 3,
      name: 'A320 Rule',
      aircraft_type_id: 3,
      stand_type: 'contact',
      minimum_turnaround_minutes: 30,
      optimal_turnaround_minutes: 45,
      description: 'Turnaround rules for A320'
    }
  ]);
  */
}; 