/**
 * Basic example demonstrating programmatic use of the StandCapacityTool
 */

const path = require('path');
const { CapacityCalculator, OperationalSettings, AircraftType, Stand, StandAdjacencyRule } = require('../src');

// Create settings
const settings = new OperationalSettings({
  gapBetweenFlightsMinutes: 15,
  slotDurationMinutes: 60,
  operatingDayStartTime: '08:00:00',
  operatingDayEndTime: '18:00:00'
});

// Create aircraft types
const aircraftTypes = [
  new AircraftType({
    aircraftTypeID: 'A320',
    sizeCategory: 'Code C',
    averageTurnaroundMinutes: 45
  }),
  new AircraftType({
    aircraftTypeID: 'B777',
    sizeCategory: 'Code E',
    averageTurnaroundMinutes: 90
  })
];

// Create stands
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

// Create adjacency rules
const adjacencyRules = [
  new StandAdjacencyRule({
    primaryStandID: 'Stand1',
    aircraftTypeTrigger: 'B777',
    affectedStandID: 'Stand2',
    restrictionType: 'NO_USE_AFFECTED_STAND',
    notes: 'When Stand1 has a B777, Stand2 cannot be used'
  })
];

// Create calculator and calculate capacity
const calculator = new CapacityCalculator({
  settings,
  aircraftTypes,
  stands,
  adjacencyRules
});

const result = calculator.calculate();

// Display the results
console.log('Best Case Capacity:');
console.log(JSON.stringify(result.toJson().bestCaseCapacity, null, 2));

console.log('\nWorst Case Capacity:');
console.log(JSON.stringify(result.toJson().worstCaseCapacity, null, 2));

// Output table view
const tableData = result.toTable();
console.log('\nCapacity Table:');
console.log('Headers:', tableData.headers);
console.log('Best Case Rows:', tableData.bestCase);
console.log('Worst Case Rows:', tableData.worstCase); 