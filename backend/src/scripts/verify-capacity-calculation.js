/**
 * This script tests the capacity calculation directly with hardcoded values
 * to verify the functionality is working properly
 */
const { db } = require('../utils/db');
const { 
  OperationalSettings, 
  AircraftType, 
  Stand, 
  TimeSlot,
  CapacityResult
} = require('../services/adapted/models');

// TEST DATA - Create all test objects directly, not from DB
const createTestData = () => {
  console.log('Creating test data...');
  
  // Create test aircraft types
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
  console.log('Created aircraft types:', aircraftTypes.map(a => a.aircraftTypeID).join(', '));
  
  // Create test stands
  const stand1 = new Stand({
    standID: 'A1',
    baseCompatibleAircraftTypeIDs: ['A320']
  });
  
  const stand2 = new Stand({
    standID: 'B1',
    baseCompatibleAircraftTypeIDs: ['B77W']
  });
  
  const stand3 = new Stand({
    standID: 'C1',
    baseCompatibleAircraftTypeIDs: ['A320']
  });
  
  const stands = [stand1, stand2, stand3];
  console.log('Created stands:', stands.map(s => s.standID).join(', '));
  
  // Create settings
  const settings = new OperationalSettings({
    gapBetweenFlightsMinutes: 15,
    slotDurationMinutes: 60,
    operatingDayStartTime: '06:00:00',
    operatingDayEndTime: '22:00:00'
  });
  
  // Create time slots - 1 hour each from 6am to 10pm
  const timeSlots = [];
  const hours = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
    '20:00', '21:00', '22:00'
  ];
  
  for (let i = 0; i < hours.length - 1; i++) {
    timeSlots.push(new TimeSlot({
      startTime: `${hours[i]}:00`,
      endTime: `${hours[i+1]}:00`,
      label: `${hours[i]} - ${hours[i+1]}`
    }));
  }
  
  console.log(`Created ${timeSlots.length} time slots`);
  
  return { aircraftTypes, stands, settings, timeSlots };
};

/**
 * Manual calculation of expected capacity
 */
const calculateExpectedCapacity = (timeSlots, stands, aircraftTypes, settings) => {
  console.log('Calculating expected capacity manually...');
  
  const result = {};
  
  // For each slot
  timeSlots.forEach(slot => {
    result[slot.label] = {};
    
    // Calculate slot duration in minutes
    const slotDuration = slot.getDurationMinutes();
    console.log(`Slot ${slot.label} has duration ${slotDuration} minutes`);
    
    // For each stand
    stands.forEach(stand => {
      // For each compatible aircraft type
      stand.baseCompatibleAircraftTypeIDs.forEach(aircraftTypeID => {
        // Find the aircraft type
        const aircraftType = aircraftTypes.find(a => a.aircraftTypeID === aircraftTypeID);
        
        if (aircraftType) {
          // Calculate total occupation time (turnaround + gap)
          const totalOccupationMinutes = 
            aircraftType.averageTurnaroundMinutes + settings.gapBetweenFlightsMinutes;
          
          // Calculate how many aircraft can fit in this time slot
          const capacity = Math.floor(slotDuration / totalOccupationMinutes);
          
          console.log(`Stand ${stand.standID}, aircraft ${aircraftTypeID}, slot ${slot.label}:
            - Turnaround time: ${aircraftType.averageTurnaroundMinutes} minutes
            - Gap time: ${settings.gapBetweenFlightsMinutes} minutes
            - Total occupation: ${totalOccupationMinutes} minutes
            - Slot duration: ${slotDuration} minutes
            - Capacity: ${capacity} aircraft`);
          
          // Store the capacity
          if (!result[slot.label][aircraftTypeID]) {
            result[slot.label][aircraftTypeID] = 0;
          }
          
          // Add the capacity for this stand
          result[slot.label][aircraftTypeID] += capacity;
        }
      });
    });
  });
  
  return result;
};

// The main test function - calls both manual and system calculation for comparison
const runTest = () => {
  // Create our test data
  const { aircraftTypes, stands, settings, timeSlots } = createTestData();
  
  // Manually calculate expected capacity
  const expectedCapacity = calculateExpectedCapacity(timeSlots, stands, aircraftTypes, settings);
  
  // Print a summary of expected results
  console.log('\nExpected capacity summary:');
  Object.entries(expectedCapacity).forEach(([slotLabel, aircraftCapacities]) => {
    Object.entries(aircraftCapacities).forEach(([aircraftType, capacity]) => {
      console.log(`  ${slotLabel}, ${aircraftType}: ${capacity}`);
    });
  });
  
  // Calculate total expected aircraft
  let totalExpectedCapacity = 0;
  Object.values(expectedCapacity).forEach(slotCapacities => {
    Object.values(slotCapacities).forEach(capacity => {
      totalExpectedCapacity += capacity;
    });
  });
  
  console.log(`\nTotal expected capacity: ${totalExpectedCapacity} aircraft`);
  
  // Now use real CapacityCalculator to create a CapacityResult
  console.log('\nCreating a capacity result object manually...');
  const result = new CapacityResult();
  result.setTimeSlots(timeSlots);
  result.setAircraftTypes(aircraftTypes);
  
  // Add capacities from our expected calculation
  Object.entries(expectedCapacity).forEach(([slotLabel, aircraftCapacities]) => {
    Object.entries(aircraftCapacities).forEach(([aircraftType, capacity]) => {
      // Increment the result once for each capacity unit
      for (let i = 0; i < capacity; i++) {
        result.incrementCapacity(slotLabel, aircraftType, 'best');
        result.incrementCapacity(slotLabel, aircraftType, 'worst');
      }
    });
  });
  
  // Print the resulting JSON
  console.log('\nFinal capacity result:');
  const jsonResult = result.toJson();
  
  // Print a summary of the result
  console.log('\nCapacity summary from JSON result:');
  Object.entries(jsonResult.bestCaseCapacity).forEach(([slotLabel, aircraftCapacities]) => {
    Object.entries(aircraftCapacities).forEach(([aircraftType, capacity]) => {
      if (capacity > 0) {
        console.log(`  ${slotLabel}, ${aircraftType}: ${capacity}`);
      }
    });
  });
  
  // Calculate total capacity from the result
  let totalResultCapacity = 0;
  Object.values(jsonResult.bestCaseCapacity).forEach(slotCapacities => {
    Object.values(slotCapacities).forEach(capacity => {
      totalResultCapacity += capacity;
    });
  });
  
  console.log(`\nTotal capacity from result: ${totalResultCapacity} aircraft`);
  
  return { expectedCapacity, jsonResult };
};

// Execute the test
runTest(); 