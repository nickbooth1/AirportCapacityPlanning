#!/usr/bin/env node
/**
 * Performance Test Data Generator
 * 
 * This script generates test data for performance testing the AirportAI Phase 2 functionality.
 * It creates scenarios, flight schedules, and other necessary data for performance tests.
 */

const fs = require('fs').promises;
const path = require('path');
const { 
  generateScenarioList,
  generateTestFlightSchedule,
  generateScenarioImpactResults
} = require('./testDataGenerator');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../fixtures'),
  scenarioCount: 100,
  flightScheduleSizes: [100, 1000, 5000, 10000],
  complexityDistribution: {
    simple: 0.6,
    moderate: 0.3,
    complex: 0.1
  }
};

/**
 * Generate and save test data
 */
async function generateTestData() {
  try {
    console.log('Generating performance test data...');
    
    // Ensure output directory exists
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Generate scenarios
    console.log(`Generating ${CONFIG.scenarioCount} test scenarios...`);
    const scenarios = generateScenarioList(CONFIG.scenarioCount, {
      complexityDistribution: CONFIG.complexityDistribution
    });
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'test-scenarios.json'),
      JSON.stringify(scenarios, null, 2)
    );
    
    // Generate scenario impact results for a subset of scenarios
    console.log('Generating scenario impact results...');
    const impactResults = {};
    
    for (let i = 0; i < 10; i++) {
      const scenario = scenarios[i];
      impactResults[scenario.id] = generateScenarioImpactResults(scenario);
    }
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'test-scenario-results.json'),
      JSON.stringify(impactResults, null, 2)
    );
    
    // Generate flight schedules of different sizes
    console.log('Generating flight schedules of various sizes...');
    
    for (const size of CONFIG.flightScheduleSizes) {
      console.log(`Generating flight schedule with ${size} flights...`);
      const flights = generateTestFlightSchedule(size);
      
      await fs.writeFile(
        path.join(CONFIG.outputDir, `test-flights-${size}.json`),
        JSON.stringify(flights, null, 2)
      );
    }
    
    console.log('Test data generation complete! Data saved to:', CONFIG.outputDir);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
}

// Check if script is being run directly
if (require.main === module) {
  generateTestData();
}

module.exports = {
  generateTestData
};