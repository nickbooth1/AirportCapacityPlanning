/**
 * Seed data for stands
 */
exports.seed = async function(knex) {
  // Delete all existing stands
  await knex('stands').del();
  
  // Insert seed stands
  return knex('stands').insert([
    {
      id: 1,
      name: 'A1',
      code: 'A1',
      terminal: 'T1',
      has_jetbridge: true,
      max_aircraft_size_code: 'C',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'A2',
      code: 'A2',
      terminal: 'T1',
      has_jetbridge: true,
      max_aircraft_size_code: 'C',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'B1',
      code: 'B1',
      terminal: 'T2',
      has_jetbridge: true,
      max_aircraft_size_code: 'D',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'B2',
      code: 'B2',
      terminal: 'T2',
      has_jetbridge: true,
      max_aircraft_size_code: 'D',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'C1',
      code: 'C1',
      terminal: 'T3',
      has_jetbridge: true,
      max_aircraft_size_code: 'F',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'C2',
      code: 'C2',
      terminal: 'T3',
      has_jetbridge: true,
      max_aircraft_size_code: 'F',
      is_active: true,
      is_test_data: false,
      stand_type: 'contact',
      pier_id: 3,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 