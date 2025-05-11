/**
 * Comprehensive test script for adjacency rules impact
 * This script:
 * 1. Sets up a variety of adjacency rules in the database
 * 2. Calculates capacity with and without adjacency rules
 * 3. Compares best vs worst case capacity to verify impact
 */
const { db } = require('../src/utils/db');
const standCapacityService = require('../src/services/standCapacityService');

async function testAdjacencyImpact() {
  try {
    console.log('======== ADJACENCY RULES IMPACT TEST ========');
    
    // 1. Fetch the necessary data
    console.log('\n--- Fetching data ---');
    
    // Get stands for testing
    const stands = await db('stands')
      .select('id', 'code', 'name', 'max_aircraft_size_code')
      .orderBy('id')
      .limit(5);
    
    if (stands.length < 3) {
      console.error('Test requires at least 3 stands. Not enough stands found.');
      process.exit(1);
    }
    
    console.log(`Found ${stands.length} stands for testing:`);
    stands.forEach(stand => {
      console.log(`  - Stand ${stand.code || stand.id}: Max size ${stand.max_aircraft_size_code || 'not specified'}`);
    });
    
    // Get aircraft types for testing
    const aircraftTypes = await db('aircraft_types')
      .select('id', 'icao_code', 'size_category_code', 'is_active')
      .where('is_active', true)
      .orderBy('size_category_code');
    
    console.log(`Found ${aircraftTypes.length} active aircraft types`);
    
    // Group aircraft by size category
    const aircraftBySize = {};
    aircraftTypes.forEach(aircraft => {
      if (!aircraftBySize[aircraft.size_category_code]) {
        aircraftBySize[aircraft.size_category_code] = [];
      }
      aircraftBySize[aircraft.size_category_code].push(aircraft);
    });
    
    // Log available aircraft sizes
    Object.keys(aircraftBySize).forEach(size => {
      console.log(`  - Size ${size}: ${aircraftBySize[size].length} aircraft types`);
    });
    
    // 2. Clear any existing adjacency rules
    console.log('\n--- Clearing existing adjacency rules ---');
    const deletedCount = await db('stand_adjacencies').del();
    console.log(`Deleted ${deletedCount} existing stand adjacency rules.`);
    
    // 3. Create comprehensive test adjacency rules
    console.log('\n--- Creating test adjacency rules ---');
    
    const adjacencyRules = [
      // Rule 1: Stand 1 impacts Stand 2 with no_use restriction
      {
        stand_id: stands[0].id,
        adjacent_stand_id: stands[1].id,
        impact_direction: 'right',
        restriction_type: 'no_use',
        is_active: true
      },
      
      // Rule 2: Stand 2 impacts Stand 3 with size_limited restriction
      {
        stand_id: stands[1].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'right',
        restriction_type: 'size_limited',
        max_aircraft_size_code: 'C', // Limit to size C or smaller
        is_active: true
      }
    ];
    
    // Rule 3: Only add aircraft_type_limited if we have size E aircraft
    if (aircraftBySize['E'] && aircraftBySize['E'].length > 0) {
      const prohibitedType = aircraftBySize['E'][0];
      adjacencyRules.push({
        stand_id: stands[0].id,
        adjacent_stand_id: stands[2].id,
        impact_direction: 'other',
        restriction_type: 'aircraft_type_limited',
        restriction_details: JSON.stringify([prohibitedType.icao_code]),
        is_active: true
      });
      console.log(`Added aircraft_type_limited rule prohibiting ${prohibitedType.icao_code}`);
    }
    
    // Insert the adjacency rules
    const insertedIds = await db('stand_adjacencies').insert(adjacencyRules).returning('id');
    console.log(`Created ${insertedIds.length} test adjacency rules with IDs: ${insertedIds.join(', ')}`);
    
    // 4. Get time slots for capacity calculation
    const timeSlots = await db('time_slots')
      .select('id', 'name', 'start_time', 'end_time')
      .orderBy('start_time')
      .limit(3);
    
    if (timeSlots.length === 0) {
      console.log('No time slots found, creating a test time slot');
      timeSlots.push({
        id: 'test_slot_1',
        name: 'Test Slot (0800-1200)',
        start_time: '08:00',
        end_time: '12:00'
      });
    }
    
    console.log(`Using ${timeSlots.length} time slots for testing`);
    
    // 5. First calculate capacity WITHOUT adjacency rules
    console.log('\n--- Calculating capacity WITHOUT adjacency rules ---');
    
    // Empty adjacency rules for baseline calculation
    const emptyAdjacencyRules = [];
    
    const baselineCaseResults = await Promise.all(timeSlots.map(timeSlot => 
      standCapacityService.calculateCapacityForTimeSlot(
        timeSlot,
        stands,
        aircraftTypes,
        {}, // empty turnaround rules (will use defaults)
        emptyAdjacencyRules,
        15 // gap between flights in minutes
      )
    ));
    
    // 6. Now calculate capacity WITH adjacency rules
    console.log('\n--- Calculating capacity WITH adjacency rules ---');
    
    // Fetch the adjacency rules we just created
    const activeAdjacencyRules = await db('stand_adjacencies')
      .select('*')
      .where('is_active', true);
    
    console.log(`Found ${activeAdjacencyRules.length} active adjacency rules for testing`);
    
    const adjacencyCaseResults = await Promise.all(timeSlots.map(timeSlot => 
      standCapacityService.calculateCapacityForTimeSlot(
        timeSlot,
        stands,
        aircraftTypes,
        {}, // empty turnaround rules (will use defaults)
        activeAdjacencyRules,
        15 // gap between flights in minutes
      )
    ));
    
    // 7. Compare and analyze results
    console.log('\n--- Analyzing impact of adjacency rules ---');
    
    // Helper function to sum total capacity across all aircraft types
    const sumCapacity = capacityObj => 
      Object.values(capacityObj).reduce((sum, val) => sum + val, 0);
    
    // For each time slot, compare baseline vs adjacency case
    timeSlots.forEach((timeSlot, index) => {
      const baseline = baselineCaseResults[index];
      const withAdjacency = adjacencyCaseResults[index];
      
      // Calculate totals for comparison
      const baselineBestTotal = sumCapacity(baseline.bestCaseCapacity);
      const baselineWorstTotal = sumCapacity(baseline.worstCaseCapacity);
      const adjacencyBestTotal = sumCapacity(withAdjacency.bestCaseCapacity);
      const adjacencyWorstTotal = sumCapacity(withAdjacency.worstCaseCapacity);
      
      console.log(`\nTime Slot: ${timeSlot.name}`);
      console.log('Without Adjacency Rules:');
      console.log(`  - Best Case Total: ${baselineBestTotal}`);
      console.log(`  - Worst Case Total: ${baselineWorstTotal}`);
      console.log('With Adjacency Rules:');
      console.log(`  - Best Case Total: ${adjacencyBestTotal}`);
      console.log(`  - Worst Case Total: ${adjacencyWorstTotal}`);
      
      // Calculate impact percentages
      const bestCaseImpactPct = baselineBestTotal === 0 ? 0 : 
        ((baselineBestTotal - adjacencyBestTotal) / baselineBestTotal) * 100;
      
      const worstCaseImpactPct = baselineWorstTotal === 0 ? 0 :
        ((baselineWorstTotal - adjacencyWorstTotal) / baselineWorstTotal) * 100;
      
      console.log('Impact Analysis:');
      console.log(`  - Best Case Impact: ${bestCaseImpactPct.toFixed(2)}% reduction`);
      console.log(`  - Worst Case Impact: ${worstCaseImpactPct.toFixed(2)}% reduction`);
      
      // Validate results - worst case should be more restrictive
      if (adjacencyWorstTotal <= adjacencyBestTotal) {
        console.log('✅ PASS: Adjacency rules correctly make worst case <= best case');
      } else {
        console.log('❌ FAIL: Adjacency rules not working correctly - worst case > best case');
      }
      
      if (adjacencyWorstTotal < baselineWorstTotal) {
        console.log('✅ PASS: Adjacency rules correctly reduce capacity in worst case');
      } else {
        console.log('❌ NOTE: Adjacency rules did not reduce worst case capacity as expected');
      }
    });
    
    console.log('\n======== TEST COMPLETE ========');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testAdjacencyImpact(); 