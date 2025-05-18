/**
 * Seed Test Data Script
 * 
 * This script establishes a consistent base dataset for testing the airport capacity planning system.
 * It creates necessary reference data for stands, airlines, aircraft types, and operational settings.
 * 
 * Usage: node scripts/seed-test-data.js
 */

const knex = require('../src/db');
const path = require('path');
const fs = require('fs');

async function seedTestData() {
  try {
    console.log('Starting test data seeding...');
    
    // Clear existing test data
    await clearExistingData();
    
    // Seed base airport configuration
    const baseAirportId = await seedBaseAirport();
    
    // Seed stands
    const standsData = await seedStands();
    
    // Seed aircraft types
    const aircraftTypes = await seedAircraftTypes();
    
    // Seed airlines
    const airlines = await seedAirlines();
    
    // Seed operational settings
    const operationalSettings = await seedOperationalSettings();

    // Seed maintenance requests (for some stands)
    const maintenanceRequests = await seedMaintenanceRequests(standsData);
    
    console.log('Test data seeding completed successfully');
    
    return {
      success: true,
      baseAirportId,
      standsCount: standsData.length,
      aircraftTypesCount: aircraftTypes.length,
      airlinesCount: airlines.length,
      maintenanceRequestsCount: maintenanceRequests.length
    };
  } catch (error) {
    console.error('Error seeding test data:', error);
    return { success: false, error: error.message };
  } finally {
    await knex.destroy();
  }
}

/**
 * Clear existing test data
 */
async function clearExistingData() {
  console.log('Clearing existing test data...');
  
  // Disable foreign key checks
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  
  // Clear tables in reverse dependency order
  await knex('stand_maintenance_requests').truncate();
  await knex('stand_allocations').truncate();
  await knex('unallocated_flights').truncate();
  await knex('stand_utilization_metrics').truncate();
  await knex('allocation_issues').truncate();
  await knex('flight_schedules').truncate();
  await knex('flights').truncate();
  await knex('flight_uploads').truncate();
  await knex('stands').truncate();
  await knex('airlines').truncate();
  await knex('aircraft_types').truncate();
  await knex('operational_settings').truncate();
  
  // Re-enable foreign key checks
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('Existing test data cleared');
}

/**
 * Seed base airport configuration
 */
async function seedBaseAirport() {
  console.log('Seeding base airport configuration...');
  
  // Create or update airport configuration
  const airport = {
    iata_code: 'LHR',
    name: 'London Heathrow Airport',
    timezone: 'Europe/London',
    coordinates: JSON.stringify({ latitude: 51.4700, longitude: -0.4543 }),
    operating_hours: JSON.stringify({ start: '06:00', end: '23:00' }),
    terminals: JSON.stringify(['T1', 'T2', 'T3', 'T4', 'T5']),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Check if airport already exists
  const existingAirport = await knex('airports').where('iata_code', airport.iata_code).first();
  
  let airportId;
  
  if (existingAirport) {
    // Update existing
    await knex('airports').where('id', existingAirport.id).update({
      ...airport,
      updated_at: new Date()
    });
    airportId = existingAirport.id;
  } else {
    // Insert new
    const result = await knex('airports').insert(airport).returning('id');
    airportId = result[0].id;
  }
  
  console.log(`Base airport configured with ID: ${airportId}`);
  return airportId;
}

/**
 * Seed stands data
 */
async function seedStands() {
  console.log('Seeding stands data...');
  
  // Define stands with varying capabilities
  const stands = [
    // Terminal 1 stands
    { code: 'T1-01', name: 'T1-01', terminal: 'T1', is_contact_stand: true, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T1-02']), is_active: true },
    { code: 'T1-02', name: 'T1-02', terminal: 'T1', is_contact_stand: true, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T1-01', 'T1-03']), is_active: true },
    { code: 'T1-03', name: 'T1-03', terminal: 'T1', is_contact_stand: true, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T1-02']), is_active: true },
    { code: 'T1-R1', name: 'T1-R1', terminal: 'T1', is_contact_stand: false, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T1-R2']), is_active: true },
    { code: 'T1-R2', name: 'T1-R2', terminal: 'T1', is_contact_stand: false, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T1-R1']), is_active: true },
    
    // Terminal 2 stands
    { code: 'T2-01', name: 'T2-01', terminal: 'T2', is_contact_stand: true, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T2-02']), is_active: true },
    { code: 'T2-02', name: 'T2-02', terminal: 'T2', is_contact_stand: true, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T2-01', 'T2-03']), is_active: true },
    { code: 'T2-03', name: 'T2-03', terminal: 'T2', is_contact_stand: true, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T2-02']), is_active: true },
    { code: 'T2-R1', name: 'T2-R1', terminal: 'T2', is_contact_stand: false, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T2-R2']), is_active: true },
    { code: 'T2-R2', name: 'T2-R2', terminal: 'T2', is_contact_stand: false, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T2-R1']), is_active: true },
    
    // Terminal 3 stands
    { code: 'T3-01', name: 'T3-01', terminal: 'T3', is_contact_stand: true, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T3-02']), is_active: true },
    { code: 'T3-02', name: 'T3-02', terminal: 'T3', is_contact_stand: true, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T3-01', 'T3-03']), is_active: true },
    { code: 'T3-03', name: 'T3-03', terminal: 'T3', is_contact_stand: true, max_aircraft_size_code: 'F', adjacent_stands: JSON.stringify(['T3-02']), is_active: true },
    { code: 'T3-R1', name: 'T3-R1', terminal: 'T3', is_contact_stand: false, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T3-R2']), is_active: true },
    { code: 'T3-R2', name: 'T3-R2', terminal: 'T3', is_contact_stand: false, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T3-R1']), is_active: true },
    
    // Terminal 4 stands - wide body focused
    { code: 'T4-01', name: 'T4-01', terminal: 'T4', is_contact_stand: true, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T4-02']), is_active: true },
    { code: 'T4-02', name: 'T4-02', terminal: 'T4', is_contact_stand: true, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T4-01', 'T4-03']), is_active: true },
    { code: 'T4-03', name: 'T4-03', terminal: 'T4', is_contact_stand: true, max_aircraft_size_code: 'F', adjacent_stands: JSON.stringify(['T4-02']), is_active: true },
    { code: 'T4-R1', name: 'T4-R1', terminal: 'T4', is_contact_stand: false, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T4-R2']), is_active: true },
    { code: 'T4-R2', name: 'T4-R2', terminal: 'T4', is_contact_stand: false, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T4-R1']), is_active: true },
    
    // Terminal 5 stands - BA focused
    { code: 'T5-01', name: 'T5-01', terminal: 'T5', is_contact_stand: true, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T5-02']), is_active: true },
    { code: 'T5-02', name: 'T5-02', terminal: 'T5', is_contact_stand: true, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T5-01', 'T5-03']), is_active: true },
    { code: 'T5-03', name: 'T5-03', terminal: 'T5', is_contact_stand: true, max_aircraft_size_code: 'E', adjacent_stands: JSON.stringify(['T5-02']), is_active: true },
    { code: 'T5-R1', name: 'T5-R1', terminal: 'T5', is_contact_stand: false, max_aircraft_size_code: 'C', adjacent_stands: JSON.stringify(['T5-R2']), is_active: true },
    { code: 'T5-R2', name: 'T5-R2', terminal: 'T5', is_contact_stand: false, max_aircraft_size_code: 'D', adjacent_stands: JSON.stringify(['T5-R1']), is_active: true },
  ];
  
  // Insert stands
  const standIds = await knex('stands').insert(stands.map(stand => ({
    ...stand,
    created_at: new Date(),
    updated_at: new Date()
  }))).returning('id');
  
  // Map stand IDs to stand objects
  const standsWithIds = stands.map((stand, index) => ({
    ...stand,
    id: standIds[index].id
  }));
  
  console.log(`Seeded ${standsWithIds.length} stands`);
  return standsWithIds;
}

/**
 * Seed aircraft types data
 */
async function seedAircraftTypes() {
  console.log('Seeding aircraft types data...');
  
  // Define aircraft types with varying sizes
  const aircraftTypes = [
    { iata_code: '320', name: 'Airbus A320', size_category: 'C', default_turnaround_minutes: 30, seat_capacity: 180, is_active: true },
    { iata_code: '321', name: 'Airbus A321', size_category: 'C', default_turnaround_minutes: 35, seat_capacity: 200, is_active: true },
    { iata_code: '330', name: 'Airbus A330', size_category: 'D', default_turnaround_minutes: 45, seat_capacity: 270, is_active: true },
    { iata_code: '350', name: 'Airbus A350', size_category: 'E', default_turnaround_minutes: 50, seat_capacity: 280, is_active: true },
    { iata_code: '380', name: 'Airbus A380', size_category: 'F', default_turnaround_minutes: 60, seat_capacity: 500, is_active: true },
    { iata_code: '787', name: 'Boeing 787', size_category: 'E', default_turnaround_minutes: 45, seat_capacity: 250, is_active: true },
    { iata_code: '777', name: 'Boeing 777', size_category: 'E', default_turnaround_minutes: 50, seat_capacity: 300, is_active: true },
    { iata_code: '738', name: 'Boeing 737-800', size_category: 'C', default_turnaround_minutes: 30, seat_capacity: 170, is_active: true },
    { iata_code: '739', name: 'Boeing 737-900', size_category: 'C', default_turnaround_minutes: 35, seat_capacity: 190, is_active: true },
    { iata_code: '763', name: 'Boeing 767-300', size_category: 'D', default_turnaround_minutes: 45, seat_capacity: 220, is_active: true },
    { iata_code: '744', name: 'Boeing 747-400', size_category: 'E', default_turnaround_minutes: 55, seat_capacity: 350, is_active: true },
    { iata_code: '772', name: 'Boeing 777-200', size_category: 'E', default_turnaround_minutes: 50, seat_capacity: 280, is_active: true },
    { iata_code: '77W', name: 'Boeing 777-300ER', size_category: 'E', default_turnaround_minutes: 55, seat_capacity: 320, is_active: true },
    { iata_code: 'E90', name: 'Embraer E190', size_category: 'C', default_turnaround_minutes: 25, seat_capacity: 100, is_active: true },
    { iata_code: 'E95', name: 'Embraer E195', size_category: 'C', default_turnaround_minutes: 25, seat_capacity: 120, is_active: true }
  ];
  
  // Insert aircraft types
  const aircraftTypeIds = await knex('aircraft_types').insert(aircraftTypes.map(type => ({
    ...type,
    created_at: new Date(),
    updated_at: new Date()
  }))).returning('id');
  
  // Map aircraft type IDs to aircraft type objects
  const aircraftTypesWithIds = aircraftTypes.map((type, index) => ({
    ...type,
    id: aircraftTypeIds[index].id
  }));
  
  console.log(`Seeded ${aircraftTypesWithIds.length} aircraft types`);
  return aircraftTypesWithIds;
}

/**
 * Seed airlines data
 */
async function seedAirlines() {
  console.log('Seeding airlines data...');
  
  // Define airlines with varying preferences
  const airlines = [
    { iata_code: 'BA', name: 'British Airways', base_terminal: 'T5', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'LH', name: 'Lufthansa', base_terminal: 'T2', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'AF', name: 'Air France', base_terminal: 'T4', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'EK', name: 'Emirates', base_terminal: 'T3', requires_contact_stand: true, priority_tier: 3, is_active: true },
    { iata_code: 'QF', name: 'Qantas', base_terminal: 'T3', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'SQ', name: 'Singapore Airlines', base_terminal: 'T3', requires_contact_stand: true, priority_tier: 3, is_active: true },
    { iata_code: 'UA', name: 'United Airlines', base_terminal: 'T2', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'AA', name: 'American Airlines', base_terminal: 'T2', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'DL', name: 'Delta Air Lines', base_terminal: 'T3', requires_contact_stand: true, priority_tier: 2, is_active: true },
    { iata_code: 'U2', name: 'easyJet', base_terminal: 'T1', requires_contact_stand: false, priority_tier: 1, is_active: true },
    { iata_code: 'FR', name: 'Ryanair', base_terminal: 'T1', requires_contact_stand: false, priority_tier: 1, is_active: true },
    { iata_code: 'W6', name: 'Wizz Air', base_terminal: 'T1', requires_contact_stand: false, priority_tier: 1, is_active: true }
  ];
  
  // Insert airlines
  const airlineIds = await knex('airlines').insert(airlines.map(airline => ({
    ...airline,
    created_at: new Date(),
    updated_at: new Date()
  }))).returning('id');
  
  // Map airline IDs to airline objects
  const airlinesWithIds = airlines.map((airline, index) => ({
    ...airline,
    id: airlineIds[index].id
  }));
  
  console.log(`Seeded ${airlinesWithIds.length} airlines`);
  return airlinesWithIds;
}

/**
 * Seed operational settings
 */
async function seedOperationalSettings() {
  console.log('Seeding operational settings...');
  
  // Define operational settings
  const operationalSettings = {
    name: 'default',
    gap_between_flights_minutes: 15,
    default_turnaround_times: JSON.stringify({
      "Default": 45,
      "C": 30, // Narrow body
      "D": 45, // Medium wide body
      "E": 50, // Wide body
      "F": 60  // Super wide body
    }),
    prioritization_weights: JSON.stringify({
      "aircraft_type_A380": 10.0,
      "aircraft_type_B747": 8.0,
      "airline_tier": 2.0,
      "requires_contact_stand": 3.0,
      "critical_connection": 5.0,
      "base_score": 1.0
    }),
    solver_parameters: JSON.stringify({
      "use_solver": true,
      "solver_time_limit_seconds": 30,
      "optimality_gap": 0.05,
      "max_solutions": 1
    }),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Insert or update operational settings
  const existingSettings = await knex('operational_settings').where('name', 'default').first();
  
  if (existingSettings) {
    await knex('operational_settings').where('id', existingSettings.id).update({
      ...operationalSettings,
      updated_at: new Date()
    });
    console.log(`Updated operational settings with ID: ${existingSettings.id}`);
    return existingSettings.id;
  } else {
    const result = await knex('operational_settings').insert(operationalSettings).returning('id');
    console.log(`Created operational settings with ID: ${result[0].id}`);
    return result[0].id;
  }
}

/**
 * Seed maintenance requests for some stands
 */
async function seedMaintenanceRequests(stands) {
  console.log('Seeding maintenance requests...');
  
  // Find stand IDs for maintenance
  const standForMaintenance1 = stands.find(stand => stand.code === 'T2-02');
  const standForMaintenance2 = stands.find(stand => stand.code === 'T3-03');
  const standForMaintenance3 = stands.find(stand => stand.code === 'T5-01');
  
  if (!standForMaintenance1 || !standForMaintenance2 || !standForMaintenance3) {
    console.warn('Could not find stands for maintenance');
    return [];
  }
  
  // Get tomorrow's date for maintenance
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // Define maintenance requests
  const maintenanceRequests = [
    {
      stand_id: standForMaintenance1.id,
      start_time: `${tomorrowStr}T09:00:00`,
      end_time: `${tomorrowStr}T12:00:00`,
      reason: 'Scheduled maintenance',
      status: 'approved',
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      stand_id: standForMaintenance2.id,
      start_time: `${tomorrowStr}T14:00:00`,
      end_time: `${tomorrowStr}T18:00:00`,
      reason: 'Equipment replacement',
      status: 'approved',
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      stand_id: standForMaintenance3.id,
      start_time: `${tomorrowStr}T06:00:00`,
      end_time: `${tomorrowStr}T10:00:00`,
      reason: 'Jet bridge repair',
      status: 'approved',
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  // Insert maintenance requests
  const maintenanceRequestIds = await knex('stand_maintenance_requests').insert(maintenanceRequests).returning('id');
  
  console.log(`Seeded ${maintenanceRequestIds.length} maintenance requests`);
  return maintenanceRequestIds;
}

// Execute if script is run directly
if (require.main === module) {
  seedTestData()
    .then(result => {
      console.log('Script execution completed', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTestData }; 