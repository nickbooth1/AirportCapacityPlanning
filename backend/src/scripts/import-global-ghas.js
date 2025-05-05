/**
 * Import Global Ground Handling Agents Dataset
 * 
 * This script imports additional GHAs from various regions around the world
 * to provide comprehensive global coverage in the database.
 */

const dotenv = require('dotenv');
const db = require('../utils/db');
const { Model } = require('objection');
const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

// Load environment variables
dotenv.config();

// Initialize Objection.js with our knex instance
Model.knex(db);

// Global GHA data - focusing on regions not well covered yet
const globalGHAs = [
  // Africa
  {
    name: "NAS Airport Services",
    code: "NASE",
    abbreviation: "NAS",
    headquarters: "Nairobi",
    country: "KE",
    country_name: "Kenya",
    founded: 1949,
    website: "https://www.nas.aero",
    parent_company: "National Aviation Services",
    service_types: ["passenger_services", "ramp_services", "cargo_handling", "baggage_handling"],
    operates_at: ["NBO", "MBA", "KIS", "EBB", "DAR", "JRO"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Swissport South Africa",
    code: "SWSA",
    abbreviation: "SSA",
    headquarters: "Johannesburg",
    country: "ZA",
    country_name: "South Africa",
    founded: 2006,
    website: "https://www.swissport.com/network/africa/south-africa",
    parent_company: "Swissport International",
    service_types: ["passenger_services", "ramp_services", "cargo_handling"],
    operates_at: ["JNB", "CPT", "DUR"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Moroccan Aviation Services",
    code: "MASA",
    abbreviation: "MAS",
    headquarters: "Casablanca",
    country: "MA",
    country_name: "Morocco",
    founded: 1992,
    website: "https://www.mas.co.ma",
    parent_company: "Royal Air Maroc",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["CMN", "RAK", "AGA", "FEZ", "TNG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "EgyptAir Ground Services",
    code: "EAGS",
    abbreviation: "EGS",
    headquarters: "Cairo",
    country: "EG",
    country_name: "Egypt",
    founded: 1971,
    website: "https://www.egyptair.com/en/about-egyptair/Pages/Ground-Services.aspx",
    parent_company: "EgyptAir Holding Company",
    service_types: ["passenger_services", "ramp_services", "cargo_handling", "baggage_handling"],
    operates_at: ["CAI", "HRG", "LXR", "SSH", "ALY"],
    status: "active",
    data_source: "manual"
  },
  
  // Asia Pacific
  {
    name: "PT Gapura Angkasa",
    code: "GAPU",
    abbreviation: "GAP",
    headquarters: "Jakarta",
    country: "ID",
    country_name: "Indonesia",
    founded: 1998,
    website: "https://www.gapura.co.id",
    parent_company: "Garuda Indonesia",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["CGK", "DPS", "SUB", "UPG", "MES"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Malaysian Airport Ground Services",
    code: "MAGS",
    abbreviation: "MGS",
    headquarters: "Kuala Lumpur",
    country: "MY",
    country_name: "Malaysia",
    founded: 1991,
    website: "https://www.malaysiaairports.com.my",
    parent_company: "Malaysia Airports Holdings Berhad",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["KUL", "PEN", "BKI", "KCH", "LGK"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Bangkok Flight Services",
    code: "BKFS",
    abbreviation: "BFS",
    headquarters: "Bangkok",
    country: "TH",
    country_name: "Thailand",
    founded: 2006,
    website: "https://www.bangkokflightservices.com",
    parent_company: "Worldwide Flight Services",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["BKK", "DMK"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "SATS Ltd.",
    code: "SATS",
    abbreviation: "SAT",
    headquarters: "Singapore",
    country: "SG",
    country_name: "Singapore",
    founded: 1947,
    website: "https://www.sats.com.sg",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling", "catering"],
    operates_at: ["SIN", "BKK", "DPS", "MLE", "DEL"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Air India SATS Airport Services",
    code: "AISATS",
    abbreviation: "AIS",
    headquarters: "Bangalore",
    country: "IN",
    country_name: "India",
    founded: 2010,
    website: "https://www.aisats.in",
    parent_company: "SATS Ltd. and Air India Ltd.",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["BLR", "DEL", "HYD", "TRV", "MAA"],
    status: "active",
    data_source: "manual"
  },
  
  // Americas
  {
    name: "Aeropuertos y Servicios Auxiliares",
    code: "ASA",
    abbreviation: "ASA",
    headquarters: "Mexico City",
    country: "MX",
    country_name: "Mexico",
    founded: 1965,
    website: "https://www.gob.mx/asa",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "fuel_services"],
    operates_at: ["MEX", "CUN", "GDL", "MTY", "TIJ"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Globalia Handling",
    code: "GLOB",
    abbreviation: "GLH",
    headquarters: "Santo Domingo",
    country: "DO",
    country_name: "Dominican Republic",
    founded: 2001,
    website: "https://www.globalia.com",
    parent_company: "Globalia",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["SDQ", "PUJ", "STI", "POP", "HAV"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Serviport",
    code: "SERP",
    abbreviation: "SVP",
    headquarters: "Bogotá",
    country: "CO",
    country_name: "Colombia",
    founded: 1994,
    website: "https://www.serviport.com.co",
    parent_company: null,
    service_types: ["passenger_services", "cargo_handling", "ramp_services"],
    operates_at: ["BOG", "CTG", "MDE", "CLO", "BAQ"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Aeropuertos Argentina 2000",
    code: "AA2K",
    abbreviation: "AA2",
    headquarters: "Buenos Aires",
    country: "AR",
    country_name: "Argentina",
    founded: 1998,
    website: "https://www.aa2000.com.ar",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["EZE", "AEP", "COR", "MDZ", "BRC"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Delta Global Services",
    code: "DGS",
    abbreviation: "DGS",
    headquarters: "Atlanta",
    country: "US",
    country_name: "United States",
    founded: 1995,
    website: "https://www.dgs.aero",
    parent_company: "Delta Air Lines",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["ATL", "DTW", "MSP", "JFK", "LAX", "SLC"],
    status: "active",
    data_source: "manual"
  },
  
  // Middle East
  {
    name: "Saudi Ground Services Company",
    code: "SGS",
    abbreviation: "SGS",
    headquarters: "Jeddah",
    country: "SA",
    country_name: "Saudi Arabia",
    founded: 2010,
    website: "https://www.saudiags.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["JED", "RUH", "DMM", "MED", "AHB"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Oman Air SATS Cargo",
    code: "OASC",
    abbreviation: "OSC",
    headquarters: "Muscat",
    country: "OM",
    country_name: "Oman",
    founded: 2016,
    website: "https://www.omanair.com/oman-air-sats-cargo",
    parent_company: "Oman Air and SATS Ltd.",
    service_types: ["cargo_handling", "ramp_services"],
    operates_at: ["MCT", "SLL"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Bahrain Airport Services",
    code: "BAS",
    abbreviation: "BAS",
    headquarters: "Manama",
    country: "BH",
    country_name: "Bahrain",
    founded: 1977,
    website: "https://www.bas.com.bh",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling", "catering"],
    operates_at: ["BAH"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Jordan Airport Services",
    code: "JAS",
    abbreviation: "JAS",
    headquarters: "Amman",
    country: "JO",
    country_name: "Jordan",
    founded: 1982,
    website: "https://www.jas.com.jo",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["AMM", "AQJ"],
    status: "active",
    data_source: "manual"
  },
  
  // Oceania
  {
    name: "Menzies Aviation Australia",
    code: "MNZA",
    abbreviation: "MAA",
    headquarters: "Sydney",
    country: "AU",
    country_name: "Australia",
    founded: 1997,
    website: "https://www.menziesaviation.com/region/oceania",
    parent_company: "Menzies Aviation",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["SYD", "MEL", "BNE", "PER", "ADL", "DRW"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Air New Zealand Ground Handling",
    code: "ANZG",
    abbreviation: "ANZ",
    headquarters: "Auckland",
    country: "NZ",
    country_name: "New Zealand",
    founded: 1965,
    website: "https://www.airnewzealand.co.nz",
    parent_company: "Air New Zealand",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["AKL", "WLG", "CHC", "ZQN", "DUD"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Air Terminal Services Fiji",
    code: "ATSF",
    abbreviation: "ATS",
    headquarters: "Nadi",
    country: "FJ",
    country_name: "Fiji",
    founded: 1981,
    website: "https://www.ats.com.fj",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling", "catering"],
    operates_at: ["NAN", "SUV"],
    status: "active",
    data_source: "manual"
  },
  
  // Additional European GHAs
  {
    name: "Çelebi Ground Handling Hungary",
    code: "CGHH",
    abbreviation: "CGH",
    headquarters: "Budapest",
    country: "HU",
    country_name: "Hungary",
    founded: 2006,
    website: "https://www.celebiaviation.com/en/worldwide-network/europe/hungary",
    parent_company: "Çelebi Holding",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["BUD"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Red Handling",
    code: "REDH",
    abbreviation: "RED",
    headquarters: "London",
    country: "GB",
    country_name: "United Kingdom",
    founded: 2010,
    website: "https://www.redhandling.co.uk",
    parent_company: "Swissport UK",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["LGW", "LTN", "EDI"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "BCG Airport Services",
    code: "BCGA",
    abbreviation: "BCG",
    headquarters: "Barcelona",
    country: "ES",
    country_name: "Spain",
    founded: 2003,
    website: "https://www.bcgairport.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["BCN", "MAD", "PMI", "AGP", "LPA"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Northport",
    code: "NRTP",
    abbreviation: "NPT",
    headquarters: "Stockholm",
    country: "SE",
    country_name: "Sweden",
    founded: 1997,
    website: "https://www.northport.se",
    parent_company: "SAS Ground Handling",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["ARN", "GOT", "MMX"],
    status: "active",
    data_source: "manual"
  }
];

/**
 * Main import function
 */
async function importGlobalGHAs() {
  try {
    console.log('Starting import of global GHA dataset...');
    console.log(`Preparing to import ${globalGHAs.length} GHAs...`);
    
    // Import the GHAs
    const results = await GroundHandlingAgentService.bulkImport(globalGHAs);
    
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
    console.error('Error importing global GHA dataset:', error);
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
importGlobalGHAs(); 