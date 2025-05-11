/**
 * Script to clear all existing adjacency data and set up a test with clear best/worst case differences
 */
const { db } = require('../src/utils/db');

async function setupAdjacencyTest() {
  try {
    console.log('======== ADJACENCY TEST SETUP ========');
    
    // 1. Clear existing capacity results and adjacencies
    console.log('\n--- Clearing existing data ---');
    await db('capacity_results').del();
    console.log('Cleared capacity_results table');
    
    const deletedCount = await db('stand_adjacencies').del();
    console.log(`Deleted ${deletedCount} existing stand adjacency rules`);
    
    // 2. Get stands to work with
    const stands = await db('stands')
      .select('id', 'code', 'name')
      .orderBy('id')
      .limit(5);
    
    if (stands.length < 3) {
      console.error('Need at least 3 stands for the test');
      process.exit(1);
    }
    
    console.log(`\nFound ${stands.length} stands for testing:`);
    stands.forEach(stand => console.log(`  - Stand ${stand.code || stand.id}`));
    
    // 3. Create strong adjacency restrictions for clear best/worst case difference
    console.log('\n--- Creating test adjacency rules ---');
    
    const rules = [
      // Rule 1: Stand 0 impacts Stand 1 with no_use restriction
      // This should completely block use of stand 1 in worst case
      {
        stand_id: stands[0].id,
        adjacent_stand_id: stands[1].id,
        impact_direction: 'right',
        restriction_type: 'no_use',
        is_active: true
      },
      
      // Rule 2: Stand 0 impacts Stand 2 with size_limited restriction
      // This should limit stand 2 to only smaller aircraft in worst case
      {
        stand_id: stands[0].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'right',
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C', // Limit to size C or smaller
        is_active: true
      }
    ];
    
    // Insert the rules
    const insertedIds = await db('stand_adjacencies').insert(rules).returning('id');
    console.log(`Created ${insertedIds.length} test adjacency rules with IDs: ${insertedIds.join(', ')}`);
    
    console.log('\n======== TEST SETUP COMPLETE ========');
    console.log('Now run the capacity calculation to see best/worst case differences');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up adjacency test:', error);
    process.exit(1);
  }
}

// Run the setup
setupAdjacencyTest(); 