/**
 * Import Comprehensive Airport Data
 * 
 * This script imports the comprehensive airport data into the database.
 * Run this script after downloading the data and running migrations.
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
    console.log('Starting import of comprehensive airport data...');
    
    // Read the full airport data file
    const dataPath = path.join(__dirname, '../data/airports.json');
    
    if (!fs.existsSync(dataPath)) {
      console.error('Airport data file not found!');
      console.log('Please run the download-airports-data.js script first to get the data.');
      process.exit(1);
    }
    
    const airportsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`Found ${airportsData.length} airports to import.`);
    
    // Process in batches to avoid memory issues
    const BATCH_SIZE = 100;
    let processedCount = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = [];
    
    // Process in batches
    for (let i = 0; i < airportsData.length; i += BATCH_SIZE) {
      const batch = airportsData.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(airportsData.length/BATCH_SIZE)} (${batch.length} airports)...`);
      
      const results = await AirportService.bulkImport(batch);
      
      processedCount += batch.length;
      totalCreated += results.created;
      totalUpdated += results.updated;
      totalErrors = totalErrors.concat(results.errors);
      
      console.log(`Progress: ${Math.round((processedCount / airportsData.length) * 100)}% complete`);
    }
    
    console.log('\nImport completed successfully!');
    console.log('=================================');
    console.log(`Total airports processed: ${processedCount}`);
    console.log(`Airports created: ${totalCreated}`);
    console.log(`Airports updated: ${totalUpdated}`);
    
    if (totalErrors.length > 0) {
      console.log(`\nErrors encountered: ${totalErrors.length}`);
      console.log('First 10 errors:');
      totalErrors.slice(0, 10).forEach((error, index) => {
        console.log(`Error ${index + 1}:`, error.error);
        if (error.airport) {
          console.log(`  Airport: ${error.airport.name} (${error.airport.iata_code || error.airport.icao_code})`);
        }
      });
      
      // Write errors to a log file for later analysis
      const errorLogPath = path.join(__dirname, '../logs/airport-import-errors.json');
      fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
      fs.writeFileSync(errorLogPath, JSON.stringify(totalErrors, null, 2));
      console.log(`\nAll errors have been logged to: ${errorLogPath}`);
    }
  } catch (error) {
    console.error('Error importing airports:', error.message);
    console.error(error.stack);
  } finally {
    // Close the database connection properly
    console.log('Closing database connection...');
    try {
      if (db && typeof db.destroy === 'function') {
        await db.destroy();
      } else {
        // Alternative way to close connection if destroy is not available
        await db.client.pool.destroy();
      }
    } catch (err) {
      console.error('Error closing database connection:', err.message);
    }
    
    // Force exit in case the connection doesn't close properly
    setTimeout(() => {
      console.log('Exiting process...');
      process.exit(0);
    }, 1000);
  }
}

// Run the import
importAirports(); 