/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Delete existing entries to avoid duplicates
  await knex('operational_settings').del();
  
  // Insert default operational settings (ensuring only one row with id=1)
  await knex('operational_settings').insert([
    {
      id: 1,
      default_gap_minutes: 15,
      operating_start_time: '06:00:00',
      operating_end_time: '23:59:59',
      slot_duration_minutes: 10,
      slot_block_size: 6,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 