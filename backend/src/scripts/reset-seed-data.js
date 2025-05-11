/**
 * This script resets and reseeds the database with test data
 * to ensure the stand capacity tool has proper data for testing
 */
const { db } = require('../utils/db');

async function resetAndSeedDatabase() {
  try {
    console.log('Starting database reset and seed process...');
    
    // Step 1: Run aircraft size categories seed
    console.log('Seeding aircraft size categories...');
    await require('../seeds/02_aircraft_size_categories').seed(db);
    
    // Step 2: Run aircraft types seed
    console.log('Seeding aircraft types...');
    await require('../seeds/03_aircraft_types').seed(db);
    
    // Step 3: Run initial data seed (terminals, piers, stands)
    console.log('Seeding initial data (terminals, piers, stands)...');
    await require('../seeds/01_initial_data').seed(db);
    
    // Step 4: Run stand constraints seed
    console.log('Seeding stand constraints...');
    await require('../seeds/04_stand_constraints').seed(db);
    
    // Step 5: Run turnaround rules seed
    console.log('Seeding turnaround rules...');
    await require('../seeds/05_turnaround_rules').seed(db);
    
    // Step 6: Run time slots seed
    console.log('Seeding time slots...');
    await require('../seeds/06_time_slots').seed(db);
    
    // Step 7: Run operational settings seed
    console.log('Seeding operational settings...');
    await require('../seeds/06_operational_settings').seed(db);
    
    // Step 8: Run stand adjacencies seed
    console.log('Seeding stand adjacencies...');
    await require('../seeds/06_stand_adjacencies').seed(db);

    console.log('Database reset and seed completed successfully!');
    
    // Check the seeded data
    const stands = await db('stands').count('* as count').first();
    const constraints = await db('stand_aircraft_constraints').count('* as count').first();
    const timeSlots = await db('time_slots').count('* as count').first();
    
    console.log(`Stands count: ${stands.count}`);
    console.log(`Stand constraints count: ${constraints.count}`);
    console.log(`Time slots count: ${timeSlots.count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during database reset and seed:', error);
    process.exit(1);
  }
}

// Run the function
resetAndSeedDatabase(); 