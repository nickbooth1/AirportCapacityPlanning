/**
 * This script updates the turnaround rules for aircraft types
 */
const { db } = require('../utils/db');

async function updateTurnaroundRules() {
  try {
    console.log('Starting turnaround rules update...');
    
    // Get the database's aircraft types
    const a320 = await db('aircraft_types')
      .where({ icao_code: 'A320' })
      .first();
      
    const b77w = await db('aircraft_types')
      .where({ icao_code: 'B77W' })
      .first();
    
    if (!a320 || !b77w) {
      console.error('Could not find required aircraft types (A320 or B77W)');
      process.exit(1);
    }
    
    console.log(`Found aircraft types: A320 (ID: ${a320.id}) and B77W (ID: ${b77w.id})`);
    
    // Clear existing turnaround rules
    console.log('Clearing existing turnaround rules...');
    await db('turnaround_rules').del();
    
    // Create turnaround rules for each aircraft type
    const rules = [
      {
        aircraft_type_id: a320.id,
        min_turnaround_minutes: 45,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        aircraft_type_id: b77w.id,
        min_turnaround_minutes: 90,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert the rules
    console.log('Inserting turnaround rules...');
    await db('turnaround_rules').insert(rules);
    
    // Verify the rules were added
    const count = await db('turnaround_rules').count('* as count').first();
    console.log(`Successfully added ${count.count} turnaround rules`);
    
    console.log('Turnaround rules update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating turnaround rules:', error);
    process.exit(1);
  }
}

// Run the function
updateTurnaroundRules(); 