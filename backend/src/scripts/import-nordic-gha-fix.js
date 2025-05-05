/**
 * Fix and Import Nordic Ground Handling
 * 
 * This script fixes the Nordic Ground Handling entry that had an invalid service type
 * and imports it into the database.
 */

const dotenv = require('dotenv');
const db = require('../utils/db');
const { Model } = require('objection');
const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

// Load environment variables
dotenv.config();

// Initialize Objection.js with our knex instance
Model.knex(db);

// Fixed Nordic Ground Handling entry
const nordicGHA = {
  name: "Nordic Ground Handling",
  code: "NORD",
  abbreviation: "NGH",
  headquarters: "Oslo",
  country: "NO",
  country_name: "Norway",
  founded: 2001,
  website: "https://www.nordicgroundhandling.com",
  parent_company: null,
  service_types: [
    "passenger_services", 
    "ramp_services", 
    "baggage_handling", 
    "aircraft_services"  // Changed from "deicing" to a valid service type
  ],
  operates_at: ["OSL", "BGO", "TRD", "SVG", "TOS"],
  status: "active",
  data_source: "manual"
};

/**
 * Main import function
 */
async function importNordicGHA() {
  try {
    console.log('Importing fixed Nordic Ground Handling entry...');
    
    // Import the GHA
    const results = await GroundHandlingAgentService.bulkImport([nordicGHA]);
    
    console.log('Import completed successfully!');
    console.log('=================================');
    console.log(`GHAs created: ${results.created}`);
    console.log(`GHAs updated: ${results.updated}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('Error details:');
      results.errors.forEach(err => console.log(`- ${err.name}: ${err.error}`));
    }
    
  } catch (error) {
    console.error('Error importing Nordic GHA:', error);
  } finally {
    // Close the database connection if possible
    if (db.destroy && typeof db.destroy === 'function') {
      db.destroy();
    } else {
      console.log('Database connection will be closed by Node.js process exit');
      process.exit(0);
    }
  }
}

// Run the import
importNordicGHA(); 