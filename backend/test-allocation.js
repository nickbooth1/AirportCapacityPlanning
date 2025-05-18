/**
 * Test Stand Allocation Process
 * 
 * This script tests the stand allocation process directly on an existing upload.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import required services
const FlightProcessorService = require('./src/services/FlightProcessorService');
const db = require('./src/db');

async function main() {
  try {
    console.log('==== STAND ALLOCATION TEST ====');
    
    // Create an instance of the FlightProcessorService
    const flightProcessor = new FlightProcessorService();
    
    // Get the most recent upload ID from the database
    const latestUpload = await db('flight_uploads')
      .orderBy('id', 'desc')
      .first();
    
    if (!latestUpload) {
      console.error('No uploads found. Please upload a flight schedule first.');
      process.exit(1);
    }
    
    console.log(`Latest upload found: ID=${latestUpload.id}, File=${latestUpload.file_name}`);
    
    // Get the most recent flight schedule
    const latestSchedule = await db('flight_schedules')
      .orderBy('id', 'desc')
      .first();
    
    console.log(latestSchedule ? 
      `Latest schedule: ID=${latestSchedule.id}, Status=${latestSchedule.status}` : 
      'No existing schedules found');
    
    // Process the upload
    console.log(`Processing upload ID: ${latestUpload.id}`);
    
    const result = await flightProcessor.processFlightSchedule(latestUpload.id, {
      skipValidation: false,
      skipAllocation: false
    });
    
    console.log('Processing completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Check if allocations were created
    if (result.scheduleId) {
      const allocations = await db('stand_allocations')
        .where('schedule_id', result.scheduleId)
        .count('id as count')
        .first();
      
      console.log(`Allocations in database: ${allocations.count}`);
      
      if (allocations.count > 0) {
        // Get a sample allocation
        const sampleAllocation = await db('stand_allocations')
          .where('schedule_id', result.scheduleId)
          .join('flights', 'stand_allocations.flight_id', 'flights.id')
          .join('stands', 'stand_allocations.stand_id', 'stands.id')
          .select(
            'stand_allocations.*',
            'flights.flight_number',
            'flights.airline_iata',
            'flights.flight_nature',
            'stands.name as stand_name',
            'stands.terminal'
          )
          .first();
        
        console.log('Sample allocation:', JSON.stringify(sampleAllocation, null, 2));
      }
      
      // Check unallocated flights
      const unallocated = await db('unallocated_flights')
        .where('schedule_id', result.scheduleId)
        .count('id as count')
        .first();
      
      console.log(`Unallocated flights in database: ${unallocated.count}`);
      
      if (unallocated.count > 0) {
        // Get a sample unallocated flight
        const sampleUnallocated = await db('unallocated_flights')
          .where('schedule_id', result.scheduleId)
          .join('flights', 'unallocated_flights.flight_id', 'flights.id')
          .select(
            'unallocated_flights.*',
            'flights.flight_number',
            'flights.airline_iata',
            'flights.flight_nature'
          )
          .first();
        
        console.log('Sample unallocated flight:', JSON.stringify(sampleUnallocated, null, 2));
      }
    }
  } catch (error) {
    console.error('Error running stand allocation test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the database connection
    try {
      await db.destroy();
      console.log('Database connection closed');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the main function
main(); 