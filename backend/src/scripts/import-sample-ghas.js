/**
 * Import Sample Ground Handling Agents
 * 
 * This script imports initial sample GHA data into the database.
 * Run this script after migrations to populate the database with starter data.
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const db = require('../utils/db');
const { Model } = require('objection');
const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

// Load environment variables
dotenv.config();

// Initialize Objection.js with our knex instance
Model.knex(db);

// Sample GHA data
const sampleGHAs = [
  {
    name: "Swissport International",
    code: "SWSP",
    abbreviation: "SPI",
    headquarters: "Zurich",
    country: "CH",
    country_name: "Switzerland",
    founded: 1996,
    website: "https://www.swissport.com",
    parent_company: "Swissport Group",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "cargo_handling",
      "aircraft_services",
      "fuel_services"
    ],
    operates_at: ["ZRH", "LHR", "FRA", "JFK", "LAX", "DXB"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Menzies Aviation",
    code: "MENZ",
    abbreviation: "MZA",
    headquarters: "Edinburgh",
    country: "GB",
    country_name: "United Kingdom",
    founded: 1833,
    website: "https://www.menziesaviation.com",
    parent_company: "John Menzies plc",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "cargo_handling",
      "fuel_services"
    ],
    operates_at: ["LHR", "LGW", "EDI", "LAX", "SYD", "AMS"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "dnata",
    code: "DNAT",
    abbreviation: "DNA",
    headquarters: "Dubai",
    country: "AE",
    country_name: "United Arab Emirates",
    founded: 1959,
    website: "https://www.dnata.com",
    parent_company: "Emirates Group",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "cargo_handling",
      "catering"
    ],
    operates_at: ["DXB", "LHR", "SYD", "SIN", "ZRH", "JFK"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Worldwide Flight Services (WFS)",
    code: "WFS",
    abbreviation: "WFS",
    headquarters: "Paris",
    country: "FR",
    country_name: "France",
    founded: 1971,
    website: "https://www.wfs.aero",
    parent_company: "SATS Ltd.",
    service_types: [
      "cargo_handling",
      "ramp_services",
      "passenger_services",
      "baggage_handling"
    ],
    operates_at: ["CDG", "LHR", "MAD", "JFK", "LAX", "HKG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Aviapartner",
    code: "AVIA",
    abbreviation: "AVP",
    headquarters: "Brussels",
    country: "BE",
    country_name: "Belgium",
    founded: 1949,
    website: "https://www.aviapartner.aero",
    parent_company: null,
    service_types: [
      "passenger_services",
      "ramp_services",
      "cargo_handling",
      "baggage_handling",
      "aircraft_services"
    ],
    operates_at: ["BRU", "AMS", "FCO", "MAD", "NCE", "LYS"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Celebi Ground Handling",
    code: "CELB",
    abbreviation: "CLB",
    headquarters: "Istanbul",
    country: "TR",
    country_name: "Turkey",
    founded: 1958,
    website: "https://www.celebiaviation.com",
    parent_company: "Çelebi Holding",
    service_types: [
      "passenger_services",
      "ramp_services",
      "cargo_handling",
      "baggage_handling"
    ],
    operates_at: ["IST", "SAW", "BUD", "VIE", "DEL", "BOM"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "AeroGround",
    code: "AERO",
    abbreviation: "ARG",
    headquarters: "Munich",
    country: "DE",
    country_name: "Germany",
    founded: 2011,
    website: "https://www.aeroground.de",
    parent_company: "Munich Airport",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "aircraft_services"
    ],
    operates_at: ["MUC", "BER"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Fraport Ground Services",
    code: "FRAP",
    abbreviation: "FGS",
    headquarters: "Frankfurt",
    country: "DE",
    country_name: "Germany",
    founded: 1924,
    website: "https://www.fraport.com",
    parent_company: "Fraport AG",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "cargo_handling"
    ],
    operates_at: ["FRA", "ANK", "LJU", "SKG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Havas Ground Handling",
    code: "HAVAS",
    abbreviation: "HVS",
    headquarters: "Istanbul",
    country: "TR",
    country_name: "Turkey",
    founded: 1933,
    website: "https://www.havas.net",
    parent_company: "TAV Airports Holding",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling"
    ],
    operates_at: ["IST", "AYT", "ADB", "ESB", "SAW"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Qatar Aviation Services",
    code: "QAS",
    abbreviation: "QAS",
    headquarters: "Doha",
    country: "QA",
    country_name: "Qatar",
    founded: 2000,
    website: "https://www.qatarairways.com/en/about-qatar-airways/qas.html",
    parent_company: "Qatar Airways Group",
    service_types: [
      "passenger_services",
      "ramp_services",
      "baggage_handling",
      "cargo_handling",
      "aircraft_services"
    ],
    operates_at: ["DOH"],
    status: "active",
    data_source: "manual"
  }
];

/**
 * Main import function
 */
async function importSampleGHAs() {
  try {
    console.log('Starting import of sample GHA data...');
    
    // Import the GHAs
    const results = await GroundHandlingAgentService.bulkImport(sampleGHAs);
    
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
    console.error('Error importing sample GHA data:', error);
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
importSampleGHAs(); 