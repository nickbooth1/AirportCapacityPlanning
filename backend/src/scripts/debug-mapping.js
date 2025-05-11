const { db } = require('../utils/db');

// Just do a simple fetch of db stand constraints and render them in the aircraftType code format
async function main() {
  // Get the constraints
  const constraints = await db('stand_aircraft_constraints')
    .select('stand_id', 'aircraft_type_id')
    .limit(10);
  
  // Get aircraft types
  const types = await db('aircraft_types')
    .select('id', 'icao_code', 'iata_code');
  
  // Create mapping
  const typeIdToCode = {};
  types.forEach(type => {
    typeIdToCode[type.id] = type.icao_code || type.iata_code;
  });
  
  // Convert constraints
  const mappedConstraints = constraints.map(c => ({
    stand_id: c.stand_id,
    db_aircraft_id: c.aircraft_type_id,
    aircraft_code: typeIdToCode[c.aircraft_type_id]
  }));
  
  console.log('DB ID to ICAO/IATA code mapping:');
  console.log(JSON.stringify(mappedConstraints, null, 2));
}

main().catch(console.error); 