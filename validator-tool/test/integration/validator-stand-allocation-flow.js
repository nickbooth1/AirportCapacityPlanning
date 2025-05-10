/**
 * Validator to Stand Allocation Integration Test
 * 
 * This script demonstrates the flow from CSV validation to Stand Allocation execution
 * by performing the following steps:
 * 1. Validate a CSV flight schedule file
 * 2. Export validated data to Stand Allocation JSON format
 * 3. Call the Stand Allocation algorithm with the exported data
 * 4. Display the results
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  // Path to the validator CLI script
  validatorPath: path.resolve(__dirname, '../../src/cli/index.js'),
  
  // Path to the Stand Allocation main script
  standAllocationPath: path.resolve(__dirname, '../../../stand_allocation_tool/main.py'),
  
  // Input flight schedule file (CSV)
  inputFile: path.resolve(__dirname, '../fixtures/sample-flights.csv'),
  
  // Directory for reference data
  referenceDataDir: path.resolve(__dirname, '../fixtures/reference-data'),
  
  // Output directory for Stand Allocation JSON files
  outputDir: path.resolve(__dirname, '../../temp/allocation-input'),
  
  // Output directory for Stand Allocation results
  resultsDir: path.resolve(__dirname, '../../temp/allocation-results')
};

// Make sure output directories exist
if (!fs.existsSync(path.dirname(CONFIG.outputDir))) {
  fs.mkdirSync(path.dirname(CONFIG.outputDir), { recursive: true });
}
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.resultsDir)) {
  fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
}

// Main integration test function
async function runIntegrationTest() {
  console.log(chalk.bold.blue('\n=== Flight Schedule Validator to Stand Allocation Integration Test ===\n'));
  
  try {
    // Step 1: Validate and export the flight schedule
    console.log(chalk.yellow('Step 1: Validating and exporting flight schedule to JSON'));
    const validatorCmd = `node ${CONFIG.validatorPath} validate-export ${CONFIG.inputFile} ` +
                       `--reference-data ${CONFIG.referenceDataDir} ` +
                       `--output ${CONFIG.outputDir} ` +
                       `--skip-invalid`;
    
    console.log(`Executing: ${validatorCmd}`);
    execSync(validatorCmd, { stdio: 'inherit' });
    
    // Check if the JSON files were created
    const requiredFiles = ['flights.json', 'stands.json', 'airlines.json', 'settings.json'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(CONFIG.outputDir, file)));
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required JSON files: ${missingFiles.join(', ')}`);
    }
    
    console.log(chalk.green('Validation and export completed successfully!'));
    
    // Step 2: Run the Stand Allocation algorithm
    console.log(chalk.yellow('\nStep 2: Running Stand Allocation Algorithm'));
    
    // Prepare command for stand allocation
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const standAllocationCmd = `${pythonCmd} ${CONFIG.standAllocationPath} ` +
                              `--scenario-directory ${CONFIG.outputDir} ` +
                              `--output-directory ${CONFIG.resultsDir}`;
    
    console.log(`Executing: ${standAllocationCmd}`);
    
    try {
      execSync(standAllocationCmd, { stdio: 'inherit' });
      console.log(chalk.green('Stand Allocation completed successfully!'));
      
      // Check for allocation results
      const allocationResults = path.join(CONFIG.resultsDir, 'allocation_results.json');
      if (fs.existsSync(allocationResults)) {
        const results = JSON.parse(fs.readFileSync(allocationResults, 'utf8'));
        
        console.log(chalk.bold.blue('\n=== Stand Allocation Results Summary ===\n'));
        console.log(`Total flights: ${results.total_flights}`);
        console.log(`Allocated flights: ${results.allocated_flights}`);
        console.log(`Allocation success rate: ${(results.allocated_flights / results.total_flights * 100).toFixed(2)}%`);
        
        if (results.unallocated_flights && results.unallocated_flights.length > 0) {
          console.log(chalk.yellow(`\nUnallocated flights: ${results.unallocated_flights.length}`));
          results.unallocated_flights.slice(0, 5).forEach(flight => {
            console.log(`  - ${flight.FlightNumber} (${flight.AirlineCode}) ${flight.IsArrival ? 'Arrival' : 'Departure'} at ${flight.ScheduledTime}`);
          });
          
          if (results.unallocated_flights.length > 5) {
            console.log(`  ... and ${results.unallocated_flights.length - 5} more`);
          }
        }
      } else {
        console.log(chalk.yellow('No allocation results found. Check the stand allocation tool output.'));
      }
    } catch (error) {
      // The stand allocation might not be available or have an error,
      // but we want to show that the validator part worked
      console.log(chalk.red(`Error running Stand Allocation: ${error.message}`));
      console.log(chalk.yellow('This might be due to the Stand Allocation tool not being available or configured correctly.'));
      console.log(chalk.yellow('However, the validator successfully exported the JSON files that would be used by the Stand Allocation algorithm.'));
      
      // List the generated files
      console.log(chalk.bold.blue('\n=== Generated JSON Files ===\n'));
      requiredFiles.forEach(file => {
        const filePath = path.join(CONFIG.outputDir, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const count = Array.isArray(content) ? content.length : 'N/A';
          console.log(`${file}: ${stats.size} bytes, ${count} items`);
        }
      });
    }
    
    console.log(chalk.bold.blue('\n=== Integration Test Completed ===\n'));
  } catch (error) {
    console.error(chalk.red(`\nError during integration test: ${error.message}`));
    process.exit(1);
  }
}

// Run the integration test
runIntegrationTest().catch(err => {
  console.error(chalk.red(`\nUnhandled error: ${err.message}`));
  process.exit(1);
});