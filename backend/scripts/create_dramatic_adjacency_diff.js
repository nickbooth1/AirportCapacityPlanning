/**
 * Script to create adjacency data that shows a dramatic difference between best and worst case capacity
 * In worst case, wide-body aircraft are significantly restricted
 */
const { db } = require('../src/utils/db');

async function setupDramaticAdjacencyTest() {
  try {
    console.log('======== SETTING UP DRAMATIC ADJACENCY TEST ========');
    
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
    
    console.log(`Found ${stands.length} stands to work with`);
    
    if (stands.length < 3) {
      console.error('Not enough stands to create meaningful adjacency rules');
      process.exit(1);
    }
    
    // 3. Create dramatic adjacency rules - in worst case, limit wide-body aircraft significantly
    const adjacencyRules = [];
    
    // Make stand[0] impact stand[1] - no wide-body aircraft next to wide-body aircraft
    adjacencyRules.push({
      stand_id: stands[0].id,
      adjacent_stand_id: stands[1].id,
      restriction_type: 'aircraft_type_limited',
      max_aircraft_size_code: 'C', // Only narrow-body or smaller
      impact_direction: 'right',
      restriction_details: 'worst_case', // This indicates it's for worst-case only
      is_active: true
    });
    
    // Make stand[1] impact stand[2] - no wide-body aircraft next to wide-body aircraft
    adjacencyRules.push({
      stand_id: stands[1].id,
      adjacent_stand_id: stands[2].id,
      restriction_type: 'aircraft_type_limited',
      max_aircraft_size_code: 'C', // Only narrow-body or smaller
      impact_direction: 'right',
      restriction_details: 'worst_case', // This indicates it's for worst-case only
      is_active: true
    });
    
    // Make stand[0] unable to use any wide-body
    adjacencyRules.push({
      stand_id: stands[0].id,
      adjacent_stand_id: stands[0].id, // Self-reference for stand-specific restriction
      restriction_type: 'aircraft_type_limited',
      max_aircraft_size_code: 'C', // Only narrow-body or smaller
      impact_direction: 'other', // Valid value: "other" instead of "self"
      restriction_details: 'worst_case', // This indicates it's for worst-case only
      is_active: true
    });
    
    // Insert the adjacency rules
    for (const rule of adjacencyRules) {
      await db('stand_adjacencies').insert(rule);
      console.log(`Added rule: Stand ${rule.stand_id} impacting ${rule.adjacent_stand_id} with ${rule.restriction_type} (${rule.restriction_details})`);
    }
    
    console.log('\n--- Adjacency rules created successfully ---');
    console.log('You should now see a dramatic difference between best and worst case capacity!');
    console.log('\nRun the following command to calculate capacity:');
    console.log('curl -X POST http://localhost:3001/api/capacity/calculate -H "Content-Type: application/json" -d \'{"useDefinedTimeSlots":true}\'');
    
  } catch (error) {
    console.error('Error setting up adjacency test:', error);
  } finally {
    process.exit(0);
  }
}

setupDramaticAdjacencyTest(); 