#!/usr/bin/env node

/**
 * Live CLI interface for the Capacity Impact Analyzer
 * This script connects to live data sources instead of using mock files.
 */

const path = require('path');
const fs = require('fs');
const { calculateDailyImpacts } = require('./analyzer');
const db = require('../../utils/db'); // Database utility

// Import services with correct paths
const StandCapacityToolService = require('../../services/standCapacity/StandCapacityToolService'); 
const MaintenanceRequestService = require('../../services/maintenance/MaintenanceRequestService');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    outputFile: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--startDate' && i + 1 < args.length) {
      options.startDate = args[++i];
    } else if (arg === '--endDate' && i + 1 < args.length) {
      options.endDate = args[++i];
    } else if (arg === '--outputFile' && i + 1 < args.length) {
      options.outputFile = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  
  return options;
}

// Print usage instructions
function printUsage() {
  console.log(`
Usage: node live_cli.js --startDate YYYY-MM-DD --endDate YYYY-MM-DD [options]

Options:
  --startDate YYYY-MM-DD    Start date for the analysis (required)
  --endDate YYYY-MM-DD      End date for the analysis (required)
  --outputFile PATH         File to save output (default: prints to console)
  --help, -h                Show this help message
`);
}

// Load live data from services and database
async function loadLiveData(options) {
  try {
    // Initialize services
    const standCapacityToolService = new StandCapacityToolService();
    const maintenanceRequestService = new MaintenanceRequestService();
    
    // 1. Get stand capacity data
    console.log('Fetching stand capacity data...');
    const capacityData = await standCapacityToolService.calculateCapacity({ 
      useDefinedTimeSlots: false
    });
    
    // Extract and format daily capacity template from capacity data
    const dailyGrossCapacityTemplate = {
      timeSlots: capacityData.timeSlots.map(slot => ({
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime
      })),
      bestCaseCapacity: {} 
    };
    
    // Format best case capacity data
    capacityData.timeSlots.forEach(slot => {
      dailyGrossCapacityTemplate.bestCaseCapacity[slot.label] = {};
      slot.capacities.forEach(capacity => {
        dailyGrossCapacityTemplate.bestCaseCapacity[slot.label][capacity.aircraftTypeICAO] = capacity.count;
      });
    });
    
    // 2. Get all maintenance requests
    console.log('Fetching maintenance requests...');
    const maintenanceStatusIdsToInclude = {
      definite: [2, 4, 5], // Approved, In Progress, Completed
      potential: [1]       // Requested
    };
    
    const allMaintenanceRequests = await maintenanceRequestService.getAllRequests({
      startDate: options.startDate,
      endDate: options.endDate,
      statusIds: [...maintenanceStatusIdsToInclude.definite, ...maintenanceStatusIdsToInclude.potential]
    });
    
    // Transform maintenance requests to expected format if needed
    const formattedMaintenanceRequests = allMaintenanceRequests.map(req => ({
      id: req.id,
      stand_id_or_code: req.stand_code || req.stand_id,
      title: req.title,
      description: req.description,
      status_id: req.status_id,
      statusName: req.statusName,
      start_datetime: req.start_datetime,
      end_datetime: req.end_datetime
    }));
    
    // 3. Get all stands
    console.log('Fetching stands data...');
    const standsData = await db.select('*').from('stands').where('is_active', true);
    
    // 4. Get all aircraft types
    console.log('Fetching aircraft types data...');
    const aircraftTypesData = await db.select('*').from('aircraft_types').where('is_active', true);
    
    // Get stand aircraft constraints
    const standConstraints = await db.select('*').from('stand_aircraft_constraints');
    
    // Create a map of stand_id to compatible aircraft types
    const standConstraintsMap = new Map();
    for (const constraint of standConstraints) {
      if (!standConstraintsMap.has(constraint.stand_id)) {
        standConstraintsMap.set(constraint.stand_id, []);
      }
      standConstraintsMap.get(constraint.stand_id).push(constraint.aircraft_type_icao);
    }
    
    // Format stands data - process them synchronously to avoid async issues
    const stands = [];
    for (const stand of standsData) {
      // Get compatible aircraft types from constraints or use size category fallback
      let compatibleAircraftICAOs = standConstraintsMap.get(stand.id) || [];
      
      // If no specific constraints, use max_aircraft_size_code
      if (compatibleAircraftICAOs.length === 0 && stand.max_aircraft_size_code) {
        // Determine compatible aircraft types based on max_aircraft_size_code
        compatibleAircraftICAOs = determineCompatibleAircraftTypes(stand.max_aircraft_size_code, aircraftTypesData);
      }
      
      stands.push({
        code: stand.code,
        dbId: stand.id,
        compatibleAircraftICAOs
      });
    }
    
    // Format aircraft types data
    const aircraftTypes = aircraftTypesData.map(type => ({
      icao_code: type.icao_code,
      size_category_code: type.size_category_code,
      averageTurnaroundMinutes: type.average_turnaround_minutes || 45, // Default if not available
      bodyType: type.body_type || getBodyType(type.size_category_code)
    }));
    
    // 5. Get operational settings
    console.log('Fetching operational settings...');
    const opSettingsData = await db.select('*').from('operational_settings').first();
    
    const opSettings = {
      default_gap_minutes: opSettingsData?.default_gap_minutes || 15,
      slot_duration_minutes: opSettingsData?.slot_duration_minutes || 60,
      operating_start_time: opSettingsData?.operating_start_time || '06:00:00',
      operating_end_time: opSettingsData?.operating_end_time || '22:00:00'
    };
    
    // 6. Get maintenance status types
    console.log('Fetching maintenance status types...');
    const statusTypes = await db.select('*').from('maintenance_status_types');
    
    return {
      dailyGrossCapacityTemplate,
      allMaintenanceRequests: formattedMaintenanceRequests,
      stands,
      aircraftTypes,
      opSettings,
      statusTypes
    };
  } catch (error) {
    console.error(`Error loading live data: ${error.message}`);
    throw error;
  }
}

// Determine compatible aircraft types based on max aircraft size code
function determineCompatibleAircraftTypes(maxSizeCode, aircraftTypesData) {
  // If no size code specified or invalid, return empty array
  if (!maxSizeCode || typeof maxSizeCode !== 'string') {
    console.warn('Invalid aircraft size code:', maxSizeCode);
    return [];
  }
  
  // Normalize the size code (uppercase and trim)
  const normalizedSizeCode = maxSizeCode.trim().toUpperCase();
  
  // Size order from smallest to largest
  const sizeOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Get the index of the max size code
  const maxIndex = sizeOrder.indexOf(normalizedSizeCode);
  
  if (maxIndex === -1) {
    console.warn('Unknown aircraft size category:', normalizedSizeCode);
    return []; // Invalid size code
  }
  
  // Get compatible size codes
  const compatibleSizes = sizeOrder.slice(0, maxIndex + 1);
  
  // Find all aircraft types with compatible size codes
  return aircraftTypesData
    .filter(type => compatibleSizes.includes(type.size_category_code.toUpperCase()))
    .map(type => type.icao_code);
}

// Helper function to get body type from size category
function getBodyType(sizeCategoryCode) {
  const code = sizeCategoryCode ? sizeCategoryCode.toUpperCase() : '';
  if (['E', 'F'].includes(code)) {
    return 'wideBody';
  }
  return 'narrowBody';
}

// Validate date format (YYYY-MM-DD)
function isValidDateFormat(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Main function
async function main() {
  // Parse command line arguments
  const options = parseArgs();
  
  // Validate required arguments
  if (!options.startDate || !options.endDate) {
    console.error('Error: --startDate and --endDate are required');
    printUsage();
    process.exit(1);
  }
  
  // Validate date formats
  if (!isValidDateFormat(options.startDate) || !isValidDateFormat(options.endDate)) {
    console.error('Error: dates must be in YYYY-MM-DD format');
    process.exit(1);
  }
  
  // Ensure start date is not after end date
  if (new Date(options.startDate) > new Date(options.endDate)) {
    console.error('Error: startDate cannot be after endDate');
    process.exit(1);
  }
  
  try {
    // Test database connection - this will throw if DB is not accessible
    await db.testConnection();
    console.log('Database connection verified successfully');
    
    // Load live data
    console.log('Loading live data from database and services...');
    const liveData = await loadLiveData(options);
    
    // Define maintenance status IDs to include in the analysis
    const maintenanceStatusIdsToInclude = {
      definite: [2, 4, 5], // Approved, In Progress, Completed
      potential: [1]       // Requested
    };
    
    // Call the analyzer with options and live data
    console.log(`Analyzing capacity impact from ${options.startDate} to ${options.endDate}...`);
    const results = calculateDailyImpacts(
      { 
        startDate: options.startDate, 
        endDate: options.endDate,
        maintenanceStatusIdsToInclude
      }, 
      liveData
    );
    
    // Handle output
    const output = JSON.stringify(results, null, 2);
    if (options.outputFile) {
      fs.writeFileSync(options.outputFile, output);
      console.log(`Results saved to ${options.outputFile}`);
    } else {
      console.log(output);
    }
    
    console.log(`Analysis complete. Processed ${results.length} days.`);
    
    // Close database connection
    await db.destroy();
    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('Stack trace:', error.stack);
    
    // Ensure database connection is closed on error
    try {
      await db.destroy();
    } catch (e) {
      console.error(`Error closing database connection: ${e.message}`);
    }
    
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 