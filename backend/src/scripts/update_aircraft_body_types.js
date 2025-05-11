/**
 * Script to update aircraft_types with body_type values
 * 
 * This script populates the new body_type column in the aircraft_types table
 * based on size categories and specific aircraft codes.
 */

const db = require('../utils/db');

async function updateAircraftBodyTypes() {
  try {
    console.log('Starting aircraft body type update...');
    
    // First update based on size category code
    console.log('Updating based on size category...');
    await db('aircraft_types')
      .update({ body_type: 'narrow' })
      .whereIn('size_category_code', ['A', 'B', 'C']);
    
    await db('aircraft_types')
      .update({ body_type: 'wide' })
      .whereIn('size_category_code', ['D', 'E', 'F']);
    
    // Then update specific aircraft types that may need manual classification
    console.log('Updating specific wide-body aircraft...');
    await db('aircraft_types')
      .update({ body_type: 'wide' })
      .whereIn('icao_code', [
        'A332', 'A333', 'A339', 'A338', // Airbus A330 series
        'A359', 'A35K',                 // Airbus A350 series
        'A388',                         // Airbus A380
        'B762', 'B763', 'B764',         // Boeing 767 series
        'B772', 'B773', 'B77L', 'B77W', // Boeing 777 series
        'B788', 'B789', 'B78X'          // Boeing 787 series
      ]);
    
    console.log('Updating specific narrow-body aircraft...');
    await db('aircraft_types')
      .update({ body_type: 'narrow' })
      .whereIn('icao_code', [
        'A318', 'A319', 'A320', 'A321', // Airbus A320 family
        'A221', 'A223',                 // Airbus A220 series
        'B735', 'B736', 'B737', 'B738', 'B739', // Boeing 737 classic/NG
        'B37M', 'B38M', 'B39M',         // Boeing 737 MAX
        'B752', 'B753',                 // Boeing 757 series
        'E170', 'E75L', 'E190', 'E195', // Embraer E-jets
        'AT45', 'AT75',                 // ATR 42/72
        'DH8D',                         // Dash 8
        'CRJ7', 'CRJ9', 'CRJX',         // CRJ series
        'SF34', 'C30J'                  // Other regional aircraft
      ]);
    
    // Set default values for any remaining NULL body_type values
    console.log('Checking for NULL values...');
    const nullRecords = await db('aircraft_types')
      .whereNull('body_type')
      .count('* as count')
      .first();
    
    if (parseInt(nullRecords.count) > 0) {
      console.warn(`Warning: ${nullRecords.count} aircraft types still have NULL body_type values.`);
      console.log('Setting these to "unknown" as default...');
      await db('aircraft_types')
        .update({ body_type: 'unknown' })
        .whereNull('body_type');
    }
    
    // Note: Instead of using alterTable to add NOT NULL constraint, we'll use a separate
    // migration file for that if needed
    
    console.log('Aircraft body type update completed successfully!');
    
    // Count the number of aircraft in each category
    const narrowCount = await db('aircraft_types')
      .where('body_type', 'narrow')
      .count('* as count')
      .first();
    
    const wideCount = await db('aircraft_types')
      .where('body_type', 'wide')
      .count('* as count')
      .first();
    
    const unknownCount = await db('aircraft_types')
      .where('body_type', 'unknown')
      .count('* as count')
      .first();
    
    console.log(`Summary:`);
    console.log(`- Narrow-body aircraft: ${narrowCount.count}`);
    console.log(`- Wide-body aircraft: ${wideCount.count}`);
    console.log(`- Unknown body type: ${unknownCount.count}`);
    
  } catch (error) {
    console.error('Error updating aircraft body types:', error);
  } finally {
    process.exit();
  }
}

// Run the update
updateAircraftBodyTypes(); 