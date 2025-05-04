/**
 * Seed to update existing operational settings with default slot values
 */
exports.seed = async function(knex) {
  // Check if settings row exists
  const settings = await knex('operational_settings').where('id', 1).first();
  
  if (settings) {
    // Update existing settings with default slot values
    await knex('operational_settings')
      .where('id', 1)
      .update({
        slot_duration_minutes: 10,
        slot_block_size: 6,
        updated_at: new Date().toISOString()
      });
  }
}; 