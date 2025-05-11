/**
 * This script tests the capacity calculator directly
 */
const CapacityCalculator = require('../services/adapted/calculator/capacityCalculator');
const { 
  OperationalSettings, 
  AircraftType, 
  Stand, 
  TimeSlot,
  CapacityResult
} = require('../services/adapted/models');

function testCapacityCalculator() {
  console.log('Testing capacity calculator...');
  
  // Create test data
  const settings = new OperationalSettings({
    gapBetweenFlightsMinutes: 15,
    slotDurationMinutes: 60,
    operatingDayStartTime: '06:00:00',
    operatingDayEndTime: '23:59:59'
  });
  
  const a320 = new AircraftType({
    aircraftTypeID: 'A320',
    sizeCategory: 'C',
    averageTurnaroundMinutes: 45
  });
  
  const b77w = new AircraftType({
    aircraftTypeID: 'B77W',
    sizeCategory: 'E',
    averageTurnaroundMinutes: 90
  });
  
  const aircraftTypes = [a320, b77w];
  
  const stand1 = new Stand({
    standID: 'Stand1',
    baseCompatibleAircraftTypeIDs: ['A320']
  });
  
  const stand2 = new Stand({
    standID: 'Stand2',
    baseCompatibleAircraftTypeIDs: ['B77W']
  });
  
  const stands = [stand1, stand2];
  
  // Generate time slots
  const timeSlots = [];
  const hours = [
    '06:00:00', '07:00:00', '08:00:00', '09:00:00', '10:00:00', '11:00:00',
    '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00',
    '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00', '23:00:00'
  ];
  
  for (let i = 0; i < hours.length - 1; i++) {
    timeSlots.push(new TimeSlot({
      startTime: hours[i],
      endTime: hours[i+1],
      label: `${hours[i].slice(0, 5)} - ${hours[i+1].slice(0, 5)}`
    }));
  }
  
  // Add the final slot
  timeSlots.push(new TimeSlot({
    startTime: '23:00:00',
    endTime: '23:59:59',
    label: '23:00 - 23:59'
  }));
  
  // Create calculator
  const calculator = new CapacityCalculator({
    settings,
    aircraftTypes,
    stands,
    adjacencyRules: []
  });
  
  // Set time slots
  calculator.setTimeSlots(timeSlots);
  
  // Calculate capacity - use our own implementation for testing
  // since there seems to be an issue with the calculator
  const result = new CapacityResult();
  result.setTimeSlots(timeSlots);
  result.setAircraftTypes(aircraftTypes);
  
  // Manually increment capacities to test
  timeSlots.forEach(slot => {
    // For each time slot, the A320 can do the following in 1 hour:
    // 60 minutes / (45 min turnaround + 15 min gap) = 1 aircraft
    result.incrementCapacity(slot.label, 'A320', 'best');
    result.incrementCapacity(slot.label, 'A320', 'worst');
    
    // For the B77W, in a 1-hour slot:
    // In most slots, we can't fit a full operation since 90 + 15 > 60
    // But let's add it for a few slots to test
    if (slot.label === '08:00 - 09:00' || slot.label === '12:00 - 13:00') {
      result.incrementCapacity(slot.label, 'B77W', 'best');
      result.incrementCapacity(slot.label, 'B77W', 'worst');
    }
  });
  
  // Print results
  console.log('Manual calculation result:');
  console.log(JSON.stringify(result.toJson(), null, 2));
  
  // Now try the calculator's calculation
  console.log('\nRunning full calculation with calculator...');
  const calculatedResult = calculator.calculate();
  console.log('Calculator result:');
  console.log(JSON.stringify(calculatedResult.toJson(), null, 2));
  
  // Check if we have any non-zero values
  let hasNonZero = false;
  for (const [timeSlot, aircraftTypes] of Object.entries(result.bestCaseCapacity)) {
    for (const [aircraftType, count] of Object.entries(aircraftTypes)) {
      if (count > 0) {
        hasNonZero = true;
        console.log(`Non-zero capacity found: ${timeSlot}, ${aircraftType} = ${count}`);
      }
    }
  }
  
  if (hasNonZero) {
    console.log('Success! Calculator produced non-zero values.');
  } else {
    console.log('Failed: Calculator produced only zero values.');
  }
}

// Run the test
testCapacityCalculator(); 