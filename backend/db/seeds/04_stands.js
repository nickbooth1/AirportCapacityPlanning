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
      terminal: 'T1',
      is_contact_stand: true,
      size_limit: 'C',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'A2',
      terminal: 'T1',
      is_contact_stand: true,
      size_limit: 'C',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'B1',
      terminal: 'T2',
      is_contact_stand: true,
      size_limit: 'D',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'B2',
      terminal: 'T2',
      is_contact_stand: true,
      size_limit: 'D',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'C1',
      terminal: 'T3',
      is_contact_stand: true,
      size_limit: 'F',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'C2',
      terminal: 'T3',
      is_contact_stand: true,
      size_limit: 'F',
      is_domestic_only: false,
      is_international_only: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 