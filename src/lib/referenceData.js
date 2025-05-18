/**
 * Reference Data Module
 * Handles loading and validating reference data for airlines, aircraft types, etc.
 */
const fs = require('fs');
const path = require('path');

// In-memory cache for reference data
let referenceCache = {
  airlines: [],
  aircraftTypes: [],
  terminals: [],
  lastLoaded: {}
};

/**
 * Load airline reference data
 * @param {string} filePath - Path to airline data file
 * @returns {Array} - Array of airline objects
 */
async function loadAirlineData(filePath) {
  try {
    // Check if we need to reload the data (file has changed)
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime.getTime();
    
    if (
      referenceCache.airlines.length > 0 && 
      referenceCache.lastLoaded.airlines && 
      referenceCache.lastLoaded.airlines === lastModified
    ) {
      return referenceCache.airlines;
    }
    
    // Load the data
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let airlines = [];
    
    try {
      airlines = JSON.parse(fileContent);
    } catch (e) {
      throw new Error(`Failed to parse airline data: ${e.message}`);
    }
    
    // Validate the data structure
    if (!Array.isArray(airlines)) {
      if (airlines.data && Array.isArray(airlines.data)) {
        airlines = airlines.data;
      } else {
        throw new Error('Airline data must be an array');
      }
    }
    
    // Update cache
    referenceCache.airlines = airlines;
    referenceCache.lastLoaded.airlines = lastModified;
    
    return airlines;
  } catch (error) {
    throw new Error(`Error loading airline data: ${error.message}`);
  }
}

/**
 * Load aircraft type reference data
 * @param {string} filePath - Path to aircraft type data file
 * @returns {Array} - Array of aircraft type objects
 */
async function loadAircraftData(filePath) {
  try {
    // Check if we need to reload the data (file has changed)
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime.getTime();
    
    if (
      referenceCache.aircraftTypes.length > 0 && 
      referenceCache.lastLoaded.aircraftTypes && 
      referenceCache.lastLoaded.aircraftTypes === lastModified
    ) {
      return referenceCache.aircraftTypes;
    }
    
    // Load the data
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let aircraftTypes = [];
    
    try {
      const parsedData = JSON.parse(fileContent);
      
      // Check if this is the enhanced format with metadata
      if (parsedData.aircraft && Array.isArray(parsedData.aircraft)) {
        // Enhanced format with metadata
        aircraftTypes = parsedData.aircraft;
        
        // Log metadata if available
        if (parsedData.version) {
          console.log(`Loading aircraft data version ${parsedData.version} (last updated: ${parsedData.lastUpdated || 'unknown'})`);
        }
      } else if (Array.isArray(parsedData)) {
        // Legacy format - direct array
        aircraftTypes = parsedData;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        // Legacy format with data property
        aircraftTypes = parsedData.data;
      } else {
        throw new Error('Aircraft type data must be an array or have an aircraft array property');
      }
    } catch (e) {
      throw new Error(`Failed to parse aircraft type data: ${e.message}`);
    }
    
    // Normalize aircraft types to ensure consistent field names
    aircraftTypes = aircraftTypes.map(normalizeAircraftType);
    
    // Update cache
    referenceCache.aircraftTypes = aircraftTypes;
    referenceCache.lastLoaded.aircraftTypes = lastModified;
    
    return aircraftTypes;
  } catch (error) {
    throw new Error(`Error loading aircraft type data: ${error.message}`);
  }
}

/**
 * Normalize aircraft type fields to ensure consistent access
 * @param {Object} aircraft - Aircraft type object
 * @returns {Object} - Normalized aircraft type object
 */
function normalizeAircraftType(aircraft) {
  const normalized = { ...aircraft };
  
  // Ensure both legacy and enhanced fields are available
  if (aircraft.iata && !aircraft.IATACode) {
    normalized.IATACode = aircraft.iata;
  } else if (aircraft.IATACode && !aircraft.iata) {
    normalized.iata = aircraft.IATACode;
  }
  
  if (aircraft.icao && !aircraft.ICAOCode) {
    normalized.ICAOCode = aircraft.icao;
  } else if (aircraft.ICAOCode && !aircraft.icao) {
    normalized.icao = aircraft.ICAOCode;
  }
  
  if (aircraft.model && !aircraft.AircraftType) {
    normalized.AircraftType = aircraft.model;
  } else if (aircraft.AircraftType && !aircraft.model) {
    normalized.model = aircraft.AircraftType;
  }
  
  if (aircraft.class && !aircraft.SizeCategory) {
    normalized.SizeCategory = aircraft.class;
  } else if (aircraft.SizeCategory && !aircraft.class) {
    normalized.class = aircraft.SizeCategory;
  }
  
  return normalized;
}

/**
 * Load terminal reference data
 * @param {string} filePath - Path to terminal data file
 * @returns {Array} - Array of terminal objects
 */
async function loadTerminalData(filePath) {
  try {
    // Check if we need to reload the data (file has changed)
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime.getTime();
    
    if (
      referenceCache.terminals.length > 0 && 
      referenceCache.lastLoaded.terminals && 
      referenceCache.lastLoaded.terminals === lastModified
    ) {
      return referenceCache.terminals;
    }
    
    // Load the data
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let terminals = [];
    
    try {
      terminals = JSON.parse(fileContent);
    } catch (e) {
      throw new Error(`Failed to parse terminal data: ${e.message}`);
    }
    
    // Validate the data structure
    if (!Array.isArray(terminals)) {
      if (terminals.data && Array.isArray(terminals.data)) {
        terminals = terminals.data;
      } else {
        throw new Error('Terminal data must be an array');
      }
    }
    
    // Update cache
    referenceCache.terminals = terminals;
    referenceCache.lastLoaded.terminals = lastModified;
    
    return terminals;
  } catch (error) {
    throw new Error(`Error loading terminal data: ${error.message}`);
  }
}

/**
 * Load all reference data from a directory
 * @param {string} dirPath - Path to reference data directory
 * @returns {Object} - Object containing all reference data
 */
async function loadAllReferenceData(dirPath) {
  const referenceData = {};
  
  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Reference data directory not found: ${dirPath}`);
    }
    
    // Try to load airlines data
    const airlinePath = path.join(dirPath, 'airlines.json');
    if (fs.existsSync(airlinePath)) {
      referenceData.airlines = await loadAirlineData(airlinePath);
      console.log(`Loaded ${referenceData.airlines.length} airlines`);
    }
    
    // Try multiple aircraft filenames (enhanced and legacy)
    const aircraftPaths = [
      path.join(dirPath, 'aircraftTypes.json'),
      path.join(dirPath, 'aircraft-types.json'),
      path.join(dirPath, 'aircraft_types.json')
    ];
    
    for (const aircraftPath of aircraftPaths) {
      if (fs.existsSync(aircraftPath)) {
        referenceData.aircraftTypes = await loadAircraftData(aircraftPath);
        console.log(`Loaded ${referenceData.aircraftTypes.length} aircraft types from ${path.basename(aircraftPath)}`);
        break;
      }
    }
    
    // Try to load terminals data
    const terminalPath = path.join(dirPath, 'terminals.json');
    if (fs.existsSync(terminalPath)) {
      referenceData.terminals = await loadTerminalData(terminalPath);
      console.log(`Loaded ${referenceData.terminals.length} terminals`);
    }
    
    return referenceData;
  } catch (error) {
    throw new Error(`Error loading reference data: ${error.message}`);
  }
}

/**
 * Validate a value against reference data
 * @param {string} dataType - Type of data (airline, aircraftType, terminal)
 * @param {string} value - Value to validate
 * @returns {boolean} - True if value is valid
 */
function validateAgainstReference(dataType, value) {
  switch (dataType) {
    case 'airline':
      return referenceCache.airlines.some(a => 
        a.AirlineCode === value || a.IATACode === value || a.ICAOCode === value
      );
      
    case 'aircraftType':
      return referenceCache.aircraftTypes.some(a => 
        a.iata === value || a.icao === value || 
        a.IATACode === value || a.ICAOCode === value || 
        a.AircraftType === value || a.model === value
      );
      
    case 'terminal':
      return referenceCache.terminals.some(t =>
        t.TerminalCode === value || t.Terminal === value
      );
      
    default:
      throw new Error(`Unknown reference data type: ${dataType}`);
  }
}

/**
 * Create sample reference data file
 * @param {string} type - Type of reference data (airlines, aircraftTypes, terminals)
 * @param {string} outputPath - Path to save the file
 * @param {boolean} useEnhancedFormat - Whether to use enhanced format with metadata
 * @returns {string} - Path to created file
 */
function createSampleReferenceData(type, outputPath, useEnhancedFormat = false) {
  let data;
  
  switch (type) {
    case 'airlines':
      data = [
        { AirlineCode: 'BA', IATACode: 'BA', ICAOCode: 'BAW', AirlineName: 'British Airways', BaseTerminal: 'T5' },
        { AirlineCode: 'LH', IATACode: 'LH', ICAOCode: 'DLH', AirlineName: 'Lufthansa', BaseTerminal: 'T2' },
        { AirlineCode: 'AF', IATACode: 'AF', ICAOCode: 'AFR', AirlineName: 'Air France', BaseTerminal: 'T4' },
        { AirlineCode: 'EK', IATACode: 'EK', ICAOCode: 'UAE', AirlineName: 'Emirates', BaseTerminal: 'T3' },
        { AirlineCode: 'AA', IATACode: 'AA', ICAOCode: 'AAL', AirlineName: 'American Airlines', BaseTerminal: 'T3' }
      ];
      break;
      
    case 'aircraftTypes':
      if (useEnhancedFormat) {
        data = {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          source: "Sample Data",
          aircraft: [
            { 
              iata: "B738", 
              icao: "B738", 
              model: "Boeing 737-800", 
              manufacturer: "Boeing",
              category: "narrow-body",
              class: "C", 
              wingspan: 35.8,
              length: 39.5,
              maxCapacity: 189,
              defaultTurnaround: 45,
              wideBodyFlag: false,
              notes: "Most common 737 variant"
            },
            { 
              iata: "A320", 
              icao: "A320", 
              model: "Airbus A320", 
              manufacturer: "Airbus",
              category: "narrow-body",
              class: "C", 
              wingspan: 35.8,
              length: 37.6,
              maxCapacity: 180,
              defaultTurnaround: 40,
              wideBodyFlag: false,
              notes: "Common short-haul aircraft"
            },
            { 
              iata: "B77W", 
              icao: "B77W", 
              model: "Boeing 777-300ER", 
              manufacturer: "Boeing",
              category: "wide-body",
              class: "E", 
              wingspan: 64.8,
              length: 73.9,
              maxCapacity: 550,
              defaultTurnaround: 90,
              wideBodyFlag: true,
              notes: "Long-haul wide-body aircraft"
            },
            { 
              iata: "A388", 
              icao: "A388", 
              model: "Airbus A380-800", 
              manufacturer: "Airbus",
              category: "wide-body",
              class: "F", 
              wingspan: 79.8,
              length: 72.7,
              maxCapacity: 853,
              defaultTurnaround: 120,
              wideBodyFlag: true,
              notes: "Largest passenger aircraft"
            },
            { 
              iata: "B789", 
              icao: "B789", 
              model: "Boeing 787-9", 
              manufacturer: "Boeing",
              category: "wide-body",
              class: "D", 
              wingspan: 60.1,
              length: 63.0,
              maxCapacity: 290,
              defaultTurnaround: 80,
              wideBodyFlag: true,
              notes: "Modern fuel-efficient long-haul aircraft"
            }
          ]
        };
      } else {
        data = [
          { IATACode: 'B738', ICAOCode: 'B738', AircraftType: 'Boeing 737-800', SizeCategory: 'C' },
          { IATACode: 'A320', ICAOCode: 'A320', AircraftType: 'Airbus A320', SizeCategory: 'C' },
          { IATACode: 'B77W', ICAOCode: 'B77W', AircraftType: 'Boeing 777-300ER', SizeCategory: 'E' },
          { IATACode: 'A388', ICAOCode: 'A388', AircraftType: 'Airbus A380-800', SizeCategory: 'F' },
          { IATACode: 'B789', ICAOCode: 'B789', AircraftType: 'Boeing 787-9', SizeCategory: 'D' }
        ];
      }
      break;
      
    case 'terminals':
      data = [
        { TerminalCode: 'T1', Terminal: 'Terminal 1' },
        { TerminalCode: 'T2', Terminal: 'Terminal 2' },
        { TerminalCode: 'T3', Terminal: 'Terminal 3' },
        { TerminalCode: 'T4', Terminal: 'Terminal 4' },
        { TerminalCode: 'T5', Terminal: 'Terminal 5' }
      ];
      break;
      
    default:
      throw new Error(`Unknown reference data type: ${type}`);
  }
  
  // Create directory if it doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  return outputPath;
}

/**
 * Clear the reference data cache
 */
function clearReferenceCache() {
  referenceCache = {
    airlines: [],
    aircraftTypes: [],
    terminals: [],
    lastLoaded: {}
  };
}

/**
 * Get all aircraft types matching a specific criteria
 * @param {Object} criteria - Criteria to match
 * @returns {Array} - Array of matching aircraft types
 */
function getAircraftByType(criteria = {}) {
  return referenceCache.aircraftTypes.filter(aircraft => {
    // Match by category
    if (criteria.category && 
        aircraft.category !== criteria.category && 
        aircraft.SizeCategory !== criteria.category) {
      return false;
    }
    
    // Match by wide body flag
    if (criteria.wideBodyFlag !== undefined && 
        aircraft.wideBodyFlag !== criteria.wideBodyFlag) {
      return false;
    }
    
    // Match by manufacturer
    if (criteria.manufacturer && 
        aircraft.manufacturer !== criteria.manufacturer) {
      return false;
    }
    
    // Match by size class
    if (criteria.class && 
        aircraft.class !== criteria.class && 
        aircraft.SizeCategory !== criteria.class) {
      return false;
    }
    
    return true;
  });
}

module.exports = {
  loadAirlineData,
  loadAircraftData,
  loadTerminalData,
  loadAllReferenceData,
  validateAgainstReference,
  createSampleReferenceData,
  clearReferenceCache,
  getAircraftByType
}; 