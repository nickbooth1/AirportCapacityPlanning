/**
 * Import Extended Ground Handling Agents Dataset
 * 
 * This script imports a comprehensive set of ground handling agents from around the world
 * to provide a more complete database for searching and filtering.
 */

const dotenv = require('dotenv');
const db = require('../utils/db');
const { Model } = require('objection');
const GroundHandlingAgentService = require('../services/GroundHandlingAgentService');

// Load environment variables
dotenv.config();

// Initialize Objection.js with our knex instance
Model.knex(db);

// Extended GHA data - comprehensive list of ground handling agents worldwide
const extendedGHAs = [
  // Original 10 GHAs
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
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling", "aircraft_services", "fuel_services"],
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
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling", "fuel_services"],
    operates_at: ["LHR", "LGW", "EDI", "LAX", "SYD", "AMS"],
    status: "active",
    data_source: "manual"
  },
  
  // Additional GHAs to expand the database
  {
    name: "Airport Terminal Services (ATS)",
    code: "ATS",
    abbreviation: "ATS",
    headquarters: "St. Louis",
    country: "US",
    country_name: "United States",
    founded: 1975,
    website: "https://www.atsstl.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "cargo_handling"],
    operates_at: ["STL", "DEN", "YYZ", "YVR", "PDX", "ABQ"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Baltic Ground Services",
    code: "BGS",
    abbreviation: "BGS",
    headquarters: "Vilnius",
    country: "LT",
    country_name: "Lithuania",
    founded: 2005,
    website: "https://www.bgs.aero",
    parent_company: "Avia Solutions Group",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "fuel_services"],
    operates_at: ["VNO", "WAW", "RIX", "KUN", "TLL"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Air General",
    code: "AIRG",
    abbreviation: "AG",
    headquarters: "Boston",
    country: "US",
    country_name: "United States",
    founded: 1961,
    website: "https://www.airgeneral.com",
    parent_company: null,
    service_types: ["cargo_handling", "passenger_services", "ramp_services"],
    operates_at: ["BOS", "JFK", "MCO", "IAD", "ORD"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Mallaghan GSE",
    code: "MLGH",
    abbreviation: "MLG",
    headquarters: "Dungannon",
    country: "GB",
    country_name: "United Kingdom",
    founded: 1990,
    website: "https://www.mallaghangse.com",
    parent_company: null,
    service_types: ["aircraft_services", "maintenance"],
    operates_at: ["LHR", "DUB", "BFS", "CDG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Aeroground Flughafendienste",
    code: "ARFG",
    abbreviation: "AFG",
    headquarters: "Frankfurt",
    country: "DE",
    country_name: "Germany",
    founded: 2001,
    website: "https://www.aeroground.de",
    parent_company: "Lufthansa Group",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["FRA", "MUC", "DUS", "HAM"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Goldair Handling",
    code: "GOLD",
    abbreviation: "GH",
    headquarters: "Athens",
    country: "GR",
    country_name: "Greece",
    founded: 1992,
    website: "https://www.goldair-handling.gr",
    parent_company: "Goldair Group",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["ATH", "SKG", "HER", "RHO", "CFU"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Servisair",
    code: "SERV",
    abbreviation: "SVA",
    headquarters: "Paris",
    country: "FR",
    country_name: "France",
    founded: 1951,
    website: "https://www.servisair.com",
    parent_company: "Swissport International",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["CDG", "ORY", "LYS", "NCE", "TLS"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Mitto Aero",
    code: "MITT",
    abbreviation: "MTO",
    headquarters: "Dubai",
    country: "AE",
    country_name: "United Arab Emirates",
    founded: 2010,
    website: "https://www.mittoaero.com",
    parent_company: null,
    service_types: ["ramp_services", "passenger_services", "cargo_handling"],
    operates_at: ["DXB", "AUH", "SHJ", "DOH"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Aviation Handling Services",
    code: "AVHS",
    abbreviation: "AHS",
    headquarters: "Madrid",
    country: "ES",
    country_name: "Spain",
    founded: 1995,
    website: "https://www.aviationhandling.es",
    parent_company: null,
    service_types: ["passenger_services", "baggage_handling", "ramp_services"],
    operates_at: ["MAD", "BCN", "AGP", "ALC", "IBZ"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "LAS Ground Handling",
    code: "LGHD",
    abbreviation: "LGH",
    headquarters: "Las Vegas",
    country: "US",
    country_name: "United States",
    founded: 2003,
    website: "https://www.lasgroundhandling.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["LAS", "LAX", "SFO", "PHX"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Jet Services",
    code: "JETS",
    abbreviation: "JTS",
    headquarters: "Singapore",
    country: "SG",
    country_name: "Singapore",
    founded: 1997,
    website: "https://www.jetservices.sg",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "aircraft_services"],
    operates_at: ["SIN", "KUL", "BKK", "CGK"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Tokyo Ground Services",
    code: "TGS",
    abbreviation: "TGS",
    headquarters: "Tokyo",
    country: "JP",
    country_name: "Japan",
    founded: 1985,
    website: "https://www.tgs.co.jp",
    parent_company: "Japan Airlines",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["NRT", "HND", "KIX", "CTS", "FUK"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "ASIG (Aircraft Service International Group)",
    code: "ASIG",
    abbreviation: "ASG",
    headquarters: "Orlando",
    country: "US",
    country_name: "United States",
    founded: 1947,
    website: "https://www.asig.com",
    parent_company: "Menzies Aviation",
    service_types: ["fuel_services", "ramp_services", "passenger_services"],
    operates_at: ["MCO", "ATL", "LAX", "SEA", "MIA"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Havaş",
    code: "HVTR",
    abbreviation: "HVS",
    headquarters: "Istanbul",
    country: "TR",
    country_name: "Turkey",
    founded: 1933,
    website: "https://www.havas.net",
    parent_company: "TAV Airports Holding",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["IST", "AYT", "ESB", "ADB", "SAW"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "ISS Ground Handling",
    code: "ISSG",
    abbreviation: "ISS",
    headquarters: "Copenhagen",
    country: "DK",
    country_name: "Denmark",
    founded: 1975,
    website: "https://www.iss-groundhandling.com",
    parent_company: "ISS A/S",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["CPH", "OSL", "ARN", "HEL"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Airport Handling SpA",
    code: "AHDL",
    abbreviation: "APH",
    headquarters: "Milan",
    country: "IT",
    country_name: "Italy",
    founded: 2014,
    website: "https://www.airporthandling.eu",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["MXP", "LIN"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "GlobeGround Berlin",
    code: "GGDE",
    abbreviation: "GGB",
    headquarters: "Berlin",
    country: "DE",
    country_name: "Germany",
    founded: 1997,
    website: "https://www.globeground-berlin.de",
    parent_company: "Aeroground",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["BER", "TXL", "SXF"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Avia Solutions",
    code: "AVIS",
    abbreviation: "AVS",
    headquarters: "Vilnius",
    country: "LT",
    country_name: "Lithuania",
    founded: 2005,
    website: "https://www.aviasg.com",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "maintenance"],
    operates_at: ["VNO", "RIX", "TLL", "WAW"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Skyserv Handling Services",
    code: "SKYS",
    abbreviation: "SKY",
    headquarters: "Athens",
    country: "GR",
    country_name: "Greece",
    founded: 2014,
    website: "https://www.skyserv.aero",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["ATH", "SKG", "RHO", "HER", "JMK", "KGS"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Groundforce Portugal",
    code: "GFPT",
    abbreviation: "GFP",
    headquarters: "Lisbon",
    country: "PT",
    country_name: "Portugal",
    founded: 2003,
    website: "https://www.groundforce.pt",
    parent_company: "SPdH - Serviços Portugueses de Handling, S.A.",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["LIS", "OPO", "FAO", "PDL", "FNC"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "ASA Handling",
    code: "ASAH",
    abbreviation: "ASA",
    headquarters: "Milan",
    country: "IT",
    country_name: "Italy",
    founded: 1992,
    website: "https://www.asahandling.it",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["MXP", "BGY", "VRN", "TRN"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Hong Kong Airport Services",
    code: "HKAS",
    abbreviation: "HAS",
    headquarters: "Hong Kong",
    country: "HK",
    country_name: "Hong Kong",
    founded: 1995,
    website: "https://www.has.com.hk",
    parent_company: "Cathay Pacific Airways",
    service_types: ["passenger_services", "ramp_services", "baggage_handling", "cargo_handling"],
    operates_at: ["HKG"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Fly Aviation Services",
    code: "FLYA",
    abbreviation: "FAS",
    headquarters: "Dubai",
    country: "AE",
    country_name: "United Arab Emirates",
    founded: 2009,
    website: "https://www.flyaviation.ae",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "aircraft_services"],
    operates_at: ["DXB", "SHJ", "AUH", "DWC"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Alliance Ground International",
    code: "AGI",
    abbreviation: "AGI",
    headquarters: "Miami",
    country: "US",
    country_name: "United States",
    founded: 1995,
    website: "https://www.allianceground.com",
    parent_company: null,
    service_types: ["cargo_handling", "ramp_services", "passenger_services"],
    operates_at: ["MIA", "JFK", "LAX", "ORD", "ATL", "DFW"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Mahan Air Ground Handling",
    code: "MAGH",
    abbreviation: "MGH",
    headquarters: "Tehran",
    country: "IR",
    country_name: "Iran",
    founded: 1992,
    website: "https://www.mahan.aero",
    parent_company: "Mahan Airlines",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["IKA", "THR", "MHD", "SYZ"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Irish Aviation Services",
    code: "IAIS",
    abbreviation: "IAS",
    headquarters: "Dublin",
    country: "IE",
    country_name: "Ireland",
    founded: 1998,
    website: "https://www.irishaviationservices.ie",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services"],
    operates_at: ["DUB", "SNN", "ORK", "KIR"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Hawaiian Airlines Ground Handling",
    code: "HAGH",
    abbreviation: "HAG",
    headquarters: "Honolulu",
    country: "US",
    country_name: "United States",
    founded: 1987,
    website: "https://www.hawaiianairlines.com",
    parent_company: "Hawaiian Airlines",
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["HNL", "OGG", "KOA", "LIH", "ITO"],
    status: "active",
    data_source: "manual"
  },
  {
    name: "Alyzia",
    code: "ALYZ",
    abbreviation: "ALY",
    headquarters: "Paris",
    country: "FR",
    country_name: "France",
    founded: 2001,
    website: "https://www.alyzia.fr",
    parent_company: null,
    service_types: ["passenger_services", "ramp_services", "baggage_handling"],
    operates_at: ["CDG", "ORY", "LYS", "NTE", "MRS"],
    status: "active",
    data_source: "manual"
  }
];

/**
 * Main import function
 */
async function importExtendedGHAs() {
  try {
    console.log('Starting import of extended GHA dataset...');
    console.log(`Preparing to import ${extendedGHAs.length} GHAs...`);
    
    // Import the GHAs
    const results = await GroundHandlingAgentService.bulkImport(extendedGHAs);
    
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
    console.error('Error importing extended GHA dataset:', error);
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
importExtendedGHAs(); 