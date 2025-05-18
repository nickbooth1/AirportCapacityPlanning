/**
 * Flight Injection Script
 * 
 * This script directly inserts test flight data with proper airline codes, 
 * flight numbers, and aircraft types into the database, bypassing the upload process.
 * 
 * Usage: node inject-test-flights.js
 */

const knex = require('./src/db');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    console.log('Starting flight injection script...');
    
    // Create upload record - using correct field names from the database schema
    const result = await knex('flight_uploads').insert({
      filename: 'direct-injection-test.csv',
      file_path: '/tmp/direct-injection-test.csv',
      file_size: 1024,
      upload_status: 'completed',
      processing_status: 'completed',
      validation_status: 'completed',
      total_records: 10,
      imported_records: 10,
      completed_at: new Date(),
      has_been_mapped: true,
      display_name: 'Direct Injection Test Upload',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    // Extract the ID properly - getting the id property from the object
    const uploadId = result[0].id;
    
    console.log(`Created upload record with ID: ${uploadId}`);
    
    // Test flight data with valid airline codes and aircraft types
    const flights = [
      // British Airways flights
      {
        airline_iata: 'BA',
        flight_number: 'BA123',
        scheduled_datetime: new Date('2025-05-20T08:30:00Z'),
        estimated_datetime: new Date('2025-05-20T08:35:00Z'),
        flight_nature: 'A', // Arrival
        origin_destination_iata: 'JFK',
        aircraft_type_iata: '777',
        terminal: 'T5',
        seat_capacity: 300,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      {
        airline_iata: 'BA',
        flight_number: 'BA456',
        scheduled_datetime: new Date('2025-05-20T10:15:00Z'),
        estimated_datetime: new Date('2025-05-20T10:20:00Z'),
        flight_nature: 'D', // Departure
        origin_destination_iata: 'LAX',
        aircraft_type_iata: '787',
        terminal: 'T5',
        seat_capacity: 250,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      
      // Lufthansa flights
      {
        airline_iata: 'LH',
        flight_number: 'LH970',
        scheduled_datetime: new Date('2025-05-20T09:00:00Z'),
        estimated_datetime: new Date('2025-05-20T09:10:00Z'),
        flight_nature: 'A', // Arrival
        origin_destination_iata: 'FRA',
        aircraft_type_iata: 'A320',
        terminal: 'T2',
        seat_capacity: 180,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      {
        airline_iata: 'LH',
        flight_number: 'LH971',
        scheduled_datetime: new Date('2025-05-20T11:30:00Z'),
        estimated_datetime: new Date('2025-05-20T11:35:00Z'),
        flight_nature: 'D', // Departure
        origin_destination_iata: 'FRA',
        aircraft_type_iata: 'A320',
        terminal: 'T2',
        seat_capacity: 180,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      
      // Air France flights
      {
        airline_iata: 'AF',
        flight_number: 'AF1680',
        scheduled_datetime: new Date('2025-05-20T10:45:00Z'),
        estimated_datetime: new Date('2025-05-20T10:50:00Z'),
        flight_nature: 'A', // Arrival
        origin_destination_iata: 'CDG',
        aircraft_type_iata: 'A330',
        terminal: 'T4',
        seat_capacity: 220,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      {
        airline_iata: 'AF',
        flight_number: 'AF1681',
        scheduled_datetime: new Date('2025-05-20T12:15:00Z'),
        estimated_datetime: new Date('2025-05-20T12:20:00Z'),
        flight_nature: 'D', // Departure
        origin_destination_iata: 'CDG',
        aircraft_type_iata: 'A330',
        terminal: 'T4',
        seat_capacity: 220,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      
      // Emirates flights
      {
        airline_iata: 'EK',
        flight_number: 'EK007',
        scheduled_datetime: new Date('2025-05-20T13:30:00Z'),
        estimated_datetime: new Date('2025-05-20T13:40:00Z'),
        flight_nature: 'A', // Arrival
        origin_destination_iata: 'DXB',
        aircraft_type_iata: 'A380',
        terminal: 'T3',
        seat_capacity: 489,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      {
        airline_iata: 'EK',
        flight_number: 'EK008',
        scheduled_datetime: new Date('2025-05-20T15:45:00Z'),
        estimated_datetime: new Date('2025-05-20T15:50:00Z'),
        flight_nature: 'D', // Departure
        origin_destination_iata: 'DXB',
        aircraft_type_iata: 'A380',
        terminal: 'T3',
        seat_capacity: 489,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      
      // Qantas flights
      {
        airline_iata: 'QF',
        flight_number: 'QF1',
        scheduled_datetime: new Date('2025-05-20T05:25:00Z'),
        estimated_datetime: new Date('2025-05-20T05:30:00Z'),
        flight_nature: 'A', // Arrival
        origin_destination_iata: 'SYD',
        aircraft_type_iata: 'B747',
        terminal: 'T3',
        seat_capacity: 364,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      },
      {
        airline_iata: 'QF',
        flight_number: 'QF2',
        scheduled_datetime: new Date('2025-05-20T21:10:00Z'),
        estimated_datetime: new Date('2025-05-20T21:15:00Z'),
        flight_nature: 'D', // Departure
        origin_destination_iata: 'SYD',
        aircraft_type_iata: 'B747',
        terminal: 'T3',
        seat_capacity: 364,
        upload_id: uploadId,
        validation_status: 'valid',
        is_approved: true
      }
    ];
    
    // Debug
    console.log('Upload ID type:', typeof uploadId);
    console.log('Upload ID value:', uploadId);
    
    // Insert all flights
    const insertedIds = await knex('flights').insert(flights).returning('id');
    
    console.log(`Successfully inserted ${insertedIds.length} flights with IDs: ${insertedIds.join(', ')}`);
    
    // Update upload status
    await knex('flight_uploads')
      .where('id', uploadId)
      .update({
        upload_status: 'completed',
        total_records: insertedIds.length,
        imported_records: insertedIds.length,
        updated_at: new Date()
      });
    
    console.log(`Upload ${uploadId} status updated to 'completed' with ${insertedIds.length} records`);
    console.log('Flight injection completed successfully!');
    console.log('Now you can process this upload by sending a POST request to:');
    console.log(`/api/flight-schedules/process/${uploadId}`);
    
    return { success: true, uploadId, flightCount: insertedIds.length };
  } catch (error) {
    console.error('Error injecting test flights:', error);
    throw error;
  } finally {
    // Close database connection
    await knex.destroy();
  }
}

// Execute if this script is run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('Script executed successfully!', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { main }; 