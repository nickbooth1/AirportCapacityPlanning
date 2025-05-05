/**
 * Import Specialized Ground Handling Agents Dataset
 * 
 * This script imports specialized and niche GHAs to provide additional
 * diversity to the database.
 */

const dotenv = require('dotenv');
const db = require('../utils/db');
const { Model } = require('objection');
const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

// Load environment variables
dotenv.config();

// Initialize Objection.js with our knex instance
Model.knex(db);

// Specialized GHA data - focusing on niche service providers
const specializedGHAs = [
  // Cargo Specialists
  {
    name: "AirBridgeCargo Ground Services",
    code: "ABCS",
    abbreviation: "ABC",
    headquarters: "Moscow",
    country: "RU",
    country_name: "Russia",
    founded: 2004,
    website: "https://www.airbridgecargo.com",
    parent_company: "Volga-Dnepr Group",
    service_types: ["cargo_handling", "ramp_services"],
    operates_at: ["SVO", "DME", "LED", "AMS", "FRA", "PVG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Cargolux Ground Services",
    code: "CVGS",
    abbreviation: "CVG",
    headquarters: "Luxembourg",
    country: "LU",
    country_name: "Luxembourg",
    founded: 1970,
    website: "https://www.cargolux.com",
    parent_company: "Cargolux Airlines International",
    service_types: ["cargo_handling", "ramp_services"],
    operates_at: ["LUX", "PIT", "MIA", "HKG"],
    status: "active",
    data_source: "manual"
  },
  
  // VIP and Executive Aviation Services
  {
    name: "Signature Flight Support",
    code: "SIGN",
    abbreviation: "SFS",
    headquarters: "Orlando",
    country: "US",
    country_name: "United States",
    founded: 1992,
    website: "https://www.signatureflight.com",
    parent_company: "BBA Aviation",
    service_types: ["passenger_services", "ramp_services", "fuel_services"],
    operates_at: ["TEB", "LTN", "LAX", "SFO", "LGA", "ORD", "DCA", "PBI"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Jet Aviation",
    code: "JETA",
    abbreviation: "JET",
    headquarters: "Basel",
    country: "CH",
    country_name: "Switzerland",
    founded: 1967,
    website: "https://www.jetaviation.com",
    parent_company: "General Dynamics",
    service_types: ["passenger_services", "ramp_services", "maintenance"],
    operates_at: ["ZRH", "BSL", "GVA", "TEB", "PBI", "SIN", "DXB"],
    status: "active",
    data_source: "manual"
  },
  
  // Specialized Aircraft Services
  {
    name: "Universal Weather and Aviation",
    code: "UNIV",
    abbreviation: "UWA",
    headquarters: "Houston",
    country: "US",
    country_name: "United States",
    founded: 1959,
    website: "https://www.universalweather.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "other"],
    operates_at: ["IAH", "EWR", "LGA", "HKG", "NRT", "LHR", "CDG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Air Handlers International",
    code: "AIRH",
    abbreviation: "AHI",
    headquarters: "Chicago",
    country: "US",
    country_name: "United States",
    founded: 1992,
    website: "https://www.airhandlers.com",
    parent_company: null,
    service_types: ["ramp_services", "maintenance", "aircraft_services"],
    operates_at: ["ORD", "ATL", "DFW", "MIA", "JFK"],
    status: "active",
    data_source: "manual"
  },
  
  // Fuel Service Specialists
  {
    name: "World Fuel Services",
    code: "WFSC",
    abbreviation: "WFS",
    headquarters: "Miami",
    country: "US",
    country_name: "United States",
    founded: 1984,
    website: "https://www.wfscorp.com",
    parent_company: null,
    service_types: ["fuel_services"],
    operates_at: ["MIA", "ATL", "LAX", "LHR", "SIN", "HKG", "SYD", "GRU"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Shell Aviation Services",
    code: "SHLA",
    abbreviation: "SAS",
    headquarters: "London",
    country: "GB",
    country_name: "United Kingdom",
    founded: 1927,
    website: "https://www.shell.com/aviation",
    parent_company: "Royal Dutch Shell",
    service_types: ["fuel_services"],
    operates_at: ["LHR", "AMS", "SIN", "JFK", "LAX", "SYD", "DXB", "HKG"],
    status: "active",
    data_source: "manual"
  },
  
  // Regional Specialists
  {
    name: "Caribbean Airport Services",
    code: "CASC",
    abbreviation: "CAS",
    headquarters: "San Juan",
    country: "PR",
    country_name: "Puerto Rico",
    founded: 1989,
    website: "https://www.caribbeanairportservices.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["SJU", "STT", "STX", "ANU", "BGI", "MBJ", "GCM"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Nordic Ground Handling",
    code: "NORD",
    abbreviation: "NGH",
    headquarters: "Oslo",
    country: "NO",
    country_name: "Norway",
    founded: 2001,
    website: "https://www.nordicgroundhandling.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "deicing"],
    operates_at: ["OSL", "BGO", "TRD", "SVG", "TOS"],
    status: "active",
    data_source: "manual"
  },
  
  // Airline-specific Ground Handlers
  {
    name: "Lufthansa Ground Services",
    code: "LUGS",
    abbreviation: "LGS",
    headquarters: "Frankfurt",
    country: "DE",
    country_name: "Germany",
    founded: 1997,
    website: "https://www.lufthansa-ground.com",
    parent_company: "Lufthansa Group",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["FRA", "MUC", "DUS", "HAM", "TXL", "VIE", "ZRH"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Emirates Engineering",
    code: "EMIE",
    abbreviation: "EEG",
    headquarters: "Dubai",
    country: "AE",
    country_name: "United Arab Emirates",
    founded: 1985,
    website: "https://www.emirates.com/engineering",
    parent_company: "Emirates Group",
    service_types: ["maintenance", "aircraft_services"],
    operates_at: ["DXB", "JFK", "LHR", "SYD", "MEL", "JNB"],
    status: "active",
    data_source: "manual"
  }
];

/**
 * Main import function
 */
async function importSpecializedGHAs() {
  try {
    console.log('Starting import of specialized GHA dataset...');
    console.log(`Preparing to import ${specializedGHAs.length} GHAs...`);
    
    // Import the GHAs
    const results = await GroundHandlingAgentService.bulkImport(specializedGHAs);
    
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
    console.error('Error importing specialized GHA dataset:', error);
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
importSpecializedGHAs(); 