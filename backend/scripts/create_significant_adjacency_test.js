/**
 * Script to create adjacency data that makes a clear visual difference between best and worst case
 * In worst case, an entire stand will be blocked - showing significantly lower capacity
 */
const { db } = require('../src/utils/db');

async function setupImpactfulAdjacencyTest() {
  try {
    console.log('======== SETTING UP IMPACTFUL ADJACENCY TEST ========');
    
    // 1. Clear existing data
    console.log('\n--- Clearing existing data ---');
    await db('capacity_results').del();
    console.log('Cleared capacity_results table');
    
    const deletedCount = await db('stand_adjacencies').del();
    console.log(`Deleted ${deletedCount} existing stand adjacency rules`);
    
    // 2. Get all stands
    const stands = await db('stands')
      .select('id', 'code', 'name')
      .orderBy('id')
      .limit(10);
    
    if (stands.length < 3) {
      console.error('Need at least 3 stands for the test');
      process.exit(1);
    }
    
    console.log(`\nFound ${stands.length} stands for testing:`);
    stands.forEach(stand => console.log(`  - Stand ${stand.code || stand.id} (ID: ${stand.id})`));
    
    // 3. Create very restrictive adjacency rules for dramatic best/worst case difference
    const standA = stands[0];
    const standB = stands[1];
    const standC = stands[2];
    
    console.log('\n--- Creating high-impact adjacency rules ---');
    
    const rules = [
      // Rule 1: Complete blockage of Stand B when Stand A is in use
      {
        stand_id: standA.id,
        adjacent_stand_id: standB.id,
        impact_direction: 'right',
        restriction_type: 'no_use',
        is_active: true
      },
      
      // Rule 2: Stand A restricts Stand C to only small aircraft
      {
        stand_id: standA.id,
        adjacent_stand_id: standC.id,
        impact_direction: 'right',
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C', // Only allow small aircraft
        is_active: true
      }
    ];
    
    // Insert the rules
    const insertedIds = await db('stand_adjacencies').insert(rules).returning('id');
    console.log(`Created ${insertedIds.length} high-impact adjacency rules with IDs: ${insertedIds.join(', ')}`);
    
    console.log('\n======== TEST SETUP COMPLETE ========');
    console.log('Now run a new capacity calculation to see dramatic best/worst case differences');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up adjacency test:', error);
    process.exit(1);
  }
}

// Run the setup
setupImpactfulAdjacencyTest(); 