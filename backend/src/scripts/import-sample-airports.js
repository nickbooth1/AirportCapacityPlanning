/**
 * Import Sample Airports Data
 * 
 * This script imports sample airport data into the database.
 * Run this script after migrations to populate the database with initial data.
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const db = require('../utils/db');
const { Model } = require('objection');
const AirportService = require('../services/AirportService');

// Load environment variables
dotenv.config();

// Bind all Objection.js models to the knex instance
Model.knex(db);

async function importAirports() {
  try {
    console.log('Starting import of sample airport data...');
    
    // Read the sample data file
    const dataPath = path.join(__dirname, '../data/sample-airports.json');
    const airportsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Import airports
    const results = await AirportService.bulkImport(airportsData);
    
    console.log('Import completed successfully!');
    console.log(`Total airports processed: ${results.total}`);
    console.log(`Airports created: ${results.created}`);
    console.log(`Airports updated: ${results.updated}`);
    
    if (results.errors.length > 0) {
      console.log(`Errors encountered: ${results.errors.length}`);
      results.errors.forEach((error, index) => {
        console.log(`Error ${index + 1}:`, error.error);
      });
    }
  } catch (error) {
    console.error('Error importing airports:', error.message);
  } finally {
    // Close the database connection properly
    await db.destroy();
    process.exit(0);
  }
}

// Run the import
importAirports(); 