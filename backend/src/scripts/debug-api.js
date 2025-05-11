/**
 * Debug script that simulates the API capacity calculation
 * with detailed logging to help identify issues.
 */
const standCapacityService = require('../services/standCapacityService');
const CapacityCalculator = require('../services/adapted/calculator/capacityCalculator');
const TimeSlot = require('../services/adapted/models/timeSlot');

async function debugApiCalculation() {
  try {
    console.log('\n=== DEBUG API CAPACITY CALCULATION ===\n');
    
    // 1. Fetch required data just like the API would
    console.log('1. Fetching data...');
    const [stands, aircraftTypes, operationalSettings, standAdjacencyRules] = await Promise.all([
      standCapacityService.fetchStands(),
      standCapacityService.fetchAircraftTypes(),
      standCapacityService.fetchOperationalSettings(),
      standCapacityService.fetchStandAdjacencies()
    ]);
    
    console.log(`- Fetched ${stands.length} stands, ${aircraftTypes.length} aircraft types, ${standAdjacencyRules.length} adjacency rules`);
    
    // 2. Check which stands have compatible aircraft types
    const standsWithCompatibleTypes = stands.filter(stand => 
      stand.baseCompatibleAircraftTypeIDs && 
      stand.baseCompatibleAircraftTypeIDs.length > 0
    );
    
    console.log(`- Stands with compatible aircraft types: ${standsWithCompatibleTypes.length}/${stands.length}`);
    
    // Log the first few stands with their compatible types
    stands.slice(0, 3).forEach(stand => {
      console.log(`  Stand ${stand.code} (ID: ${stand.id}): ${stand.baseCompatibleAircraftTypeIDs?.length || 0} compatible types`);
      if (stand.baseCompatibleAircraftTypeIDs && stand.baseCompatibleAircraftTypeIDs.length > 0) {
        console.log(`    Types: ${stand.baseCompatibleAircraftTypeIDs.join(', ')}`);
      }
    });
    
    // 3. Adapt the models for the calculator
    console.log('\n2. Adapting models for calculator...');
    const adaptedModels = standCapacityService.adaptForCalculation(
      stands, 
      aircraftTypes, 
      operationalSettings
    );
    
    console.log(`- Adapted ${adaptedModels.stands.length} stands, ${adaptedModels.aircraftTypes.length} aircraft types`);
    
    // Check which adapted stands have compatible aircraft types
    const adaptedStandsWithCompatibleTypes = adaptedModels.stands.filter(stand => 
      stand.baseCompatibleAircraftTypeIDs && 
      stand.baseCompatibleAircraftTypeIDs.length > 0
    );
    
    console.log(`- Adapted stands with compatible aircraft types: ${adaptedStandsWithCompatibleTypes.length}/${adaptedModels.stands.length}`);
    
    // Log the first 5 aircraft types to see how they are mapped
    console.log('\nAircraft type mapping:');
    console.log('DB ID -> Adapted ID mapping for first 10 aircraft types:');
    aircraftTypes.slice(0, 10).forEach(dbType => {
      const adaptedType = adaptedModels.aircraftTypes.find(at => at.id === dbType.id);
      console.log(`DB ID ${dbType.id} (${dbType.icao_code || dbType.iata_code}) -> Adapted ID: ${adaptedType?.aircraftTypeID}`);
    });
    
    // 4. Get time slots
    console.log('\n3. Fetching time slots...');
    const dbTimeSlots = await standCapacityService.getDefinedTimeSlots();
    const adaptedTimeSlots = dbTimeSlots.map(slot => new TimeSlot({
      label: slot.name,
      startTime: slot.start_time,
      endTime: slot.end_time
    }));
    
    console.log(`- Adapted ${adaptedTimeSlots.length} time slots`);
    adaptedTimeSlots.slice(0, 3).forEach(slot => {
      const durationMinutes = slot.getDurationMinutes();
      console.log(`  Time slot ${slot.label}: ${slot.startTime} to ${slot.endTime} (${durationMinutes} minutes)`);
    });
    
    // 5. Manually create a test stand and aircraft type to verify the calculation works
    console.log('\n4. Setting up test stand and aircraft type...');
    
    // We must be VERY explicit about the baseCompatibleAircraftTypeIDs being strings
    // But they should be aircraft type IDs (A320), not database IDs (1)
    const testStand = new (require('../services/adapted/models/stand'))({
      id: 'test-1',
      standID: 'TEST-1',
      code: 'TEST-1',
      baseCompatibleAircraftTypeIDs: ['A320'] // This needs to be the aircraftTypeID, not database ID
    });
    
    console.log(`- Created test stand with ID ${testStand.standID} compatible with A320`);
    
    // Find the A320 aircraft type in adapted models
    const testAircraftType = adaptedModels.aircraftTypes.find(type => type.aircraftTypeID === 'A320');
    
    if (!testAircraftType) {
      console.error('Error: Could not find A320 aircraft type in adapted models');
      return;
    }
    
    console.log(`- Found A320 aircraft type with turnaround time ${testAircraftType.averageTurnaroundMinutes} minutes`);
    
    // Add our test stand to the adapted stands
    adaptedModels.stands.push(testStand);
    
    // 6. Create the calculator with adapted models
    console.log('\n5. Creating capacity calculator...');
    const calculator = new CapacityCalculator({
      settings: adaptedModels.settings,
      aircraftTypes: adaptedModels.aircraftTypes,
      stands: adaptedModels.stands,
      adjacencyRules: standAdjacencyRules
    });
    
    // 7. Debug method to process one stand, one aircraft type, one slot
    console.log('\n6. Testing capacity calculation for one stand/aircraft/slot...');
    
    // Get the first time slot
    const testSlot = adaptedTimeSlots[0];
    
    // Create a log for the manually traced calculation
    console.log(`\nManual calculation for stand ${testStand.standID}, aircraft ${testAircraftType.aircraftTypeID}, slot ${testSlot.label}:`);
    console.log(`- Turnaround time: ${testAircraftType.averageTurnaroundMinutes} minutes`);
    console.log(`- Gap between flights: ${adaptedModels.settings.gapBetweenFlightsMinutes} minutes`);
    console.log(`- Total occupation: ${testAircraftType.averageTurnaroundMinutes + adaptedModels.settings.gapBetweenFlightsMinutes} minutes`);
    console.log(`- Slot duration: ${testSlot.getDurationMinutes()} minutes`);
    
    // Calculate how many movements can fit in this slot
    const totalOccupationMinutes = testAircraftType.averageTurnaroundMinutes + adaptedModels.settings.gapBetweenFlightsMinutes;
    const slotDurationMinutes = testSlot.getDurationMinutes();
    const expectedCapacity = Math.floor(slotDurationMinutes / totalOccupationMinutes);
    
    console.log(`- Expected capacity: ${expectedCapacity} aircraft (${slotDurationMinutes} / ${totalOccupationMinutes} = ${slotDurationMinutes / totalOccupationMinutes})`);
    
    // 8. Set time slots and calculate
    console.log('\n7. Running full capacity calculation...');
    calculator.setTimeSlots(adaptedTimeSlots);
    const calculationResult = calculator.calculate();
    
    // 9. Extract the result for our test stand/aircraft/slot
    const jsonResult = calculationResult.toJson();
    const calculatedCapacity = jsonResult.bestCaseCapacity[testSlot.label]?.[testAircraftType.aircraftTypeID] || 0;
    
    console.log(`\nCalculated capacity for test stand/aircraft/slot: ${calculatedCapacity}`);
    console.log(`Expected capacity for test stand/aircraft/slot: ${expectedCapacity}`);
    
    if (calculatedCapacity === expectedCapacity) {
      console.log('\nSUCCESS: Calculated capacity matches expected capacity');
    } else {
      console.log('\nERROR: Calculated capacity does not match expected capacity');
    }
    
    // 10. Calculate total capacity from the result
    let totalCapacity = 0;
    Object.values(jsonResult.bestCaseCapacity).forEach(slotCapacities => {
      Object.values(slotCapacities).forEach(capacity => {
        totalCapacity += capacity;
      });
    });
    
    console.log(`\nTotal calculated capacity: ${totalCapacity} aircraft movements`);
    
    console.log('\n=== DEBUG COMPLETE ===\n');
  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

// Run the function
debugApiCalculation(); 