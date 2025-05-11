/**
 * This script dumps the stand constraints and related data
 * to help debug the capacity calculation issue
 */
const { db } = require('../utils/db');
const standCapacityService = require('../services/standCapacityService');

async function dumpStandModelData() {
  try {
    console.log('\n=== STAND CONSTRAINTS DEBUG DATA ===\n');
    
    // 1. Dump stand constraints from database
    const constraints = await db('stand_aircraft_constraints')
      .select(
        'stand_aircraft_constraints.*',
        'stands.code as stand_code',
        'aircraft_types.icao_code as aircraft_icao_code'
      )
      .leftJoin('stands', 'stand_aircraft_constraints.stand_id', 'stands.id')
      .leftJoin('aircraft_types', 'stand_aircraft_constraints.aircraft_type_id', 'aircraft_types.id');
    
    console.log(`Found ${constraints.length} stand constraints in database:`);
    constraints.forEach(constraint => {
      console.log(`- Stand ${constraint.stand_code} (ID: ${constraint.stand_id}) can accommodate ${constraint.aircraft_icao_code} (ID: ${constraint.aircraft_type_id})`);
    });
    
    // 2. Get stands with compatible types attached
    const stands = await standCapacityService.fetchStands();
    console.log(`\nFetched ${stands.length} stands from service:`);
    
    // Count stands with compatibility data
    const standsWithCompatibility = stands.filter(stand => 
      stand.baseCompatibleAircraftTypeIDs && 
      stand.baseCompatibleAircraftTypeIDs.length > 0
    );
    
    console.log(`- Stands with compatible aircraft types: ${standsWithCompatibility.length}/${stands.length}`);
    
    // Log each stand's compatibility
    stands.forEach(stand => {
      const compatibleCount = stand.baseCompatibleAircraftTypeIDs ? 
        stand.baseCompatibleAircraftTypeIDs.length : 0;
      
      console.log(`- Stand ${stand.code} (ID: ${stand.id}): ${compatibleCount} compatible types: ${stand.baseCompatibleAircraftTypeIDs?.join(', ') || 'NONE'}`);
    });
    
    // 3. Get adapted models
    const aircraftTypes = await standCapacityService.fetchAircraftTypes();
    const operationalSettings = await standCapacityService.fetchOperationalSettings();
    
    console.log(`\nFetched ${aircraftTypes.length} aircraft types`);
    
    // 4. Adapt the data
    console.log('\nAdapting models for calculator:');
    const adaptedModels = standCapacityService.adaptForCalculation(
      stands, 
      aircraftTypes, 
      operationalSettings
    );
    
    // 5. Check the adapted stands
    console.log(`\nAdapted ${adaptedModels.stands.length} stands:`);
    adaptedModels.stands.forEach(stand => {
      console.log(`- Stand ${stand.standID}: ${stand.baseCompatibleAircraftTypeIDs?.length || 0} compatible types`);
      if (stand.baseCompatibleAircraftTypeIDs && stand.baseCompatibleAircraftTypeIDs.length > 0) {
        console.log(`  Types: ${stand.baseCompatibleAircraftTypeIDs.join(', ')}`);
      }
    });
    
    // 6. Check the adapted aircraft types
    console.log(`\nAdapted ${adaptedModels.aircraftTypes.length} aircraft types:`);
    adaptedModels.aircraftTypes.slice(0, 5).forEach(type => {
      console.log(`- ${type.aircraftTypeID} (Size: ${type.sizeCategory}): Turnaround ${type.averageTurnaroundMinutes} min`);
    });
    console.log(`  ... and ${adaptedModels.aircraftTypes.length - 5} more`);
    
    console.log('\nDEBUG DATA DUMP COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('Error in debug script:', error);
    process.exit(1);
  }
}

// Run the function
dumpStandModelData(); 