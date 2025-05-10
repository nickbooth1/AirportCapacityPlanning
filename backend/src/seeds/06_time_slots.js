/**
 * Seed initial time slots
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing time slots
  await knex('time_slots').del();
  
  // Insert initial time slots
  await knex('time_slots').insert([
    {
      name: 'Morning Peak',
      start_time: '06:00:00',
      end_time: '09:00:00',
      description: 'Morning rush hour period',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Mid-Morning',
      start_time: '09:00:00',
      end_time: '12:00:00',
      description: 'Mid-morning operational period',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Afternoon',
      start_time: '12:00:00',
      end_time: '15:00:00',
      description: 'Afternoon operational period',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Evening Peak',
      start_time: '15:00:00',
      end_time: '19:00:00',
      description: 'Evening rush hour period',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Night',
      start_time: '19:00:00',
      end_time: '23:59:59',
      description: 'Night operational period',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 