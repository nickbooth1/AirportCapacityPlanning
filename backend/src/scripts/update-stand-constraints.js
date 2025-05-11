/**
 * This script updates the stand-aircraft constraints to match 
 * the proper aircraft types that are already in the database
 */
const { db } = require('../utils/db');

async function updateStandConstraints() {
  try {
    console.log('Starting comprehensive stand constraints update...');
    
    // Get all aircraft types
    const aircraftTypes = await db('aircraft_types')
      .select('id', 'icao_code', 'iata_code', 'size_category_code')
      .where('is_active', true);
      
    if (aircraftTypes.length === 0) {
      console.error('No aircraft types found in database');
      process.exit(1);
    }
    
    console.log(`Found ${aircraftTypes.length} aircraft types`);
    
    // Get key aircraft types by size category for easier reference
    const typesBySize = {};
    aircraftTypes.forEach(type => {
      if (!typesBySize[type.size_category_code]) {
        typesBySize[type.size_category_code] = [];
      }
      typesBySize[type.size_category_code].push(type);
    });
    
    // Get all stands
    const stands = await db('stands')
      .select('id', 'code', 'name', 'max_aircraft_size_code')
      .where('is_active', true);
    
    if (stands.length === 0) {
      console.error('No stands found in the database');
      process.exit(1);
    }
    
    console.log(`Found ${stands.length} stands`);
    
    // Clear existing stand constraints
    console.log('Clearing existing stand constraints...');
    await db('stand_aircraft_constraints').del();
    
    // Create new constraints based on aircraft size category
    const constraints = [];
    
    stands.forEach(stand => {
      // Get the max aircraft size for this stand
      const maxSizeCode = stand.max_aircraft_size_code;
      
      // Map size codes A through F to numeric values for comparison
      const sizeValues = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6 };
      const maxSizeValue = sizeValues[maxSizeCode] || 3; // Default to C if unknown
      
      // Add compatible aircraft types for this stand
      // A stand can accommodate any aircraft of its max size or smaller
      for (const [sizeCode, sizeValue] of Object.entries(sizeValues)) {
        // If this size is less than or equal to max size for the stand
        if (sizeValue <= maxSizeValue) {
          // Get aircraft types of this size
          const typesOfThisSize = typesBySize[sizeCode] || [];
          
          // Add up to 2 aircraft types of this size as compatible with this stand
          typesOfThisSize.slice(0, 2).forEach(aircraftType => {
            constraints.push({
              stand_id: stand.id,
              aircraft_type_id: aircraftType.id,
              is_allowed: true,
              constraint_reason: null,
              created_at: new Date(),
              updated_at: new Date()
            });
            
            console.log(`Adding constraint: Stand ${stand.code} can accommodate ${aircraftType.icao_code || aircraftType.iata_code} (Size ${sizeCode})`);
          });
        }
      }
    });
    
    // Insert the constraints
    console.log(`Inserting ${constraints.length} new stand constraints...`);
    
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < constraints.length; i += batchSize) {
      const batch = constraints.slice(i, i + batchSize);
      await db('stand_aircraft_constraints').insert(batch);
      console.log(`Inserted batch ${i/batchSize + 1} of ${Math.ceil(constraints.length/batchSize)}`);
    }
    
    // Verify the constraints were added
    const count = await db('stand_aircraft_constraints').count('* as count').first();
    console.log(`Successfully added ${count.count} stand constraints`);
    
    console.log('Stand constraints update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating stand constraints:', error);
    process.exit(1);
  }
}

// Run the function
updateStandConstraints(); 