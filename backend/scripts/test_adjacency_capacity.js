/**
 * Script to test adjacency rules in capacity calculations
 * This script:
 * 1. Inserts test adjacency data
 * 2. Calls the capacity calculation
 * 3. Verifies the best case and worst case results
 */
const { db } = require('../src/utils/db');
const standCapacityService = require('../src/services/standCapacityService');

async function testAdjacencyCapacity() {
  try {
    console.log('==== STAND ADJACENCY CAPACITY TEST ====');
    
    // 1. Set up test data
    console.log('\n--- Setting up test data ---');
    
    // Get some stand IDs to work with (at least 3)
    const stands = await db('stands').select('id', 'code').limit(5);
    
    if (stands.length < 3) {
      console.error('Test requires at least 3 stands. Not enough stands found.');
      process.exit(1);
    }
    
    console.log(`Found ${stands.length} stands to work with:`, stands.map(s => s.code || s.id).join(', '));
    
    // Delete existing entries to start fresh
    const deletedCount = await db('stand_adjacencies').del();
    console.log(`Deleted ${deletedCount} existing stand adjacency rules.`);
    
    // Get aircraft types to use in the test
    const aircraftTypes = await db('aircraft_types')
      .select('id', 'icao_code', 'size_category_code')
      .where('is_active', true)
      .limit(10);
    
    console.log(`Found ${aircraftTypes.length} aircraft types to use in testing.`);
    
    // Group aircraft by size category
    const aircraftBySize = {};
    aircraftTypes.forEach(aircraft => {
      if (!aircraftBySize[aircraft.size_category_code]) {
        aircraftBySize[aircraft.size_category_code] = [];
      }
      aircraftBySize[aircraft.size_category_code].push(aircraft);
    });
    
    // 2. Create adjacency rules for testing
    console.log('\n--- Creating adjacency rules ---');
    
    // Define the adjacency data with three different rule types
    const adjacencyData = [
      // 1. No use rule: Stand 2 cannot be used when Stand 1 is occupied
      {
        stand_id: stands[0].id,
        adjacent_stand_id: stands[1].id,
        impact_direction: 'right', // lowercase as per constraint
        restriction_type: 'no_use',
        is_active: true
      },
      
      // 2. Size limited rule: Stand 3 can only handle size code C or smaller when Stand 2 is occupied
      {
        stand_id: stands[1].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'left', // lowercase as per constraint
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C', // Allow only up to narrow body
        is_active: true
      }
    ];
    
    // 3. Aircraft type limited rule: If we have enough aircraft types data 
    // Create a rule where specific aircraft types are prohibited
    if (aircraftBySize['E'] && aircraftBySize['E'].length > 0) {
      const prohibitedType = aircraftBySize['E'][0]; // Take first size E aircraft
      
      adjacencyData.push({
        stand_id: stands[0].id,
        adjacent_stand_id: stands[2].id, 
        impact_direction: 'other', // lowercase as per constraint
        restriction_type: 'aircraft_type_limited',
        restriction_details: JSON.stringify([prohibitedType.icao_code]),
        is_active: true
      });
      
      console.log(`Added aircraft_type_limited rule for ${prohibitedType.icao_code}`);
    }
    
    // Insert the adjacency data
    const insertedIds = await db('stand_adjacencies').insert(adjacencyData).returning('id');
    console.log(`Inserted ${insertedIds.length} stand adjacency rules with IDs: ${insertedIds.join(', ')}`);
    
    // 3. Call capacity calculation
    console.log('\n--- Running capacity calculation ---');
    
    // Create a simple time slot for testing
    const timeSlot = {
      id: 1,
      name: 'Test Slot',
      start_time: '08:00',
      end_time: '12:00'
    };
    
    const result = await standCapacityService.calculateCapacityForTimeSlot(
      timeSlot,
      stands,
      aircraftTypes,
      {},  // empty turnaround rules (will use defaults)
      await standCapacityService.fetchStandAdjacencies(),
      15 // gap between flights in minutes
    );
    
    // 4. Analyze the results
    console.log('\n--- Analyzing results ---');
    
    // Calculate totals for each case
    const bestCaseTotal = Object.values(result.bestCaseCapacity).reduce((sum, val) => sum + val, 0);
    const worstCaseTotal = Object.values(result.worstCaseCapacity).reduce((sum, val) => sum + val, 0);
    
    console.log(`Best case total capacity: ${bestCaseTotal}`);
    console.log(`Worst case total capacity: ${worstCaseTotal}`);
    
    // Validation - worst case should be less than or equal to best case
    if (worstCaseTotal <= bestCaseTotal) {
      console.log('✅ PASS: Worst case capacity is less than or equal to best case capacity');
    } else {
      console.log('❌ FAIL: Worst case capacity is higher than best case capacity');
    }
    
    // Check stand 2 which should have 'no_use' restriction
    const stand2 = stands[1];
    let stand2BestCase = 0;
    let stand2WorstCase = 0;
    
    // We don't have direct access to per-stand capacity, so we would need additional instrumentation
    // or database queries to verify this precisely
    
    console.log('\n--- Detailed results ---');
    console.log('Best case capacity by aircraft type:', result.bestCaseCapacity);
    console.log('Worst case capacity by aircraft type:', result.worstCaseCapacity);
    
    console.log('\n==== TEST COMPLETE ====');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testAdjacencyCapacity(); 