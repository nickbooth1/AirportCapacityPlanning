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
  await knex('aircraft_types').del();
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
  
  // Aircraft types
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
      size_category: 'F'
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
      size_category: 'E'
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
      size_category: 'C'
    }
  ]);
  
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
      max_length_meters: 80,
      max_aircraft_size: 'F',
      description: 'A380 capable stand',
      latitude: 51.4700,
      longitude: -0.4543
    },
    {
      id: 2,
      name: 'Stand A2',
      code: 'A2',
      pier_id: 1,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 70,
      max_length_meters: 75,
      max_aircraft_size: 'E',
      description: 'Wide-body stand',
      latitude: 51.4701,
      longitude: -0.4545
    },
    {
      id: 3,
      name: 'Stand B1',
      code: 'B1',
      pier_id: 2,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 40,
      max_length_meters: 45,
      max_aircraft_size: 'C',
      description: 'Narrow-body stand',
      latitude: 51.4705,
      longitude: -0.4550
    },
    {
      id: 4,
      name: 'Stand C1',
      code: 'C1',
      pier_id: 3,
      is_active: true,
      stand_type: 'contact',
      has_jetbridge: true,
      max_wingspan_meters: 40,
      max_length_meters: 45,
      max_aircraft_size: 'C',
      description: 'Domestic narrow-body stand',
      latitude: 51.4710,
      longitude: -0.4560
    }
  ]);
  
  // Stand aircraft constraints
  await knex('stand_aircraft_constraints').insert([
    {
      stand_id: 1,
      aircraft_type_id: 1,
      is_allowed: true,
      constraint_reason: null
    },
    {
      stand_id: 1,
      aircraft_type_id: 2,
      is_allowed: true,
      constraint_reason: null
    },
    {
      stand_id: 1,
      aircraft_type_id: 3,
      is_allowed: true,
      constraint_reason: null
    },
    {
      stand_id: 2,
      aircraft_type_id: 1,
      is_allowed: false,
      constraint_reason: 'Wingspan too large'
    },
    {
      stand_id: 2,
      aircraft_type_id: 2,
      is_allowed: true,
      constraint_reason: null
    },
    {
      stand_id: 3,
      aircraft_type_id: 3,
      is_allowed: true,
      constraint_reason: null
    }
  ]);
  
  // Operational settings
  await knex('operational_settings').insert([
    {
      key: 'DEFAULT_BUFFER_MINUTES',
      value: '15',
      data_type: 'integer',
      description: 'Default buffer time in minutes between aircraft'
    },
    {
      key: 'WORKING_HOURS_START',
      value: '06:00',
      data_type: 'string',
      description: 'Airport operational hours start time'
    },
    {
      key: 'WORKING_HOURS_END',
      value: '23:00',
      data_type: 'string',
      description: 'Airport operational hours end time'
    }
  ]);
  
  // Turnaround rules
  await knex('turnaround_rules').insert([
    {
      name: 'A380 Turnaround',
      aircraft_type_id: 1,
      stand_type: 'contact',
      minimum_turnaround_minutes: 90,
      optimal_turnaround_minutes: 120,
      description: 'Turnaround time for A380 at contact stand'
    },
    {
      name: 'B777 Turnaround',
      aircraft_type_id: 2,
      stand_type: 'contact',
      minimum_turnaround_minutes: 60,
      optimal_turnaround_minutes: 90,
      description: 'Turnaround time for B777 at contact stand'
    },
    {
      name: 'A320 Turnaround',
      aircraft_type_id: 3,
      stand_type: 'contact',
      minimum_turnaround_minutes: 35,
      optimal_turnaround_minutes: 45,
      description: 'Turnaround time for A320 at contact stand'
    }
  ]);
}; 