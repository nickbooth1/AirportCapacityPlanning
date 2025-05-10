/**
 * Basic test script for Stand Capacity Tool
 */
const assert = require('assert');
const { 
  OperationalSettings, 
  AircraftType, 
  Stand, 
  StandAdjacencyRule,
  CapacityCalculator
} = require('../src');

// Test OperationalSettings
console.log('Testing OperationalSettings...');
const settings = new OperationalSettings({
  gapBetweenFlightsMinutes: 15,
  slotDurationMinutes: 60,
  operatingDayStartTime: '08:00:00',
  operatingDayEndTime: '18:00:00'
});
assert(settings.gapBetweenFlightsMinutes === 15, 'Gap between flights should be 15 minutes');
assert(settings.slotDurationMinutes === 60, 'Slot duration should be 60 minutes');
console.log('✓ OperationalSettings tests passed');

// Test AircraftType
console.log('Testing AircraftType...');
const aircraftType = new AircraftType({
  aircraftTypeID: 'A320',
  sizeCategory: 'Code C',
  averageTurnaroundMinutes: 45
});
assert(aircraftType.aircraftTypeID === 'A320', 'Aircraft type ID should be A320');
assert(aircraftType.sizeCategory === 'Code C', 'Size category should be Code C');
assert(aircraftType.averageTurnaroundMinutes === 45, 'Average turnaround time should be 45 minutes');
console.log('✓ AircraftType tests passed');

// Test Stand
console.log('Testing Stand...');
const stand = new Stand({
  standID: 'Stand1',
  baseCompatibleAircraftTypeIDs: ['A320', 'B777']
});
assert(stand.standID === 'Stand1', 'Stand ID should be Stand1');
assert(stand.baseCompatibleAircraftTypeIDs.length === 2, 'Stand should be compatible with 2 aircraft types');
assert(stand.baseCompatibleAircraftTypeIDs.includes('A320'), 'Stand should be compatible with A320');
assert(stand.isCompatibleWith('A320'), 'isCompatibleWith should return true for A320');
assert(!stand.isCompatibleWith('A380'), 'isCompatibleWith should return false for A380');
console.log('✓ Stand tests passed');

// Test StandAdjacencyRule
console.log('Testing StandAdjacencyRule...');
const rule = new StandAdjacencyRule({
  primaryStandID: 'Stand1',
  aircraftTypeTrigger: 'B777',
  affectedStandID: 'Stand2',
  restrictionType: 'NO_USE_AFFECTED_STAND',
  notes: 'When Stand1 has a B777, Stand2 cannot be used'
});
assert(rule.primaryStandID === 'Stand1', 'Primary stand ID should be Stand1');
assert(rule.affectedStandID === 'Stand2', 'Affected stand ID should be Stand2');
assert(rule.restrictionType === 'NO_USE_AFFECTED_STAND', 'Restriction type should be NO_USE_AFFECTED_STAND');
assert(rule.appliesTo('Stand2', 'B777'), 'Rule should apply to Stand2 when B777 is at Stand1');
assert(!rule.appliesTo('Stand3', 'B777'), 'Rule should not apply to Stand3');
console.log('✓ StandAdjacencyRule tests passed');

// Basic test of the calculator
console.log('Testing CapacityCalculator...');

// Use a shorter turnaround time and longer slot for more obvious capacity
const a320 = new AircraftType({
  aircraftTypeID: 'A320',
  sizeCategory: 'Code C',
  averageTurnaroundMinutes: 30 // Shorter turnaround
});

const b777 = new AircraftType({
  aircraftTypeID: 'B777',
  sizeCategory: 'Code E',
  averageTurnaroundMinutes: 45 // Shorter turnaround
});

const aircraftTypes = [a320, b777];

const stands = [
  new Stand({
    standID: 'Stand1',
    baseCompatibleAircraftTypeIDs: ['A320', 'B777']
  }),
  new Stand({
    standID: 'Stand2',
    baseCompatibleAircraftTypeIDs: ['A320']
  })
];

const adjacencyRules = [
  new StandAdjacencyRule({
    primaryStandID: 'Stand1',
    aircraftTypeTrigger: 'B777',
    affectedStandID: 'Stand2',
    restrictionType: 'NO_USE_AFFECTED_STAND',
    notes: 'When Stand1 has a B777, Stand2 cannot be used'
  })
];

// Use more generous slot duration (120 minutes) to ensure capacity is positive
const testSettings = new OperationalSettings({
  gapBetweenFlightsMinutes: 15,
  slotDurationMinutes: 120, // Longer slot duration
  operatingDayStartTime: '08:00:00',
  operatingDayEndTime: '18:00:00'
});

const calculator = new CapacityCalculator({
  settings: testSettings,
  aircraftTypes,
  stands,
  adjacencyRules
});

const result = calculator.calculate();
assert(result, 'Result should be defined');
assert(result.timeSlots.length > 0, 'Result should have time slots');
assert(result.aircraftTypes.length === 2, 'Result should have 2 aircraft types');

// Debug output
console.log('Time slots:', result.timeSlots.map(slot => slot.label));
console.log('Aircraft types:', result.aircraftTypes.map(type => type.aircraftTypeID));

// Test result in best case
const firstSlot = result.timeSlots[0].label;
console.log('First slot:', firstSlot);

const a320BestCaseCapacity = result.getCapacity(firstSlot, 'A320', false);
console.log('A320 best case capacity:', a320BestCaseCapacity);
assert(a320BestCaseCapacity > 0, 'A320 capacity should be positive in best case');

const b777BestCaseCapacity = result.getCapacity(firstSlot, 'B777', false);
console.log('B777 best case capacity:', b777BestCaseCapacity);
assert(b777BestCaseCapacity > 0, 'B777 capacity should be positive in best case');

// Test result in worst case (with adjacency rule applied)
const a320WorstCaseCapacity = result.getCapacity(firstSlot, 'A320', true);
console.log('A320 worst case capacity:', a320WorstCaseCapacity);
assert(a320WorstCaseCapacity < a320BestCaseCapacity,
  'A320 capacity should be lower in worst case due to adjacency rules');

console.log('✓ CapacityCalculator tests passed');

console.log('\n✓ All tests passed!'); 