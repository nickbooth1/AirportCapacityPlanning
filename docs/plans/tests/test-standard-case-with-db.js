/**
 * Test script for the Stand Capacity Tool standard case implementation
 * using real data from the database
 * 
 * This script:
 * 1. Populates the database with test data
 * 2. Calls the actual stand capacity service
 * 3. Verifies that standard case calculation works correctly
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Set up correct paths
const projectRoot = path.resolve(__dirname, '../../..');
const backendPath = path.join(projectRoot, 'backend');

// Add backend path to module search path
module.paths.push(backendPath);
process.env.NODE_PATH = backendPath;
require('module').Module._initPaths();

// Import backend modules
const knex = require(path.join(backendPath, 'src/utils/db'));
const { Model } = require(path.join(backendPath, 'node_modules/objection'));

// Initialize Objection.js
Model.knex(knex);

const StandCapacityService = require(path.join(backendPath, 'src/services/standCapacityService'));

// Initialize stand capacity service
const standCapacityService = StandCapacityService;

// Path to SQL file
const SQL_FILE_PATH = path.join(__dirname, 'populate-standard-case-test-data.sql');

// Path to results file
const RESULTS_FILE_PATH = path.join(__dirname, 'standard-case-db-test-results.json');

// Initialize stand capacity service
const service = StandCapacityService;

// Function to execute SQL file
async function executeSqlFile(filePath) {
  try {
    console.log('Loading test data from SQL file...');
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log('Executing SQL to populate test data...');
    await knex.raw(sql);
    
    console.log('Test data populated successfully!');
  } catch (error) {
    console.error('Error populating test data:', error);
    throw error;
  }
}

// Fetch data from database
async function fetchTestData() {
  try {
    console.log('Fetching test data from database...');
    
    // Get stands
    const stands = await knex('stands').select('*');
    
    // Get aircraft types
    const aircraftTypes = await knex('aircraft_types').select('*');
    
    // Get time slots
    const timeSlots = await knex('time_slots').select('*');
    
    console.log(`Loaded: ${stands.length} stands, ${aircraftTypes.length} aircraft types, ${timeSlots.length} time slots`);
    
    return { stands, aircraftTypes, timeSlots };
  } catch (error) {
    console.error('Error fetching test data:', error);
    throw error;
  }
}

// Calculate capacity
async function calculateCapacity() {
  try {
    console.log('Calculating stand capacity...');
    
    // Get necessary data for calculation
    const { stands, timeSlots } = await fetchTestData();
    
    // Define filter criteria - use all stands
    const standIds = stands.map(stand => stand.id);
    const timeSlotIds = timeSlots.map(timeSlot => timeSlot.id);
    
    // Calculate capacity
    const result = await service.calculateStandCapacity({
      standIds,
      timeSlotIds,
      aircraftTypeId: null, // Calculate for all aircraft types
      pierIds: null,
      terminalIds: null
    });
    
    console.log('Capacity calculation completed');
    
    return result;
  } catch (error) {
    console.error('Error calculating stand capacity:', error);
    throw error;
  }
}

// Verify that standard case equals best case
function verifyStandardCase(capacityResult) {
  console.log('\n=== CALCULATION SUMMARY ===');
  
  // Get time slot names
  const timeSlotNames = capacityResult.timeSlots.map(slot => slot.name);
  console.log('Time Slots:', timeSlotNames);
  
  // Print capacity summary
  console.log('Capacity Summary:');
  timeSlotNames.forEach(timeSlot => {
    const bestCase = Object.values(capacityResult.bestCaseCapacity[timeSlot] || {}).reduce((sum, val) => sum + val, 0);
    const standardCase = Object.values(capacityResult.standardCaseCapacity[timeSlot] || {}).reduce((sum, val) => sum + val, 0);
    const worstCase = Object.values(capacityResult.worstCaseCapacity[timeSlot] || {}).reduce((sum, val) => sum + val, 0);
    
    console.log(`  ${timeSlot}: Best=${bestCase}, Standard=${standardCase}, Worst=${worstCase}`);
  });
  
  console.log('\n=== VERIFYING STANDARD CASE RESULTS ===');
  let allTestsPassed = true;
  
  // Check each time slot
  timeSlotNames.forEach(timeSlot => {
    console.log(`\nVerifying time slot: ${timeSlot}`);
    
    // Get capacity for this time slot
    const bestCase = capacityResult.bestCaseCapacity[timeSlot] || {};
    const standardCase = capacityResult.standardCaseCapacity[timeSlot] || {};
    const worstCase = capacityResult.worstCaseCapacity[timeSlot] || {};
    
    // Check for all aircraft types in this time slot
    const aircraftTypes = new Set([
      ...Object.keys(bestCase),
      ...Object.keys(standardCase),
      ...Object.keys(worstCase)
    ]);
    
    aircraftTypes.forEach(aircraftType => {
      const best = bestCase[aircraftType] || 0;
      const standard = standardCase[aircraftType] || 0;
      const worst = worstCase[aircraftType] || 0;
      
      console.log(`  Aircraft ${aircraftType}: best=${best}, standard=${standard}, worst=${worst}`);
      
      // For now, simply verify that standard case equals best case
      // This is because in our implementation standard case ignores adjacency rules just like best case
      if (standard !== best) {
        console.error(`❌ Test Failed: Standard case (${standard}) should equal best case (${best}) for ${timeSlot}/${aircraftType}`);
        allTestsPassed = false;
      }
    });
  });
  
  console.log('\n=== VERIFICATION RESULTS ===');
  if (allTestsPassed) {
    console.log('✅ All verification checks passed!');
  } else {
    console.log('❌ Some verification checks failed!');
  }
  
  return allTestsPassed;
}

// Save results to file
function saveResults(capacityResult) {
  fs.writeFileSync(RESULTS_FILE_PATH, JSON.stringify(capacityResult, null, 2));
  console.log(`\nDetailed results saved to: ${RESULTS_FILE_PATH}`);
}

// Main test function
async function runTest() {
  try {
    console.log('=== STAND CAPACITY TOOL: STANDARD CASE DATABASE TEST ===');
    
    // Prepare database with test data
    await executeSqlFile(SQL_FILE_PATH);
    
    // Calculate capacity
    const capacityResult = await calculateCapacity();
    
    // Verify standard case calculation
    const testsPassed = verifyStandardCase(capacityResult);
    
    // Save results
    saveResults(capacityResult);
    
    if (!testsPassed) {
      throw new Error('Verification failed');
    }
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection (knex may not support destroy() directly)
    // Simply exit the process cleanly instead
    process.exit(0);
  }
}

// Run the test
runTest(); 