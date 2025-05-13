#!/usr/bin/env node

/**
 * CLI interface for the Capacity Impact Analyzer
 * This script loads mock data and calls the analyzer with command-line parameters.
 */

const fs = require('fs');
const path = require('path');
const { calculateDailyImpacts } = require('./analyzer');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    mockDataDir: path.join(__dirname, 'mockData'),
    outputFile: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--startDate' && i + 1 < args.length) {
      options.startDate = args[++i];
    } else if (arg === '--endDate' && i + 1 < args.length) {
      options.endDate = args[++i];
    } else if (arg === '--mockDataDir' && i + 1 < args.length) {
      options.mockDataDir = args[++i];
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
Usage: node cli.js --startDate YYYY-MM-DD --endDate YYYY-MM-DD [options]

Options:
  --startDate YYYY-MM-DD    Start date for the analysis (required)
  --endDate YYYY-MM-DD      End date for the analysis (required)
  --mockDataDir PATH        Directory containing mock data files (default: ./mockData)
  --outputFile PATH         File to save output (default: prints to console)
  --help, -h                Show this help message
`);
}

// Load mock data from files
function loadMockData(mockDataDir) {
  try {
    // Load all JSON files
    const dailyGrossCapacityTemplate = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'dailyGrossCapacityTemplate.json'), 'utf8')
    );
    const allMaintenanceRequests = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'maintenanceRequests.json'), 'utf8')
    );
    const stands = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'stands.json'), 'utf8')
    );
    const aircraftTypes = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'aircraftTypes.json'), 'utf8')
    );
    const opSettings = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'operationalSettings.json'), 'utf8')
    );
    const statusTypes = JSON.parse(
      fs.readFileSync(path.join(mockDataDir, 'maintenanceStatusTypes.json'), 'utf8')
    );
    
    return {
      dailyGrossCapacityTemplate,
      allMaintenanceRequests,
      stands,
      aircraftTypes,
      opSettings,
      statusTypes
    };
  } catch (error) {
    console.error(`Error loading mock data: ${error.message}`);
    console.error(`Make sure all required JSON files exist in ${mockDataDir}`);
    process.exit(1);
  }
}

// Validate date format (YYYY-MM-DD)
function isValidDateFormat(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Main function
function main() {
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
    // Load mock data
    console.log(`Loading mock data from ${options.mockDataDir}...`);
    const mockData = loadMockData(options.mockDataDir);
    
    // Define maintenance status IDs to include in the analysis
    const maintenanceStatusIdsToInclude = {
      definite: [2, 4, 5], // Approved, In Progress, Completed
      potential: [1]       // Requested
    };
    
    // Call the analyzer with options and mock data
    console.log(`Analyzing capacity impact from ${options.startDate} to ${options.endDate}...`);
    const results = calculateDailyImpacts(
      { 
        startDate: options.startDate, 
        endDate: options.endDate,
        maintenanceStatusIdsToInclude
      }, 
      mockData
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
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main(); 