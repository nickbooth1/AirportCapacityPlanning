/**
 * This script tests the core capacity calculation logic with hard-coded data
 * It bypasses the database and API to focus on the calculator functionality
 */
const CapacityCalculator = require('../services/adapted/calculator/capacityCalculator');
const { 
  OperationalSettings, 
  AircraftType, 
  Stand, 
  TimeSlot,
  CapacityResult
} = require('../services/adapted/models');

/**
 * Create test data directly 
 */
function createTestData() {
  console.log('Creating test data...');
  
  // Create test operational settings
  const settings = new OperationalSettings({
    gapBetweenFlightsMinutes: 15,
    slotDurationMinutes: 60,
    operatingDayStartTime: '06:00:00',
    operatingDayEndTime: '22:00:00'
  });
  
  // Create test aircraft types
  const a320 = new AircraftType({
    id: '1',
    aircraftTypeID: 'A320',
    sizeCategory: 'C',
    averageTurnaroundMinutes: 45
  });
  
  const b77w = new AircraftType({
    id: '2',
    aircraftTypeID: 'B77W',
    sizeCategory: 'E',
    averageTurnaroundMinutes: 90
  });
  
  const aircraftTypes = [a320, b77w];
  console.log(`Created aircraft types: ${aircraftTypes.map(a => a.aircraftTypeID).join(', ')}`);
  
  // Create test stands with compatible aircraft types explicitly set
  const stand1 = new Stand({
    id: '1',
    code: 'A1',
    standID: 'A1',
    baseCompatibleAircraftTypeIDs: ['A320']
  });
  
  const stand2 = new Stand({
    id: '2',
    code: 'B1',
    standID: 'B1',
    baseCompatibleAircraftTypeIDs: ['B77W']
  });
  
  const stand3 = new Stand({
    id: '3',
    code: 'C1',
    standID: 'C1',
    baseCompatibleAircraftTypeIDs: ['A320']
  });
  
  const stands = [stand1, stand2, stand3];
  console.log(`Created stands with IDs: ${stands.map(s => s.standID).join(', ')}`);
  
  // Log the compatible aircraft types for each stand
  stands.forEach(stand => {
    console.log(`Stand ${stand.standID} is compatible with: ${stand.baseCompatibleAircraftTypeIDs.join(', ')}`);
  });
  
  // Create time slots - 1 hour each from 6am to 10pm
  const timeSlots = [];
  for (let hour = 6; hour < 22; hour++) {
    const startHour = hour.toString().padStart(2, '0');
    const endHour = (hour + 1).toString().padStart(2, '0');
    
    timeSlots.push(new TimeSlot({
      label: `${startHour}:00 - ${endHour}:00`,
      startTime: `${startHour}:00:00`,
      endTime: `${endHour}:00:00`
    }));
  }
  
  console.log(`Created ${timeSlots.length} time slots`);
  
  return { settings, aircraftTypes, stands, timeSlots };
}

/**
 * Run the test
 */
function runTest() {
  const { settings, aircraftTypes, stands, timeSlots } = createTestData();
  
  // Create the calculator with our test data
  const calculator = new CapacityCalculator({
    settings,
    aircraftTypes,
    stands,
    adjacencyRules: [] // No adjacency rules for this test
  });
  
  // Set time slots
  calculator.setTimeSlots(timeSlots);
  
  // Calculate capacity
  console.log('Calculating capacity...');
  const result = calculator.calculate();
  
  // Get the JSON result
  const jsonResult = result.toJson();
  
  // Calculate the total capacity
  let totalCapacity = 0;
  Object.entries(jsonResult.bestCaseCapacity).forEach(([slotLabel, aircraftCapacities]) => {
    console.log(`Slot ${slotLabel}:`);
    Object.entries(aircraftCapacities).forEach(([aircraftType, capacity]) => {
      if (capacity > 0) {
        console.log(`  ${aircraftType}: ${capacity}`);
        totalCapacity += capacity;
      }
    });
  });
  
  console.log(`\nTotal capacity: ${totalCapacity} aircraft`);
  
  return jsonResult;
}

// Run the test and handle errors
try {
  console.log('Starting capacity calculation test...\n');
  const result = runTest();
  console.log('\nTest completed successfully!');
} catch (error) {
  console.error('Error running capacity calculation test:', error);
} 