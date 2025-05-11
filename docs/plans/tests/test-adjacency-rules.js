/**
 * Test script to verify the stand adjacency functionality is working correctly.
 * 
 * This test verifies that:
 * 1. Base capacity (without adjacency rules) is calculated correctly
 * 2. Adjacency rules restrict capacity appropriately in the worst case scenario
 * 3. The different types of restrictions (no_use, size_limited, aircraft_type_limited) work as expected
 */

// Direct import of the service file
const StandCapacityService = require('../../../backend/src/services/standCapacityService');

// Test data
const stands = [
  { 
    id: 1, 
    code: 'A1', 
    max_aircraft_size_code: 'F',  // Can handle all aircraft sizes
    compatible_aircraft_types: ['A320', 'B77W', 'A388'] 
  },
  { 
    id: 2, 
    code: 'A2', 
    max_aircraft_size_code: 'F',  // Can handle all aircraft sizes
    compatible_aircraft_types: ['A320', 'B77W', 'A388'] 
  },
  { 
    id: 3, 
    code: 'A3', 
    max_aircraft_size_code: 'C',  // Can only handle narrow body
    compatible_aircraft_types: ['A320'] 
  }
];

const aircraftTypes = [
  { 
    id: 1, 
    icao_code: 'A320', 
    size_category_code: 'C',
    body_type: 'narrow' 
  },
  { 
    id: 2, 
    icao_code: 'B77W', 
    size_category_code: 'E',
    body_type: 'wide' 
  },
  { 
    id: 3, 
    icao_code: 'A388', 
    size_category_code: 'F',
    body_type: 'wide' 
  }
];

const turnaroundRules = {
  'A320': { min_turnaround_minutes: 30 },
  'B77W': { min_turnaround_minutes: 45 },
  'A388': { min_turnaround_minutes: 60 }
};

const timeSlot = {
  id: 1,
  name: 'Test Slot',
  start_time: '08:00',
  end_time: '09:00'
};

// Test various adjacency scenarios
const runTest = async () => {
  console.log('==== Testing Stand Adjacency Rules ====');
  
  // Test 1: No adjacency rules (best case = worst case)
  console.log('\n--- Test 1: No Adjacency Rules ---');
  let adjacencyRules = [];
  
  let result = StandCapacityService.calculateCapacityForTimeSlot(
    timeSlot,
    stands,
    aircraftTypes,
    turnaroundRules,
    adjacencyRules,
    15 // gap minutes
  );
  
  console.log('Best case capacity (total):', calculateTotalCapacity(result.bestCaseCapacity));
  console.log('Worst case capacity (total):', calculateTotalCapacity(result.worstCaseCapacity));
  
  // Test 2: "No Use" adjacency rule - stand 2 cannot be used when stand 1 is in use
  console.log('\n--- Test 2: No Use Adjacency Rule ---');
  adjacencyRules = [
    {
      id: 1,
      stand_id: 1,
      adjacent_stand_id: 2,
      impact_direction: 'right',
      restriction_type: 'no_use',
      is_active: true
    }
  ];
  
  result = StandCapacityService.calculateCapacityForTimeSlot(
    timeSlot,
    stands,
    aircraftTypes,
    turnaroundRules,
    adjacencyRules,
    15 // gap minutes
  );
  
  console.log('Best case capacity (total):', calculateTotalCapacity(result.bestCaseCapacity));
  console.log('Worst case capacity (total):', calculateTotalCapacity(result.worstCaseCapacity));
  console.log('A2 best capacity:', result.bestCaseCapacity['A320']);
  console.log('A2 worst capacity:', result.worstCaseCapacity['A320']);
  
  // Test 3: "Size Limited" adjacency rule - stand 2 can only handle smaller aircraft when stand 1 is occupied
  console.log('\n--- Test 3: Size Limited Adjacency Rule ---');
  adjacencyRules = [
    {
      id: 2,
      stand_id: 1,
      adjacent_stand_id: 2,
      impact_direction: 'right',
      restriction_type: 'size_limited',
      max_aircraft_size_code: 'C', // Only narrow body allowed
      is_active: true
    }
  ];
  
  result = StandCapacityService.calculateCapacityForTimeSlot(
    timeSlot,
    stands,
    aircraftTypes,
    turnaroundRules,
    adjacencyRules,
    15 // gap minutes
  );
  
  console.log('Best case capacity (total):', calculateTotalCapacity(result.bestCaseCapacity));
  console.log('Worst case capacity (total):', calculateTotalCapacity(result.worstCaseCapacity));
  console.log('Stand 2 wide body best case:', result.bestCaseCapacity['B77W'] + result.bestCaseCapacity['A388']);
  console.log('Stand 2 wide body worst case:', result.worstCaseCapacity['B77W'] + result.worstCaseCapacity['A388']);
  
  // Test 4: "Aircraft Type Limited" adjacency rule - specific aircraft types prohibited
  console.log('\n--- Test 4: Aircraft Type Limited Adjacency Rule ---');
  adjacencyRules = [
    {
      id: 3,
      stand_id: 1,
      adjacent_stand_id: 2,
      impact_direction: 'right',
      restriction_type: 'aircraft_type_limited',
      restriction_details: JSON.stringify(['A388']), // A388 not allowed on stand 2 when stand 1 is in use
      is_active: true
    }
  ];
  
  result = StandCapacityService.calculateCapacityForTimeSlot(
    timeSlot,
    stands,
    aircraftTypes,
    turnaroundRules,
    adjacencyRules,
    15 // gap minutes
  );
  
  console.log('Best case capacity (total):', calculateTotalCapacity(result.bestCaseCapacity));
  console.log('Worst case capacity (total):', calculateTotalCapacity(result.worstCaseCapacity));
  console.log('Stand 2 A388 best case:', result.bestCaseCapacity['A388']);
  console.log('Stand 2 A388 worst case:', result.worstCaseCapacity['A388']);
  
  console.log('\n==== Testing Complete ====');
};

// Helper to calculate total capacity across all aircraft types
const calculateTotalCapacity = (capacityObj) => {
  return Object.values(capacityObj).reduce((sum, val) => sum + val, 0);
};

// Run the test
runTest().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
}); 